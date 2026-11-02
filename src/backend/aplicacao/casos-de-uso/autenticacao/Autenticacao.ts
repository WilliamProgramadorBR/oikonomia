import type {
  AlterarSenhaEntrada,
  CadastrarUsuarioEntrada,
  EntrarEntrada,
  EstadoAutenticacaoDTO,
  MensagemDTO,
  RedefinirSenhaEntrada,
  UsuarioDTO
} from '@compartilhado/dtos/autenticacao'
import { avaliarSenha, emailValido, normalizarEmail } from '@compartilhado/seguranca/senha'
import { Pessoa } from '../../../dominio/entidades/Pessoa'
import { Usuario } from '../../../dominio/entidades/Usuario'
import { ErroDominio } from '../../../dominio/erros/ErroDominio'
import type { IEnvioEmail } from '../../../dominio/portas/IEnvioEmail'
import type { IGeradorSegredos, IGuardaSessao, IHashSenha } from '../../../dominio/portas/ISeguranca'
import type {
  ICodigoRecuperacaoRepositorio,
  ISessaoRepositorio,
  IUsuarioRepositorio
} from '../../../dominio/repositorios/IAcessoRepositorios'
import type { IPessoaRepositorio } from '../../../dominio/repositorios/IPessoaRepositorio'
import type { SessaoAtual } from '../../servicos/SessaoAtual'

const MINUTO = 60_000
const HORA = 60 * MINUTO
const DURACAO_SESSAO = 12 * HORA
const DURACAO_SESSAO_LEMBRADA = 30 * 24 * HORA
const VALIDADE_CODIGO = 15 * MINUTO
const CODIGOS_POR_JANELA = 3 // pedidos de código a cada 15 minutos, por conta
const TENTATIVAS_POR_CODIGO = 5
const DIGITOS_CODIGO = 6

// Mesma mensagem para e-mail inexistente e senha errada: não revela quem tem conta.
const ERRO_CREDENCIAIS = 'E-mail ou senha incorretos.'
const ERRO_CODIGO = 'Código inválido ou expirado. Peça um novo código.'
const MENSAGEM_RECUPERACAO = `Se existir uma conta com esse e-mail, enviamos um código de ${DIGITOS_CODIGO} dígitos válido por 15 minutos.`

const CORES_PESSOA = ['#6366f1', '#0ea5e9', '#f97316', '#10b981', '#ec4899', '#8b5cf6', '#eab308', '#14b8a6']

export interface DependenciasAcesso {
  usuarios: IUsuarioRepositorio
  sessoes: ISessaoRepositorio
  codigos: ICodigoRecuperacaoRepositorio
  pessoas: IPessoaRepositorio
  hash: IHashSenha
  segredos: IGeradorSegredos
  guarda: IGuardaSessao
  email: IEnvioEmail
  sessao: SessaoAtual
  agora?: () => Date
}

export const paraUsuarioDTO = (u: Usuario): UsuarioDTO => ({ id: u.id, nome: u.nome, email: u.email, pessoaId: u.pessoaId })

function validarSenha(senha: string, contexto: { nome?: string; email?: string }): void {
  const avaliacao = avaliarSenha(senha, contexto)
  if (!avaliacao.valida) throw new ErroDominio(avaliacao.problemas[0] ?? 'Senha inválida.')
}

function mensagemBloqueio(usuario: Usuario, agora: Date): string {
  const minutos = usuario.minutosDeBloqueio(agora)
  const tempo = minutos >= 60 ? `${Math.ceil(minutos / 60)} hora(s)` : `${minutos} minuto(s)`
  return `Muitas tentativas com senha errada. Por segurança, o acesso a esta conta está pausado por ${tempo}. Você também pode redefinir a senha.`
}

// Base comum: relógio e abertura de sessão.
abstract class CasoDeUsoAcesso {
  constructor(protected readonly d: DependenciasAcesso) {}

  protected agora(): Date {
    return this.d.agora?.() ?? new Date()
  }

  protected async iniciarSessao(usuario: Usuario, manterConectado: boolean): Promise<void> {
    const agora = this.agora()
    const token = this.d.segredos.token()
    const sessaoId = crypto.randomUUID()
    const lembrar = manterConectado && this.d.guarda.disponivel()
    await this.d.sessoes.salvar({
      id: sessaoId,
      usuarioId: usuario.id,
      tokenResumo: this.d.segredos.resumo(token),
      expiraEm: new Date(agora.getTime() + (lembrar ? DURACAO_SESSAO_LEMBRADA : DURACAO_SESSAO)),
      criadoEm: agora
    })
    this.d.sessao.definir(usuario.id, sessaoId)
    if (lembrar) this.d.guarda.guardar(token)
    else this.d.guarda.limpar()
  }
}

export class ObterEstadoAutenticacao extends CasoDeUsoAcesso {
  async executar(): Promise<EstadoAutenticacaoDTO> {
    if (!this.d.sessao.autenticado) await this.restaurarSessaoLembrada()

    const usuarioId = this.d.sessao.usuarioId
    const usuario = usuarioId ? await this.d.usuarios.buscarPorId(usuarioId) : null
    if (usuarioId && !usuario) this.d.sessao.limpar()

    const usuarios = await this.d.usuarios.listar()
    const comConta = new Set(usuarios.map((u) => u.pessoaId))
    const pessoas = await this.d.pessoas.listar()
    return {
      temUsuarios: usuarios.length > 0,
      usuario: usuario ? paraUsuarioDTO(usuario) : null,
      lembrarDisponivel: this.d.guarda.disponivel(),
      pessoasSemConta: pessoas.filter((p) => !comConta.has(p.id)).map((p) => ({ id: p.id, nome: p.nome, cor: p.cor }))
    }
  }

  private async restaurarSessaoLembrada(): Promise<void> {
    const token = this.d.guarda.ler()
    if (!token) return
    const sessao = await this.d.sessoes.buscarPorResumo(this.d.segredos.resumo(token))
    if (!sessao || sessao.expiraEm <= this.agora()) {
      if (sessao) await this.d.sessoes.remover(sessao.id)
      this.d.guarda.limpar()
      return
    }
    this.d.sessao.definir(sessao.usuarioId, sessao.id)
  }
}

export class CadastrarUsuario extends CasoDeUsoAcesso {
  async executar(e: CadastrarUsuarioEntrada): Promise<UsuarioDTO> {
    const total = await this.d.usuarios.contar()
    // Sem isso, qualquer pessoa no computador criaria uma conta e veria os dados da família.
    if (total > 0 && !this.d.sessao.autenticado) {
      throw new ErroDominio('Para criar outra conta, entre primeiro com uma conta existente.')
    }

    const nome = e.nome.trim()
    const email = normalizarEmail(e.email)
    if (!nome) throw new ErroDominio('Informe seu nome.')
    if (!emailValido(email)) throw new ErroDominio('Informe um e-mail válido.')
    validarSenha(e.senha, { nome, email })
    if (await this.d.usuarios.buscarPorEmail(email)) throw new ErroDominio('Já existe uma conta com esse e-mail.')

    let pessoaId = e.pessoaId
    if (pessoaId) {
      if (!(await this.d.pessoas.buscarPorId(pessoaId))) throw new ErroDominio('Membro da família não encontrado.')
      const jaLigado = (await this.d.usuarios.listar()).some((u) => u.pessoaId === pessoaId)
      if (jaLigado) throw new ErroDominio('Esse membro da família já tem uma conta.')
    }

    const senhaHash = await this.d.hash.gerar(e.senha)
    if (!pessoaId) {
      const usadas = new Set((await this.d.pessoas.listar()).map((p) => p.cor))
      const pessoa = Pessoa.criar({ nome, cor: CORES_PESSOA.find((c) => !usadas.has(c)) ?? CORES_PESSOA[0] })
      await this.d.pessoas.salvar(pessoa)
      pessoaId = pessoa.id
    }

    const usuario = Usuario.criar({ nome, email, senhaHash, pessoaId }, this.agora())
    await this.d.usuarios.salvar(usuario)
    // A primeira conta já entra; contas criadas por quem está conectado não trocam a sessão.
    if (!this.d.sessao.autenticado) await this.iniciarSessao(usuario, e.manterConectado)
    return paraUsuarioDTO(usuario)
  }
}

export class Entrar extends CasoDeUsoAcesso {
  private hashFalso: Promise<string> | null = null

  async executar(e: EntrarEntrada): Promise<UsuarioDTO> {
    const agora = this.agora()
    const usuario = await this.d.usuarios.buscarPorEmail(normalizarEmail(e.email))
    if (!usuario) {
      // Gasta o mesmo tempo de uma verificação real: o tempo de resposta não revela se o e-mail existe.
      this.hashFalso ??= this.d.hash.gerar(this.d.segredos.token())
      await this.d.hash.verificar(e.senha, await this.hashFalso)
      throw new ErroDominio(ERRO_CREDENCIAIS)
    }
    if (usuario.estaBloqueado(agora)) throw new ErroDominio(mensagemBloqueio(usuario, agora))

    if (!(await this.d.hash.verificar(e.senha, usuario.senhaHash))) {
      usuario.registrarFalha(agora)
      await this.d.usuarios.salvar(usuario)
      throw new ErroDominio(usuario.estaBloqueado(agora) ? mensagemBloqueio(usuario, agora) : ERRO_CREDENCIAIS)
    }

    usuario.registrarAcesso(agora)
    await this.d.usuarios.salvar(usuario)
    await this.d.sessoes.removerExpiradas(agora)
    await this.iniciarSessao(usuario, e.manterConectado)
    return paraUsuarioDTO(usuario)
  }
}

export class Sair extends CasoDeUsoAcesso {
  async executar(): Promise<void> {
    const sessaoId = this.d.sessao.sessaoId
    if (sessaoId) await this.d.sessoes.remover(sessaoId)
    this.d.sessao.limpar()
    this.d.guarda.limpar()
  }
}

export class SolicitarRecuperacaoSenha extends CasoDeUsoAcesso {
  async executar(emailInformado: string): Promise<MensagemDTO> {
    const agora = this.agora()
    const email = normalizarEmail(emailInformado)
    if (!emailValido(email)) throw new ErroDominio('Informe um e-mail válido.')

    const usuario = await this.d.usuarios.buscarPorEmail(email)
    if (!usuario) return { mensagem: MENSAGEM_RECUPERACAO }
    // Limite silencioso: evita usar o app para bombardear a caixa de alguém.
    const recentes = await this.d.codigos.contarDesde(usuario.id, new Date(agora.getTime() - VALIDADE_CODIGO))
    if (recentes >= CODIGOS_POR_JANELA) return { mensagem: MENSAGEM_RECUPERACAO }

    await this.d.codigos.invalidarDoUsuario(usuario.id, agora)
    const codigo = this.d.segredos.codigoNumerico(DIGITOS_CODIGO)
    await this.d.codigos.salvar({
      id: crypto.randomUUID(),
      usuarioId: usuario.id,
      codigoResumo: this.d.segredos.resumo(`${usuario.id}:${codigo}`),
      tentativas: 0,
      expiraEm: new Date(agora.getTime() + VALIDADE_CODIGO),
      usadoEm: null,
      criadoEm: agora
    })

    try {
      await this.d.email.enviar({
        para: usuario.email,
        assunto: `${codigo} é o seu código do Projeto Financeiro`,
        texto: `Olá, ${usuario.nome}!\n\nSeu código para redefinir a senha é: ${codigo}\n\nEle vale por 15 minutos. Se não foi você que pediu, ignore este e-mail: sua senha continua a mesma.`
      })
    } catch (erro) {
      console.error('[recuperação] falha ao enviar e-mail:', erro)
      throw new ErroDominio('Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.')
    }
    return { mensagem: MENSAGEM_RECUPERACAO }
  }
}

export class RedefinirSenha extends CasoDeUsoAcesso {
  async executar(e: RedefinirSenhaEntrada): Promise<MensagemDTO> {
    const agora = this.agora()
    const usuario = await this.d.usuarios.buscarPorEmail(normalizarEmail(e.email))
    const codigo = usuario ? await this.d.codigos.buscarAtivo(usuario.id, agora) : null
    if (!usuario || !codigo) throw new ErroDominio(ERRO_CODIGO)

    const informado = e.codigo.replace(/\D/g, '')
    const confere = this.d.segredos.iguais(this.d.segredos.resumo(`${usuario.id}:${informado}`), codigo.codigoResumo)
    if (!confere) {
      const tentativas = codigo.tentativas + 1
      const esgotou = tentativas >= TENTATIVAS_POR_CODIGO
      await this.d.codigos.salvar({ ...codigo, tentativas, usadoEm: esgotou ? agora : null })
      throw new ErroDominio(esgotou ? 'Muitas tentativas com código errado. Peça um novo código.' : 'Código incorreto.')
    }

    validarSenha(e.novaSenha, { nome: usuario.nome, email: usuario.email })
    await this.d.codigos.salvar({ ...codigo, usadoEm: agora })
    usuario.alterarSenha(await this.d.hash.gerar(e.novaSenha), agora)
    await this.d.usuarios.salvar(usuario)
    // Senha nova derruba todas as sessões abertas dessa conta.
    await this.d.sessoes.removerDoUsuario(usuario.id)
    if (this.d.sessao.usuarioId === usuario.id) this.d.sessao.limpar()
    return { mensagem: 'Senha redefinida. Entre com a nova senha.' }
  }
}

export class AlterarSenha extends CasoDeUsoAcesso {
  async executar(e: AlterarSenhaEntrada): Promise<MensagemDTO> {
    const agora = this.agora()
    const usuario = this.d.sessao.usuarioId ? await this.d.usuarios.buscarPorId(this.d.sessao.usuarioId) : null
    if (!usuario) throw new ErroDominio('Entre novamente para alterar a senha.')
    if (usuario.estaBloqueado(agora)) throw new ErroDominio(mensagemBloqueio(usuario, agora))

    if (!(await this.d.hash.verificar(e.senhaAtual, usuario.senhaHash))) {
      usuario.registrarFalha(agora)
      await this.d.usuarios.salvar(usuario)
      throw new ErroDominio('Senha atual incorreta.')
    }
    if (e.senhaAtual === e.novaSenha) throw new ErroDominio('A nova senha precisa ser diferente da atual.')
    validarSenha(e.novaSenha, { nome: usuario.nome, email: usuario.email })

    usuario.alterarSenha(await this.d.hash.gerar(e.novaSenha), agora)
    await this.d.usuarios.salvar(usuario)
    // Encerra as outras sessões e reabre a atual, mantendo o "manter conectado" como estava.
    const lembrava = this.d.guarda.ler() !== null
    await this.d.sessoes.removerDoUsuario(usuario.id)
    await this.iniciarSessao(usuario, lembrava)
    return { mensagem: 'Senha alterada. As outras sessões foram encerradas.' }
  }
}

export class ListarUsuarios extends CasoDeUsoAcesso {
  async executar(): Promise<UsuarioDTO[]> {
    return (await this.d.usuarios.listar()).map(paraUsuarioDTO)
  }
}

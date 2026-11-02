import { emailValido, normalizarEmail } from '@compartilhado/seguranca/senha'
import { ErroDominio } from '../erros/ErroDominio'

export interface PropsUsuario {
  id: string
  nome: string
  email: string // sempre normalizado (minúsculas, sem espaços)
  senhaHash: string // nunca a senha: só o hash gerado pela porta IHashSenha
  pessoaId: string | null
  tentativasFalhas: number
  bloqueadoAte: Date | null
  senhaAlteradaEm: Date
  ultimoAcessoEm: Date | null
  criadoEm: Date
}

export type DadosUsuario = Pick<PropsUsuario, 'nome' | 'email' | 'senhaHash' | 'pessoaId'>

// A cada 5 senhas erradas seguidas a conta fica bloqueada, e o tempo dobra a cada rodada
// (15 min, 30 min, 1 h...), até no máximo 24 h. Senha certa zera o contador.
export const TENTATIVAS_POR_BLOQUEIO = 5
const BLOQUEIO_INICIAL_MIN = 15
const BLOQUEIO_MAXIMO_MIN = 24 * 60

// Quem acessa o app. Os dados financeiros são da casa; a conta só identifica quem entrou.
export class Usuario {
  private constructor(private props: PropsUsuario) {}

  static criar(dados: DadosUsuario, agora = new Date()): Usuario {
    return new Usuario({
      ...Usuario.validar(dados),
      id: crypto.randomUUID(),
      tentativasFalhas: 0,
      bloqueadoAte: null,
      senhaAlteradaEm: agora,
      ultimoAcessoEm: null,
      criadoEm: agora
    })
  }

  static restaurar(props: PropsUsuario): Usuario {
    return new Usuario(props)
  }

  private static validar(dados: DadosUsuario): DadosUsuario {
    const nome = dados.nome.trim()
    if (!nome) throw new ErroDominio('Informe seu nome.')
    if (nome.length > 40) throw new ErroDominio('O nome deve ter no máximo 40 caracteres.')
    if (!emailValido(dados.email)) throw new ErroDominio('Informe um e-mail válido.')
    if (!dados.senhaHash) throw new ErroDominio('Senha inválida.')
    return { ...dados, nome, email: normalizarEmail(dados.email) }
  }

  estaBloqueado(agora = new Date()): boolean {
    return this.props.bloqueadoAte !== null && this.props.bloqueadoAte > agora
  }

  minutosDeBloqueio(agora = new Date()): number {
    if (!this.estaBloqueado(agora)) return 0
    return Math.ceil((this.props.bloqueadoAte!.getTime() - agora.getTime()) / 60_000)
  }

  registrarFalha(agora = new Date()): void {
    const tentativas = this.props.tentativasFalhas + 1
    let bloqueadoAte = this.props.bloqueadoAte
    if (tentativas % TENTATIVAS_POR_BLOQUEIO === 0) {
      const rodada = tentativas / TENTATIVAS_POR_BLOQUEIO
      const minutos = Math.min(BLOQUEIO_INICIAL_MIN * 2 ** (rodada - 1), BLOQUEIO_MAXIMO_MIN)
      bloqueadoAte = new Date(agora.getTime() + minutos * 60_000)
    }
    this.props = { ...this.props, tentativasFalhas: tentativas, bloqueadoAte }
  }

  registrarAcesso(agora = new Date()): void {
    this.props = { ...this.props, tentativasFalhas: 0, bloqueadoAte: null, ultimoAcessoEm: agora }
  }

  alterarSenha(senhaHash: string, agora = new Date()): void {
    this.props = { ...this.props, senhaHash, senhaAlteradaEm: agora, tentativasFalhas: 0, bloqueadoAte: null }
  }

  get id(): string {
    return this.props.id
  }
  get nome(): string {
    return this.props.nome
  }
  get email(): string {
    return this.props.email
  }
  get senhaHash(): string {
    return this.props.senhaHash
  }
  get pessoaId(): string | null {
    return this.props.pessoaId
  }
  get tentativasFalhas(): number {
    return this.props.tentativasFalhas
  }
  get bloqueadoAte(): Date | null {
    return this.props.bloqueadoAte
  }
  get senhaAlteradaEm(): Date {
    return this.props.senhaAlteradaEm
  }
  get ultimoAcessoEm(): Date | null {
    return this.props.ultimoAcessoEm
  }
  get criadoEm(): Date {
    return this.props.criadoEm
  }
}

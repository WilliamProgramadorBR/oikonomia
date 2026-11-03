import { VERSAO_TERMO_OPEN_FINANCE } from '@compartilhado/constantes/termoOpenFinance'
import type { PreviaImportacaoDTO } from '@compartilhado/dtos/conta'
import type {
  ConectarBancoEntrada,
  CredenciaisOpenFinanceEntrada,
  DesativarOpenFinanceEntrada,
  EstadoOpenFinanceDTO,
  VincularContaRemotaEntrada
} from '@compartilhado/dtos/openFinance'
import { hojeISO } from '@compartilhado/utilitarios/mes'
import { ContaBancaria } from '../../../dominio/entidades/ContaBancaria'
import { ErroDominio, ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { CredenciaisAgregador, IAgregadorOpenFinance, IJanelaConexaoBancaria } from '../../../dominio/portas/IOpenFinance'
import type { IContaRepositorio } from '../../../dominio/repositorios/IContaRepositorio'
import type { IConfiguracaoOpenFinance, IOpenFinanceRepositorio } from '../../../dominio/repositorios/IOpenFinanceRepositorio'
import type { IPessoaRepositorio } from '../../../dominio/repositorios/IPessoaRepositorio'
import type { SessaoAtual } from '../../servicos/SessaoAtual'
import type { PreparadorPrevia } from '../conta/Contas'

const DIA = 24 * 60 * 60 * 1000
const somarDias = (iso: string, dias: number) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + dias * DIA).toISOString().slice(0, 10)
const DIAS_PRIMEIRA_SINCRONIZACAO = 90
const DIAS_SOBREPOSICAO = 5 // relê alguns dias para pegar lançamentos que o banco publica com atraso

export interface DependenciasOpenFinance {
  agregador: IAgregadorOpenFinance
  configuracao: IConfiguracaoOpenFinance
  repositorio: IOpenFinanceRepositorio
  contas: IContaRepositorio
  pessoas: IPessoaRepositorio
  preparador: PreparadorPrevia
  sessao: SessaoAtual
  janela: IJanelaConexaoBancaria
}

abstract class CasoOpenFinance {
  constructor(protected readonly d: DependenciasOpenFinance) {}

  // Nenhuma chamada à Pluggy sem o termo aceito (na versão atual) e sem credenciais.
  protected credenciaisLiberadas(): CredenciaisAgregador {
    if (this.d.configuracao.aceite()?.versao !== VERSAO_TERMO_OPEN_FINANCE) {
      throw new ErroDominio('Leia e aceite o termo de ciência do Open Finance antes de continuar.')
    }
    const credenciais = this.d.configuracao.credenciais()
    if (!credenciais) throw new ErroDominio('Cadastre as credenciais da sua conta na Pluggy primeiro.')
    return credenciais
  }

  // Busca a situação e as contas da conexão e guarda localmente (sem tocar nos vínculos já feitos).
  protected async registrarItem(itemId: string): Promise<void> {
    const credenciais = this.credenciaisLiberadas()
    const [item, contasRemotas, salvas] = await Promise.all([
      this.d.agregador.obterItem(credenciais, itemId),
      this.d.agregador.listarContas(credenciais, itemId),
      this.d.repositorio.listarContasRemotas()
    ])
    const conexaoAnterior = (await this.d.repositorio.listarConexoes()).find((c) => c.id === itemId)
    await this.d.repositorio.salvarConexao({ ...item, conectadoEm: conexaoAnterior?.conectadoEm ?? new Date() })
    for (const conta of contasRemotas) {
      const anterior = salvas.find((s) => s.id === conta.id)
      await this.d.repositorio.salvarContaRemota({
        ...conta,
        contaId: anterior?.contaId ?? null,
        ultimaSincronizacao: anterior?.ultimaSincronizacao ?? null
      })
    }
  }
}

export class ObterEstadoOpenFinance extends CasoOpenFinance {
  async executar(): Promise<EstadoOpenFinanceDTO> {
    const aceite = this.d.configuracao.aceite()
    const [conexoes, contas] = await Promise.all([this.d.repositorio.listarConexoes(), this.d.repositorio.listarContasRemotas()])
    return {
      termo: {
        versaoAtual: VERSAO_TERMO_OPEN_FINANCE,
        versaoAceita: aceite?.versao ?? null,
        aceitoEm: aceite?.aceitoEm.toISOString() ?? null,
        precisaAceitar: aceite?.versao !== VERSAO_TERMO_OPEN_FINANCE
      },
      credenciaisConfiguradas: this.d.configuracao.credenciais() !== null,
      criptografiaDisponivel: this.d.configuracao.criptografiaDisponivel(),
      conexoes: conexoes.map((c) => ({
        itemId: c.id,
        instituicao: c.instituicao,
        cor: c.cor,
        situacao: c.situacao,
        mensagem: c.mensagem,
        conectadoEm: c.conectadoEm.toISOString(),
        contas: contas
          .filter((r) => r.itemId === c.id)
          .map((r) => ({
            id: r.id,
            itemId: r.itemId,
            nome: r.nome,
            tipo: r.tipo,
            finalNumero: r.finalNumero,
            saldoCentavos: r.saldoCentavos,
            contaId: r.contaId,
            ultimaSincronizacao: r.ultimaSincronizacao
          }))
      }))
    }
  }
}

export class AceitarTermoOpenFinance extends CasoOpenFinance {
  async executar(versao: string): Promise<void> {
    if (versao !== VERSAO_TERMO_OPEN_FINANCE) throw new ErroDominio('O termo foi atualizado. Leia a versão nova antes de aceitar.')
    this.d.configuracao.registrarAceite({ versao, aceitoEm: new Date(), usuarioId: this.d.sessao.usuarioId })
  }
}

export class SalvarCredenciaisOpenFinance extends CasoOpenFinance {
  async executar({ clientId, clientSecret }: CredenciaisOpenFinanceEntrada): Promise<void> {
    if (this.d.configuracao.aceite()?.versao !== VERSAO_TERMO_OPEN_FINANCE) {
      throw new ErroDominio('Leia e aceite o termo de ciência antes de cadastrar as credenciais.')
    }
    const credenciais = { clientId: clientId.trim(), clientSecret: clientSecret.trim() }
    if (!credenciais.clientId || !credenciais.clientSecret) throw new ErroDominio('Informe o Client ID e o Client Secret.')
    await this.d.agregador.testarCredenciais(credenciais) // só guarda se a Pluggy aceitar
    this.d.configuracao.salvarCredenciais(credenciais)
  }
}

// Abre a janela isolada da Pluggy; ao concluir, guarda a conexão e as contas dela.
export class ConectarBanco extends CasoOpenFinance {
  async executar({ itemId: itemIdParaAtualizar, incluirSandbox = false }: ConectarBancoEntrada = {}): Promise<boolean> {
    const credenciais = this.credenciaisLiberadas()
    const token = await this.d.agregador.criarTokenConexao(credenciais, itemIdParaAtualizar)
    const itemId = await this.d.janela.abrir(token, { itemId: itemIdParaAtualizar, incluirSandbox })
    if (!itemId) return false
    await this.registrarItem(itemId)
    return true
  }
}

export class AtualizarConexao extends CasoOpenFinance {
  async executar(itemId: string): Promise<void> {
    await this.registrarItem(itemId)
  }
}

// Substitui os webhooks da Pluggy (que exigiriam um servidor público): consulta a situação de cada
// conexão (atualizada, precisa autorizar, erro) e o saldo das contas, no máximo a cada 30 minutos.
const INTERVALO_VERIFICACAO = 30 * 60 * 1000
export class VerificarConexoes extends CasoOpenFinance {
  private ultimaVerificacao = 0

  async executar(forcar = false): Promise<void> {
    if (this.d.configuracao.aceite()?.versao !== VERSAO_TERMO_OPEN_FINANCE || !this.d.configuracao.credenciais()) return
    if (!forcar && Date.now() - this.ultimaVerificacao < INTERVALO_VERIFICACAO) return
    this.ultimaVerificacao = Date.now()
    for (const conexao of await this.d.repositorio.listarConexoes()) {
      try {
        await this.registrarItem(conexao.id)
      } catch (erro) {
        await this.d.repositorio.salvarConexao({ ...conexao, situacao: 'erro', mensagem: (erro as Error).message })
      }
    }
  }
}

export class VincularContaRemota extends CasoOpenFinance {
  async executar({ contaRemotaId, destino }: VincularContaRemotaEntrada): Promise<void> {
    const remota = await this.d.repositorio.buscarContaRemota(contaRemotaId)
    if (!remota) throw new ErroNaoEncontrado('Conta conectada', contaRemotaId)
    if (remota.tipo === 'cartao' && destino) {
      throw new ErroDominio('Cartões de crédito ainda não são importados pelo Open Finance: as compras continuam nos Cartões.')
    }

    let contaId: string | null = null
    if (destino && 'contaId' in destino) {
      if (!(await this.d.contas.buscarPorId(destino.contaId))) throw new ErroNaoEncontrado('Conta', destino.contaId)
      const jaLigada = await this.d.repositorio.buscarPorContaLocal(destino.contaId)
      if (jaLigada && jaLigada.id !== remota.id) throw new ErroDominio('Essa conta já está ligada a outra conta conectada.')
      contaId = destino.contaId
    } else if (destino && 'nova' in destino) {
      if (destino.nova.pessoaId && !(await this.d.pessoas.buscarPorId(destino.nova.pessoaId))) {
        throw new ErroNaoEncontrado('Pessoa', destino.nova.pessoaId)
      }
      const conexao = (await this.d.repositorio.listarConexoes()).find((c) => c.id === remota.itemId)
      const conta = ContaBancaria.criar({
        nome: destino.nova.nome.trim() || remota.nome,
        tipo: remota.tipo === 'poupanca' ? 'poupanca' : 'corrente',
        instituicao: conexao?.instituicao ?? '',
        cnpj8: null,
        pessoaId: destino.nova.pessoaId
      })
      await this.d.contas.salvar(conta)
      // O saldo informado pelo banco hoje vira a referência da conta nova.
      await this.d.contas.registrarSaldo({ id: crypto.randomUUID(), contaId: conta.id, data: hojeISO(), saldoCentavos: remota.saldoCentavos, origem: 'extrato', criadoEm: new Date() })
      contaId = conta.id
    }
    await this.d.repositorio.salvarContaRemota({ ...remota, contaId, ultimaSincronizacao: contaId === remota.contaId ? remota.ultimaSincronizacao : null })
  }
}

// Busca as transações novas da conta conectada e monta a mesma prévia da importação de extrato.
export class SincronizarContaOpenFinance extends CasoOpenFinance {
  async executar(contaId: string): Promise<PreviaImportacaoDTO> {
    const credenciais = this.credenciaisLiberadas()
    const remota = await this.d.repositorio.buscarPorContaLocal(contaId)
    if (!remota) throw new ErroDominio('Esta conta não está ligada a uma conta conectada pelo Open Finance.')
    const conta = (await this.d.contas.buscarPorId(contaId))!

    await this.registrarItem(remota.itemId) // saldo e situação atualizados
    const atualizada = (await this.d.repositorio.buscarContaRemota(remota.id))!
    const hoje = hojeISO()
    const de = atualizada.ultimaSincronizacao
      ? somarDias(atualizada.ultimaSincronizacao, -DIAS_SOBREPOSICAO)
      : somarDias(hoje, -DIAS_PRIMEIRA_SINCRONIZACAO)
    const transacoes = await this.d.agregador.listarTransacoes(credenciais, remota.id, de, hoje)

    return this.d.preparador.preparar(
      conta,
      transacoes.map((t) => ({ idOriginal: `pluggy-${t.id}`, data: t.data, valorCentavos: t.valorCentavos, descricao: t.descricao })),
      { valorCentavos: atualizada.saldoCentavos, data: hoje },
      'openfinance'
    )
  }
}

export class ConcluirSincronizacao extends CasoOpenFinance {
  async executar(contaId: string): Promise<void> {
    const remota = await this.d.repositorio.buscarPorContaLocal(contaId)
    if (remota) await this.d.repositorio.salvarContaRemota({ ...remota, ultimaSincronizacao: hojeISO() })
  }
}

// Desconecta: apaga a conexão na Pluggy (se possível) e os dados dela guardados no app.
// As contas locais e os lançamentos já importados continuam.
export class DesconectarBanco extends CasoOpenFinance {
  async executar(itemId: string): Promise<{ apagadoNaPluggy: boolean }> {
    const credenciais = this.d.configuracao.credenciais()
    let apagadoNaPluggy = false
    if (credenciais) {
      try {
        await this.d.agregador.apagarItem(credenciais, itemId)
        apagadoNaPluggy = true
      } catch (erro) {
        console.warn('[open finance] não foi possível apagar a conexão na Pluggy:', (erro as Error).message)
      }
    }
    await this.d.repositorio.removerConexao(itemId)
    return { apagadoNaPluggy }
  }
}

// Desliga tudo: desconecta todos os bancos, revoga o aceite e (opcionalmente) apaga as credenciais.
export class DesativarOpenFinance extends CasoOpenFinance {
  constructor(
    d: DependenciasOpenFinance,
    private readonly desconectar: DesconectarBanco
  ) {
    super(d)
  }

  async executar({ apagarCredenciais }: DesativarOpenFinanceEntrada): Promise<{ mensagem: string }> {
    const conexoes = await this.d.repositorio.listarConexoes()
    let falhas = 0
    for (const c of conexoes) if (!(await this.desconectar.executar(c.id)).apagadoNaPluggy) falhas++
    if (apagarCredenciais) this.d.configuracao.apagarCredenciais()
    this.d.configuracao.revogarAceite(new Date())
    return {
      mensagem:
        falhas > 0
          ? `Open Finance desativado no app. ${falhas} conexão(ões) não puderam ser apagadas na Pluggy agora: apague pelo painel da Pluggy ou cancele o consentimento no app do banco.`
          : 'Open Finance desativado. As conexões foram apagadas na Pluggy e o aceite do termo foi revogado.'
    }
  }
}

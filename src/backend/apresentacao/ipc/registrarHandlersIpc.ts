import { ipcMain } from 'electron'
import { CANAIS } from '@compartilhado/contratos/canais'
import { ERRO_NAO_AUTENTICADO, type Resposta } from '@compartilhado/contratos/resposta'
import type {
  AlterarSenhaEntrada,
  CadastrarUsuarioEntrada,
  EntrarEntrada,
  RedefinirSenhaEntrada
} from '@compartilhado/dtos/autenticacao'
import type {
  CriarCartaoEntrada,
  CriarCompraCartaoEntrada,
  FiltroResumoCartoes
} from '@compartilhado/dtos/cartao'
import type { CriarCategoriaEntrada } from '@compartilhado/dtos/categoria'
import type { FiltroPainel } from '@compartilhado/dtos/painel'
import type { AtualizarPessoaEntrada, CriarPessoaEntrada } from '@compartilhado/dtos/pessoa'
import type { ModalidadeCredito } from '@compartilhado/dtos/taxa'
import type { FiltroAnalise } from '@compartilhado/dtos/analise'
import type { MensagemChatDTO, SalvarConfiguracaoIAEntrada } from '@compartilhado/dtos/ia'
import type { AjustarPrevistaEntrada, AplicarFeriasEntrada, FeriasEntrada } from '@compartilhado/dtos/ajustes'
import type { PropostaLancamentoDTO } from '@compartilhado/dtos/lancamentosTexto'
import type { ConectarBancoEntrada, CredenciaisOpenFinanceEntrada, DesativarOpenFinanceEntrada, VincularContaRemotaEntrada } from '@compartilhado/dtos/openFinance'
import type { ConferirSaldoEntrada, CriarContaEntrada, ImportarExtratoEntrada, LerExtratoEntrada } from '@compartilhado/dtos/conta'
import type { ArquivoEntrada, ConfirmarContrachequeEntrada } from '@compartilhado/dtos/importacao'
import type { CriarDividaEntrada, SimularCreditoEntrada } from '@compartilhado/dtos/divida'
import type {
  AportarObjetivoEntrada,
  AtualizarObjetivoEntrada,
  CriarObjetivoEntrada,
  ProgramarAporteEntrada
} from '@compartilhado/dtos/objetivo'
import type { SalvarPerfilEntrada } from '@compartilhado/dtos/perfil'
import type { FiltroPrevisao } from '@compartilhado/dtos/previsao'
import type { OfertaApertoEntrada } from '@compartilhado/dtos/aperto'
import type {
  CriarRecorrenciaEntrada,
  DefinirContaRecorrenciaEntrada,
  EncerrarRecorrenciaEntrada
} from '@compartilhado/dtos/recorrencia'
import type {
  ConfirmarTransacaoEntrada,
  CriarTransacaoEntrada,
  FiltroTransacoes
} from '@compartilhado/dtos/transacao'
import { ErroDominio } from '../../dominio/erros/ErroDominio'
import type { SessaoAtual } from '../../aplicacao/servicos/SessaoAtual'
import type { Container } from '../../principal/container'

// Envolve cada handler no envelope Resposta<T>, convertendo exceções em { sucesso: false }.
// Todo canal é protegido por padrão: sem sessão, nada executa. Só o acesso é público.
// Ao fim de cada chamada o banco é gravado (cifrado) se algo mudou.
function criarTratador(sessao: SessaoAtual, aoConcluir: () => void) {
  return function tratar<A extends unknown[], T>(
    canal: string,
    executar: (...args: A) => Promise<T>,
    { publico = false } = {}
  ): void {
    ipcMain.handle(canal, async (_evento, ...args): Promise<Resposta<T>> => {
      if (!publico && !sessao.autenticado) return { sucesso: false, erro: ERRO_NAO_AUTENTICADO }
      try {
        return { sucesso: true, dados: await executar(...(args as A)) }
      } catch (erro) {
        if (erro instanceof ErroDominio) return { sucesso: false, erro: erro.message }
        console.error(`[IPC ${canal}]`, erro)
        return { sucesso: false, erro: 'Erro inesperado. Veja o log do aplicativo.' }
      } finally {
        aoConcluir()
      }
    })
  }
}

export function registrarHandlersIpc({
  sessao,
  armazenamento,
  situacaoSistema,
  autenticacaoControlador,
  pessoaControlador,
  categoriaControlador,
  transacaoControlador,
  painelControlador,
  cartaoControlador,
  taxaControlador,
  recorrenciaControlador,
  previsaoControlador,
  apertoControlador,
  saudeControlador,
  analiseControlador,
  objetivoControlador,
  perfilControlador,
  dividaControlador,
  iaControlador,
  ajustesControlador,
  contaControlador,
  openFinanceControlador,
  importacaoControlador
}: Container): void {
  const tratar = criarTratador(sessao, () => {
    try {
      armazenamento.persistir()
    } catch (erro) {
      console.error('[banco] falha ao gravar os dados:', erro)
    }
  })

  tratar(CANAIS.sistema.situacao, async () => situacaoSistema(), { publico: true })

  const publico = { publico: true }
  tratar(CANAIS.autenticacao.estado, () => autenticacaoControlador.estado(), publico)
  tratar(CANAIS.autenticacao.cadastrar, (entrada: CadastrarUsuarioEntrada) => autenticacaoControlador.cadastrar(entrada), publico)
  tratar(CANAIS.autenticacao.entrar, (entrada: EntrarEntrada) => autenticacaoControlador.entrar(entrada), publico)
  tratar(CANAIS.autenticacao.sair, () => autenticacaoControlador.sair(), publico)
  tratar(CANAIS.autenticacao.solicitarRecuperacao, (email: string) => autenticacaoControlador.solicitarRecuperacao(email), publico)
  tratar(CANAIS.autenticacao.redefinirSenha, (entrada: RedefinirSenhaEntrada) => autenticacaoControlador.redefinirSenha(entrada), publico)
  tratar(CANAIS.autenticacao.alterarSenha, (entrada: AlterarSenhaEntrada) => autenticacaoControlador.alterarSenha(entrada))
  tratar(CANAIS.autenticacao.listarUsuarios, () => autenticacaoControlador.listarUsuarios())

  tratar(CANAIS.pessoas.listar, () => pessoaControlador.listar())
  tratar(CANAIS.pessoas.criar, (entrada: CriarPessoaEntrada) => pessoaControlador.criar(entrada))
  tratar(CANAIS.pessoas.atualizar, (entrada: AtualizarPessoaEntrada) =>
    pessoaControlador.atualizar(entrada)
  )
  tratar(CANAIS.pessoas.remover, (id: string) => pessoaControlador.remover(id))

  tratar(CANAIS.categorias.listar, () => categoriaControlador.listar())
  tratar(CANAIS.categorias.criar, (entrada: CriarCategoriaEntrada) =>
    categoriaControlador.criar(entrada)
  )
  tratar(CANAIS.categorias.remover, (id: string) => categoriaControlador.remover(id))

  tratar(CANAIS.transacoes.listar, (filtro: FiltroTransacoes) =>
    transacaoControlador.listar(filtro)
  )
  tratar(CANAIS.transacoes.criar, (entrada: CriarTransacaoEntrada) =>
    transacaoControlador.criar(entrada)
  )
  tratar(CANAIS.transacoes.confirmar, (entrada: ConfirmarTransacaoEntrada) =>
    transacaoControlador.confirmar(entrada)
  )
  tratar(CANAIS.transacoes.remover, (id: string) => transacaoControlador.remover(id))

  tratar(CANAIS.recorrencias.listar, () => recorrenciaControlador.listar())
  tratar(CANAIS.recorrencias.criar, (entrada: CriarRecorrenciaEntrada) =>
    recorrenciaControlador.criar(entrada)
  )
  tratar(CANAIS.recorrencias.encerrar, (entrada: EncerrarRecorrenciaEntrada) =>
    recorrenciaControlador.encerrar(entrada)
  )
  tratar(CANAIS.recorrencias.definirConta, (entrada: DefinirContaRecorrenciaEntrada) =>
    recorrenciaControlador.definirConta(entrada)
  )

  tratar(CANAIS.previsao.obter, (filtro: FiltroPrevisao) => previsaoControlador.obter(filtro))
  tratar(CANAIS.aperto.obter, (pessoaId: string | null) => apertoControlador.obter(pessoaId))
  tratar(CANAIS.aperto.salvarOferta, (entrada: OfertaApertoEntrada) => apertoControlador.salvar(entrada))
  tratar(CANAIS.aperto.removerOferta, (id: string) => apertoControlador.remover(id))
  tratar(CANAIS.aperto.marcarPasso, (entrada: { chave: string; feito: boolean }) => apertoControlador.marcarPasso(entrada))
  tratar(CANAIS.aperto.definirCaixaExtra, (centavos: number) => apertoControlador.definirCaixaExtra(centavos))
  tratar(CANAIS.saude.obter, (pessoaId: string | null) => saudeControlador.obter(pessoaId))
  tratar(CANAIS.analise.obter, (filtro: FiltroAnalise) => analiseControlador.obter(filtro))

  tratar(CANAIS.objetivos.listar, () => objetivoControlador.listar())
  tratar(CANAIS.objetivos.criar, (entrada: CriarObjetivoEntrada) => objetivoControlador.criar(entrada))
  tratar(CANAIS.objetivos.atualizar, (entrada: AtualizarObjetivoEntrada) =>
    objetivoControlador.atualizar(entrada)
  )
  tratar(CANAIS.objetivos.remover, (id: string) => objetivoControlador.remover(id))
  tratar(CANAIS.objetivos.aportar, (entrada: AportarObjetivoEntrada) => objetivoControlador.aportar(entrada))
  tratar(CANAIS.objetivos.programarAporte, (entrada: ProgramarAporteEntrada) =>
    objetivoControlador.programarAporte(entrada)
  )

  tratar(CANAIS.dividas.plano, (extraMensal: number | null) => dividaControlador.plano(extraMensal))
  tratar(CANAIS.dividas.criar, (entrada: CriarDividaEntrada) => dividaControlador.criar(entrada))
  tratar(CANAIS.dividas.remover, (id: string) => dividaControlador.remover(id))
  tratar(CANAIS.dividas.simularCredito, (entrada: SimularCreditoEntrada) =>
    dividaControlador.simularCredito(entrada)
  )

  tratar(CANAIS.ia.obterConfiguracao, () => iaControlador.obterConfiguracao())
  tratar(CANAIS.ia.salvarConfiguracao, (entrada: SalvarConfiguracaoIAEntrada) => iaControlador.salvarConfiguracao(entrada))
  tratar(CANAIS.ia.testar, () => iaControlador.testar())
  tratar(CANAIS.ia.conversar, (mensagens: MensagemChatDTO[]) => iaControlador.conversar(mensagens))
  tratar(CANAIS.ia.interpretarLancamentos, (texto: string) => iaControlador.interpretarLancamentos(texto))
  tratar(CANAIS.ia.confirmarLancamentos, (propostas: PropostaLancamentoDTO[]) => iaControlador.confirmarLancamentos(propostas))
  tratar(CANAIS.contas.listar, () => contaControlador.listar())
  tratar(CANAIS.contas.criar, (entrada: CriarContaEntrada) => contaControlador.criar(entrada))
  tratar(CANAIS.contas.conferir, (entrada: ConferirSaldoEntrada) => contaControlador.conferir(entrada))
  tratar(CANAIS.contas.arquivar, (id: string) => contaControlador.arquivar(id))
  tratar(CANAIS.contas.lerExtrato, (entrada: LerExtratoEntrada) => contaControlador.lerExtrato(entrada))
  tratar(CANAIS.contas.importarExtrato, (entrada: ImportarExtratoEntrada) => contaControlador.importarExtrato(entrada))
  tratar(CANAIS.openFinance.estado, () => openFinanceControlador.estado())
  tratar(CANAIS.openFinance.aceitarTermo, (versao: string) => openFinanceControlador.aceitarTermo(versao))
  tratar(CANAIS.openFinance.salvarCredenciais, (entrada: CredenciaisOpenFinanceEntrada) => openFinanceControlador.salvarCredenciais(entrada))
  tratar(CANAIS.openFinance.conectar, (entrada?: ConectarBancoEntrada) => openFinanceControlador.conectar(entrada))
  tratar(CANAIS.openFinance.atualizar, (itemId: string) => openFinanceControlador.atualizar(itemId))
  tratar(CANAIS.openFinance.vincular, (entrada: VincularContaRemotaEntrada) => openFinanceControlador.vincular(entrada))
  tratar(CANAIS.openFinance.sincronizar, (contaId: string) => openFinanceControlador.sincronizar(contaId))
  tratar(CANAIS.openFinance.concluirSincronizacao, (contaId: string) => openFinanceControlador.concluirSincronizacao(contaId))
  tratar(CANAIS.openFinance.desconectar, (itemId: string) => openFinanceControlador.desconectar(itemId))
  tratar(CANAIS.openFinance.desativar, (entrada: DesativarOpenFinanceEntrada) => openFinanceControlador.desativar(entrada))
  tratar(CANAIS.openFinance.verificarConexoes, () => openFinanceControlador.verificarConexoes())
  tratar(CANAIS.openFinance.conexaoEmAndamento, (acao: 'cancelar' | 'reabrir') => openFinanceControlador.conexaoEmAndamento(acao))
  tratar(CANAIS.ajustes.ajustarPrevista, (entrada: AjustarPrevistaEntrada) => ajustesControlador.ajustarPrevista(entrada))
  tratar(CANAIS.ajustes.simularFerias, (entrada: FeriasEntrada) => ajustesControlador.simularFerias(entrada))
  tratar(CANAIS.ajustes.aplicarFerias, (entrada: AplicarFeriasEntrada) => ajustesControlador.aplicarFerias(entrada))

  tratar(CANAIS.importacao.lerContracheque, (arquivo: ArquivoEntrada) => importacaoControlador.lerContracheque(arquivo))
  tratar(CANAIS.importacao.confirmarContracheque, (entrada: ConfirmarContrachequeEntrada) =>
    importacaoControlador.confirmarContracheque(entrada)
  )
  tratar(CANAIS.importacao.lerNotaFiscal, (endereco: string) => importacaoControlador.lerNotaFiscal(endereco))

  tratar(CANAIS.perfil.obter, () => perfilControlador.obter())
  tratar(CANAIS.perfil.salvar, (entrada: SalvarPerfilEntrada) => perfilControlador.salvar(entrada))

  tratar(CANAIS.painel.obter, (filtro: FiltroPainel) => painelControlador.obter(filtro))

  tratar(CANAIS.cartoes.listar, () => cartaoControlador.listar())
  tratar(CANAIS.cartoes.criar, (entrada: CriarCartaoEntrada) => cartaoControlador.criar(entrada))
  tratar(CANAIS.cartoes.remover, (id: string) => cartaoControlador.remover(id))
  tratar(CANAIS.cartoes.resumo, (filtro: FiltroResumoCartoes) => cartaoControlador.resumo(filtro))
  tratar(CANAIS.cartoes.criarCompra, (entrada: CriarCompraCartaoEntrada) =>
    cartaoControlador.criarCompra(entrada)
  )
  tratar(CANAIS.cartoes.removerCompra, (id: string) => cartaoControlador.removerCompra(id))

  tratar(CANAIS.taxas.listar, (modalidade?: ModalidadeCredito) => taxaControlador.listar(modalidade))
  tratar(CANAIS.taxas.atualizar, () => taxaControlador.atualizar())
}

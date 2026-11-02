import type { AnaliseDTO, FiltroAnalise } from '../dtos/analise'
import type { SituacaoSistemaDTO } from '../dtos/sistema'
import type {
  AlterarSenhaEntrada,
  CadastrarUsuarioEntrada,
  EntrarEntrada,
  EstadoAutenticacaoDTO,
  MensagemDTO,
  RedefinirSenhaEntrada,
  UsuarioDTO
} from '../dtos/autenticacao'
import type {
  ConfiguracaoIADTO,
  MensagemChatDTO,
  RespostaAssistenteDTO,
  SalvarConfiguracaoIAEntrada,
  TesteIADTO
} from '../dtos/ia'
import type {
  ArquivoEntrada,
  ConfirmarContrachequeEntrada,
  ContrachequeLidoDTO,
  NotaFiscalLidaDTO,
  ResultadoContrachequeDTO
} from '../dtos/importacao'
import type {
  CriarDividaEntrada,
  PlanoDividasDTO,
  SimulacaoCreditoDTO,
  SimularCreditoEntrada
} from '../dtos/divida'
import type {
  CartaoDTO,
  CompraCartaoDTO,
  CriarCartaoEntrada,
  CriarCompraCartaoEntrada,
  FiltroResumoCartoes,
  ResumoCartaoDTO
} from '../dtos/cartao'
import type { CategoriaDTO, CriarCategoriaEntrada } from '../dtos/categoria'
import type { FiltroPainel, PainelDTO } from '../dtos/painel'
import type { AtualizarPessoaEntrada, CriarPessoaEntrada, PessoaDTO } from '../dtos/pessoa'
import type { ListaTaxasDTO, ModalidadeCredito, SituacaoTaxasDTO } from '../dtos/taxa'
import type {
  AportarObjetivoEntrada,
  AtualizarObjetivoEntrada,
  CriarObjetivoEntrada,
  ObjetivosDTO,
  ProgramarAporteEntrada
} from '../dtos/objetivo'
import type { PerfilDTO, SalvarPerfilEntrada } from '../dtos/perfil'
import type { FiltroPrevisao, PrevisaoDTO } from '../dtos/previsao'
import type { SaudeFinanceiraDTO } from '../dtos/saude'
import type {
  CriarRecorrenciaEntrada,
  EncerrarRecorrenciaEntrada,
  RecorrenciaDTO
} from '../dtos/recorrencia'
import type {
  ConfirmarTransacaoEntrada,
  CriarTransacaoEntrada,
  FiltroTransacoes,
  TransacaoDTO
} from '../dtos/transacao'
import type { Resposta } from './resposta'

// Contrato que o frontend consome. No desktop é implementado pelo preload (IPC);
// no mobile poderá ser implementado chamando os casos de uso diretamente.
export interface ApiFinanceiro {
  sistema: {
    situacao(): Promise<Resposta<SituacaoSistemaDTO>>
  }
  autenticacao: {
    estado(): Promise<Resposta<EstadoAutenticacaoDTO>>
    cadastrar(entrada: CadastrarUsuarioEntrada): Promise<Resposta<UsuarioDTO>>
    entrar(entrada: EntrarEntrada): Promise<Resposta<UsuarioDTO>>
    sair(): Promise<Resposta<void>>
    solicitarRecuperacao(email: string): Promise<Resposta<MensagemDTO>>
    redefinirSenha(entrada: RedefinirSenhaEntrada): Promise<Resposta<MensagemDTO>>
    alterarSenha(entrada: AlterarSenhaEntrada): Promise<Resposta<MensagemDTO>>
    listarUsuarios(): Promise<Resposta<UsuarioDTO[]>>
  }
  pessoas: {
    listar(): Promise<Resposta<PessoaDTO[]>>
    criar(entrada: CriarPessoaEntrada): Promise<Resposta<PessoaDTO>>
    atualizar(entrada: AtualizarPessoaEntrada): Promise<Resposta<PessoaDTO>>
    remover(id: string): Promise<Resposta<void>>
  }
  categorias: {
    listar(): Promise<Resposta<CategoriaDTO[]>>
    criar(entrada: CriarCategoriaEntrada): Promise<Resposta<CategoriaDTO>>
    remover(id: string): Promise<Resposta<void>>
  }
  transacoes: {
    listar(filtro: FiltroTransacoes): Promise<Resposta<TransacaoDTO[]>>
    criar(entrada: CriarTransacaoEntrada): Promise<Resposta<TransacaoDTO>>
    confirmar(entrada: ConfirmarTransacaoEntrada): Promise<Resposta<TransacaoDTO>>
    remover(id: string): Promise<Resposta<void>>
  }
  recorrencias: {
    listar(): Promise<Resposta<RecorrenciaDTO[]>>
    criar(entrada: CriarRecorrenciaEntrada): Promise<Resposta<RecorrenciaDTO>>
    encerrar(entrada: EncerrarRecorrenciaEntrada): Promise<Resposta<void>>
  }
  painel: {
    obter(filtro: FiltroPainel): Promise<Resposta<PainelDTO>>
  }
  previsao: {
    obter(filtro: FiltroPrevisao): Promise<Resposta<PrevisaoDTO>>
  }
  saude: {
    obter(pessoaId: string | null): Promise<Resposta<SaudeFinanceiraDTO>>
  }
  analise: {
    obter(filtro: FiltroAnalise): Promise<Resposta<AnaliseDTO>>
  }
  objetivos: {
    listar(): Promise<Resposta<ObjetivosDTO>>
    criar(entrada: CriarObjetivoEntrada): Promise<Resposta<void>>
    atualizar(entrada: AtualizarObjetivoEntrada): Promise<Resposta<void>>
    remover(id: string): Promise<Resposta<void>>
    aportar(entrada: AportarObjetivoEntrada): Promise<Resposta<void>>
    programarAporte(entrada: ProgramarAporteEntrada): Promise<Resposta<void>>
  }
  dividas: {
    plano(extraMensal: number | null): Promise<Resposta<PlanoDividasDTO>>
    criar(entrada: CriarDividaEntrada): Promise<Resposta<void>>
    remover(id: string): Promise<Resposta<void>>
    simularCredito(entrada: SimularCreditoEntrada): Promise<Resposta<SimulacaoCreditoDTO>>
  }
  ia: {
    obterConfiguracao(): Promise<Resposta<ConfiguracaoIADTO>>
    salvarConfiguracao(entrada: SalvarConfiguracaoIAEntrada): Promise<Resposta<ConfiguracaoIADTO>>
    testar(): Promise<Resposta<TesteIADTO>>
    conversar(mensagens: MensagemChatDTO[]): Promise<Resposta<RespostaAssistenteDTO>>
  }
  importacao: {
    lerContracheque(arquivo: ArquivoEntrada): Promise<Resposta<ContrachequeLidoDTO>>
    confirmarContracheque(entrada: ConfirmarContrachequeEntrada): Promise<Resposta<ResultadoContrachequeDTO>>
    lerNotaFiscal(endereco: string): Promise<Resposta<NotaFiscalLidaDTO>>
  }
  perfil: {
    obter(): Promise<Resposta<PerfilDTO>>
    salvar(entrada: SalvarPerfilEntrada): Promise<Resposta<PerfilDTO>>
  }
  cartoes: {
    listar(): Promise<Resposta<CartaoDTO[]>>
    criar(entrada: CriarCartaoEntrada): Promise<Resposta<CartaoDTO>>
    remover(id: string): Promise<Resposta<void>>
    resumo(filtro: FiltroResumoCartoes): Promise<Resposta<ResumoCartaoDTO[]>>
    criarCompra(entrada: CriarCompraCartaoEntrada): Promise<Resposta<CompraCartaoDTO>>
    removerCompra(id: string): Promise<Resposta<void>>
  }
  taxas: {
    listar(modalidade?: ModalidadeCredito): Promise<Resposta<ListaTaxasDTO>>
    atualizar(): Promise<Resposta<SituacaoTaxasDTO>>
  }
}

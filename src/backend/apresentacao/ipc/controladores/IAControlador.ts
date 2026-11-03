import type {
  ConfiguracaoIADTO,
  MensagemChatDTO,
  RespostaAssistenteDTO,
  SalvarConfiguracaoIAEntrada,
  TesteIADTO
} from '@compartilhado/dtos/ia'
import type {
  ArquivoEntrada,
  ConfirmarContrachequeEntrada,
  ContrachequeLidoDTO,
  NotaFiscalLidaDTO,
  ResultadoContrachequeDTO
} from '@compartilhado/dtos/importacao'
import type {
  InterpretacaoLancamentosDTO,
  PropostaLancamentoDTO,
  ResultadoLancamentosDTO
} from '@compartilhado/dtos/lancamentosTexto'
import type { ConfirmarLancamentos, InterpretarLancamentos } from '../../../aplicacao/casos-de-uso/ia/LancamentosPorTexto'
import type {
  ConversarComAssistente,
  ObterConfiguracaoIA,
  SalvarConfiguracaoIA,
  TestarIA
} from '../../../aplicacao/casos-de-uso/ia/Assistente'
import type {
  ConfirmarContracheque,
  LerContracheque,
  LerNotaFiscal
} from '../../../aplicacao/casos-de-uso/importacao/Importacao'

export class IAControlador {
  constructor(
    private readonly obterConfiguracaoIA: ObterConfiguracaoIA,
    private readonly salvarConfiguracaoIA: SalvarConfiguracaoIA,
    private readonly testarIA: TestarIA,
    private readonly conversarComAssistente: ConversarComAssistente,
    private readonly interpretarLancamentosUC: InterpretarLancamentos,
    private readonly confirmarLancamentosUC: ConfirmarLancamentos
  ) {}

  obterConfiguracao(): Promise<ConfiguracaoIADTO> {
    return this.obterConfiguracaoIA.executar()
  }

  salvarConfiguracao(entrada: SalvarConfiguracaoIAEntrada): Promise<ConfiguracaoIADTO> {
    return this.salvarConfiguracaoIA.executar(entrada)
  }

  testar(): Promise<TesteIADTO> {
    return this.testarIA.executar()
  }

  conversar(mensagens: MensagemChatDTO[]): Promise<RespostaAssistenteDTO> {
    return this.conversarComAssistente.executar(mensagens)
  }

  interpretarLancamentos(texto: string): Promise<InterpretacaoLancamentosDTO> {
    return this.interpretarLancamentosUC.executar(texto)
  }

  confirmarLancamentos(propostas: PropostaLancamentoDTO[]): Promise<ResultadoLancamentosDTO> {
    return this.confirmarLancamentosUC.executar(propostas)
  }
}

export class ImportacaoControlador {
  constructor(
    private readonly lerContrachequeUC: LerContracheque,
    private readonly confirmarContrachequeUC: ConfirmarContracheque,
    private readonly lerNotaFiscalUC: LerNotaFiscal
  ) {}

  lerContracheque(arquivo: ArquivoEntrada): Promise<ContrachequeLidoDTO> {
    return this.lerContrachequeUC.executar(arquivo)
  }

  confirmarContracheque(entrada: ConfirmarContrachequeEntrada): Promise<ResultadoContrachequeDTO> {
    return this.confirmarContrachequeUC.executar(entrada)
  }

  lerNotaFiscal(endereco: string): Promise<NotaFiscalLidaDTO> {
    return this.lerNotaFiscalUC.executar(endereco)
  }
}

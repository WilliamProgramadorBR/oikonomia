import type {
  ConferirSaldoEntrada,
  ContaDTO,
  CriarContaEntrada,
  ImportarExtratoEntrada,
  LerExtratoEntrada,
  PreviaImportacaoDTO,
  ResultadoConferenciaDTO,
  ResultadoImportacaoDTO
} from '@compartilhado/dtos/conta'
import type {
  ArquivarConta,
  ConferirSaldo,
  CriarConta,
  ImportarExtrato,
  LerExtrato,
  ListarContas
} from '../../../aplicacao/casos-de-uso/conta/Contas'

export class ContaControlador {
  constructor(
    private readonly listarContas: ListarContas,
    private readonly criarConta: CriarConta,
    private readonly conferirSaldo: ConferirSaldo,
    private readonly arquivarConta: ArquivarConta,
    private readonly lerExtratoUC: LerExtrato,
    private readonly importarExtratoUC: ImportarExtrato
  ) {}

  listar(): Promise<ContaDTO[]> {
    return this.listarContas.executar()
  }

  criar(entrada: CriarContaEntrada): Promise<void> {
    return this.criarConta.executar(entrada)
  }

  conferir(entrada: ConferirSaldoEntrada): Promise<ResultadoConferenciaDTO> {
    return this.conferirSaldo.executar(entrada)
  }

  arquivar(id: string): Promise<void> {
    return this.arquivarConta.executar(id)
  }

  lerExtrato(entrada: LerExtratoEntrada): Promise<PreviaImportacaoDTO> {
    return this.lerExtratoUC.executar(entrada)
  }

  importarExtrato(entrada: ImportarExtratoEntrada): Promise<ResultadoImportacaoDTO> {
    return this.importarExtratoUC.executar(entrada)
  }
}

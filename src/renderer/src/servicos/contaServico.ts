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
import { api, desembrulhar } from './api'

export const contaServico = {
  listar(): Promise<ContaDTO[]> {
    return desembrulhar(api.contas.listar())
  },
  criar(entrada: CriarContaEntrada): Promise<void> {
    return desembrulhar(api.contas.criar(entrada))
  },
  conferir(entrada: ConferirSaldoEntrada): Promise<ResultadoConferenciaDTO> {
    return desembrulhar(api.contas.conferir(entrada))
  },
  arquivar(id: string): Promise<void> {
    return desembrulhar(api.contas.arquivar(id))
  },
  lerExtrato(entrada: LerExtratoEntrada): Promise<PreviaImportacaoDTO> {
    return desembrulhar(api.contas.lerExtrato(entrada))
  },
  importarExtrato(entrada: ImportarExtratoEntrada): Promise<ResultadoImportacaoDTO> {
    return desembrulhar(api.contas.importarExtrato(entrada))
  }
}

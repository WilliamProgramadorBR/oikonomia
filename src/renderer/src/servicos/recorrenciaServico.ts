import type {
  CriarRecorrenciaEntrada,
  DefinirContaRecorrenciaEntrada,
  EncerrarRecorrenciaEntrada,
  RecorrenciaDTO
} from '@compartilhado/dtos/recorrencia'
import { api, desembrulhar } from './api'

export const recorrenciaServico = {
  listar(): Promise<RecorrenciaDTO[]> {
    return desembrulhar(api.recorrencias.listar())
  },

  criar(entrada: CriarRecorrenciaEntrada): Promise<RecorrenciaDTO> {
    return desembrulhar(api.recorrencias.criar(entrada))
  },

  encerrar(entrada: EncerrarRecorrenciaEntrada): Promise<void> {
    return desembrulhar(api.recorrencias.encerrar(entrada))
  },

  definirConta(entrada: DefinirContaRecorrenciaEntrada): Promise<void> {
    return desembrulhar(api.recorrencias.definirConta(entrada))
  }
}

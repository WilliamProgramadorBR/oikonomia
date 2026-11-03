import type {
  AjustarPrevistaEntrada,
  AplicarFeriasEntrada,
  FeriasEntrada,
  PlanoFeriasDTO,
  ResultadoAjusteDTO
} from '@compartilhado/dtos/ajustes'
import type { TransacaoDTO } from '@compartilhado/dtos/transacao'
import { api, desembrulhar } from './api'

export const ajustesServico = {
  ajustarPrevista(entrada: AjustarPrevistaEntrada): Promise<TransacaoDTO> {
    return desembrulhar(api.ajustes.ajustarPrevista(entrada))
  },
  simularFerias(entrada: FeriasEntrada): Promise<PlanoFeriasDTO> {
    return desembrulhar(api.ajustes.simularFerias(entrada))
  },
  aplicarFerias(entrada: AplicarFeriasEntrada): Promise<ResultadoAjusteDTO> {
    return desembrulhar(api.ajustes.aplicarFerias(entrada))
  }
}

import type { FiltroPrevisao, PrevisaoDTO } from '@compartilhado/dtos/previsao'
import { api, desembrulhar } from './api'

export const previsaoServico = {
  obter(filtro: FiltroPrevisao): Promise<PrevisaoDTO> {
    return desembrulhar(api.previsao.obter(filtro))
  }
}

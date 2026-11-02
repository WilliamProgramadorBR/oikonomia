import type { AnaliseDTO, FiltroAnalise } from '@compartilhado/dtos/analise'
import { api, desembrulhar } from './api'

export const analiseServico = {
  obter(filtro: FiltroAnalise): Promise<AnaliseDTO> {
    return desembrulhar(api.analise.obter(filtro))
  }
}

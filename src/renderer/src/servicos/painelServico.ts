import type { FiltroPainel, PainelDTO } from '@compartilhado/dtos/painel'
import { api, desembrulhar } from './api'

export const painelServico = {
  obter(filtro: FiltroPainel): Promise<PainelDTO> {
    return desembrulhar(api.painel.obter(filtro))
  }
}

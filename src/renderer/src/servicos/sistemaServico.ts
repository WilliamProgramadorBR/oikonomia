import type { SituacaoSistemaDTO } from '@compartilhado/dtos/sistema'
import { api, desembrulhar } from './api'

export const sistemaServico = {
  situacao(): Promise<SituacaoSistemaDTO> {
    return desembrulhar(api.sistema.situacao())
  }
}

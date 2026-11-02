import type { ListaTaxasDTO, ModalidadeCredito, SituacaoTaxasDTO } from '@compartilhado/dtos/taxa'
import { api, desembrulhar } from './api'

export const taxaServico = {
  listar(modalidade?: ModalidadeCredito): Promise<ListaTaxasDTO> {
    return desembrulhar(api.taxas.listar(modalidade))
  },

  atualizar(): Promise<SituacaoTaxasDTO> {
    return desembrulhar(api.taxas.atualizar())
  }
}

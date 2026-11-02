import type { EstadoAtualizacaoDTO } from '@compartilhado/dtos/atualizacao'
import { api, desembrulhar } from './api'

export const atualizacaoServico = {
  obter(): Promise<EstadoAtualizacaoDTO> {
    return desembrulhar(api.atualizacao.obter())
  },
  verificar(): Promise<EstadoAtualizacaoDTO> {
    return desembrulhar(api.atualizacao.verificar())
  },
  instalar(): Promise<EstadoAtualizacaoDTO> {
    return desembrulhar(api.atualizacao.instalar())
  },
  aoMudar(ouvinte: (estado: EstadoAtualizacaoDTO) => void): () => void {
    return api.atualizacao.aoMudar(ouvinte)
  }
}

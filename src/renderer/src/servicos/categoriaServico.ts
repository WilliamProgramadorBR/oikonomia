import type { CategoriaDTO, CriarCategoriaEntrada } from '@compartilhado/dtos/categoria'
import { api, desembrulhar } from './api'

export const categoriaServico = {
  listar(): Promise<CategoriaDTO[]> {
    return desembrulhar(api.categorias.listar())
  },

  criar(entrada: CriarCategoriaEntrada): Promise<CategoriaDTO> {
    return desembrulhar(api.categorias.criar(entrada))
  },

  remover(id: string): Promise<void> {
    return desembrulhar(api.categorias.remover(id))
  }
}

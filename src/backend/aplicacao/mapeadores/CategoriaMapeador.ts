import type { CategoriaDTO } from '@compartilhado/dtos/categoria'
import type { Categoria } from '../../dominio/entidades/Categoria'

export const CategoriaMapeador = {
  paraDTO(categoria: Categoria): CategoriaDTO {
    return {
      id: categoria.id,
      nome: categoria.nome,
      tipo: categoria.tipo,
      natureza: categoria.natureza,
      cor: categoria.cor,
      icone: categoria.icone
    }
  }
}

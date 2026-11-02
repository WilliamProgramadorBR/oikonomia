import type { CategoriaDTO } from '@compartilhado/dtos/categoria'
import type { ICategoriaRepositorio } from '../../../dominio/repositorios/ICategoriaRepositorio'
import { CategoriaMapeador } from '../../mapeadores/CategoriaMapeador'

export class ListarCategorias {
  constructor(private readonly repositorio: ICategoriaRepositorio) {}

  async executar(): Promise<CategoriaDTO[]> {
    const categorias = await this.repositorio.listar()
    return categorias.map(CategoriaMapeador.paraDTO)
  }
}

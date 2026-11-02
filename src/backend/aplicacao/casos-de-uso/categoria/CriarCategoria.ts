import type { CategoriaDTO, CriarCategoriaEntrada } from '@compartilhado/dtos/categoria'
import { Categoria } from '../../../dominio/entidades/Categoria'
import type { ICategoriaRepositorio } from '../../../dominio/repositorios/ICategoriaRepositorio'
import { CategoriaMapeador } from '../../mapeadores/CategoriaMapeador'

export class CriarCategoria {
  constructor(private readonly repositorio: ICategoriaRepositorio) {}

  async executar(entrada: CriarCategoriaEntrada): Promise<CategoriaDTO> {
    const categoria = Categoria.criar(entrada)
    await this.repositorio.salvar(categoria)
    return CategoriaMapeador.paraDTO(categoria)
  }
}

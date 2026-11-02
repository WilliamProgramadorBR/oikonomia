import type { CategoriaDTO, CriarCategoriaEntrada } from '@compartilhado/dtos/categoria'
import type { CriarCategoria } from '../../../aplicacao/casos-de-uso/categoria/CriarCategoria'
import type { ListarCategorias } from '../../../aplicacao/casos-de-uso/categoria/ListarCategorias'
import type { RemoverCategoria } from '../../../aplicacao/casos-de-uso/categoria/RemoverCategoria'

export class CategoriaControlador {
  constructor(
    private readonly criarCategoria: CriarCategoria,
    private readonly listarCategorias: ListarCategorias,
    private readonly removerCategoria: RemoverCategoria
  ) {}

  listar(): Promise<CategoriaDTO[]> {
    return this.listarCategorias.executar()
  }

  criar(entrada: CriarCategoriaEntrada): Promise<CategoriaDTO> {
    return this.criarCategoria.executar(entrada)
  }

  remover(id: string): Promise<void> {
    return this.removerCategoria.executar(id)
  }
}

import type { Categoria } from '../entidades/Categoria'

export interface ICategoriaRepositorio {
  salvar(categoria: Categoria): Promise<void>
  listar(): Promise<Categoria[]>
  buscarPorId(id: string): Promise<Categoria | null>
  remover(id: string): Promise<void>
}

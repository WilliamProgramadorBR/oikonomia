import type { Recorrencia } from '../entidades/Recorrencia'

export interface IRecorrenciaRepositorio {
  salvar(recorrencia: Recorrencia): Promise<void>
  listar(): Promise<Recorrencia[]>
  buscarPorId(id: string): Promise<Recorrencia | null>
  existeComCategoria(categoriaId: string): Promise<boolean>
  existeComPessoa(pessoaId: string): Promise<boolean>
}

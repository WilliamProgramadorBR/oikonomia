import type { Pessoa } from '../entidades/Pessoa'

export interface IPessoaRepositorio {
  salvar(pessoa: Pessoa): Promise<void>
  listar(): Promise<Pessoa[]>
  buscarPorId(id: string): Promise<Pessoa | null>
  remover(id: string): Promise<void>
}

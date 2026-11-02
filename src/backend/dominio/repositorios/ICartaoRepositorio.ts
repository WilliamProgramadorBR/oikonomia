import type { Cartao } from '../entidades/Cartao'

export interface ICartaoRepositorio {
  salvar(cartao: Cartao): Promise<void>
  listar(): Promise<Cartao[]>
  buscarPorId(id: string): Promise<Cartao | null>
  remover(id: string): Promise<void>
}

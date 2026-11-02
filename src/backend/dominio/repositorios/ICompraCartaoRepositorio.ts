import type { CompraCartao } from '../entidades/CompraCartao'
import type { Transacao } from '../entidades/Transacao'

export interface ICompraCartaoRepositorio {
  // Grava a compra e as transações das parcelas juntas (tudo ou nada).
  salvar(compra: CompraCartao, parcelas: Transacao[]): Promise<void>
  listar(): Promise<CompraCartao[]>
  buscarPorId(id: string): Promise<CompraCartao | null>
  // Remove a compra e todas as suas parcelas.
  remover(id: string): Promise<void>
  existeNoCartao(cartaoId: string): Promise<boolean>
}

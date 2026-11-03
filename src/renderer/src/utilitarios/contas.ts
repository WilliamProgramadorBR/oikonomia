import { Banknote, Landmark, PiggyBank, TrendingUp, type LucideIcon } from 'lucide-react'
import type { ContaDTO, TipoContaDTO } from '@compartilhado/dtos/conta'

export const TIPOS_CONTA: Record<TipoContaDTO, { nome: string; icone: LucideIcon }> = {
  corrente: { nome: 'Conta corrente', icone: Landmark },
  poupanca: { nome: 'Poupança', icone: PiggyBank },
  carteira: { nome: 'Carteira (dinheiro)', icone: Banknote },
  investimento: { nome: 'Investimento', icone: TrendingUp }
}

// Conta sugerida para um lançamento de alguém: a única conta ativa dessa pessoa (ou da casa).
export function contaPadrao(contas: ContaDTO[], pessoaId: string | null): string | null {
  const ativas = contas.filter((c) => c.ativa && c.tipo !== 'investimento')
  const daPessoa = ativas.filter((c) => c.pessoaId === pessoaId)
  return daPessoa.length === 1 ? daPessoa[0].id : null
}

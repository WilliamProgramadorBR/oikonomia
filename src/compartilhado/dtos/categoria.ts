import type { TipoTransacaoDTO } from './transacao'

// Natureza de uma despesa: para onde o dinheiro vai e que "retorno" ele traz.
export type NaturezaDespesa = 'essencial' | 'estilo_vida' | 'educacao' | 'juros' | 'outros'

export const NOMES_NATUREZAS: Record<NaturezaDespesa, string> = {
  essencial: 'Essencial',
  estilo_vida: 'Estilo de vida',
  educacao: 'Investimento em você',
  juros: 'Juros e tarifas',
  outros: 'Outros'
}

export interface CategoriaDTO {
  id: string
  nome: string
  tipo: TipoTransacaoDTO
  natureza: NaturezaDespesa | null // só para despesas
  cor: string
  icone: string // nome do ícone (ver renderer/src/utilitarios/icones.tsx)
}

export interface CriarCategoriaEntrada {
  nome: string
  tipo: TipoTransacaoDTO
  natureza: NaturezaDespesa | null
  cor: string
  icone: string
}

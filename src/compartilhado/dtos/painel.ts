import type { TransacaoDTO } from './transacao'

export interface FiltroPainel {
  pessoaId: string | null // null = família inteira
  mes: string // AAAA-MM
}

// Totais incluem lançamentos previstos; os campos *Previstas dizem quanto disso é estimativa.
export interface PontoFluxoMensal {
  mes: string
  receitas: number
  despesas: number
  guardado: number
  saldo: number // receitas − despesas − guardado
  receitasPrevistas: number
  despesasPrevistas: number
}

export interface FatiaGasto {
  id: string
  nome: string
  cor: string
  total: number
}

export interface PainelDTO {
  mes: string
  receitas: number
  despesas: number
  guardado: number
  saldo: number
  receitasPrevistas: number
  despesasPrevistas: number
  taxaPoupanca: number | null // (receitas − despesas) / receitas; null quando não há receita
  variacaoDespesas: number | null // fração em relação ao mês anterior
  fluxoMensal: PontoFluxoMensal[]
  despesasPorCategoria: FatiaGasto[]
  despesasPorPessoa: FatiaGasto[]
  ultimasTransacoes: TransacaoDTO[]
  aConfirmar: TransacaoDTO[] // previstas do mês com vencimento até os próximos 7 dias
}

// Provisão dos próximos meses: o que já está comprometido + estimativa de imprevistos.

export interface MesPrevisto {
  mes: string // AAAA-MM
  receitas: number
  contasRecorrentes: number // despesas geradas por recorrências (confirmadas ou previstas)
  parcelasCartao: number // parcelas de compras já feitas
  parcelasDividas: number // parcelas de empréstimos e financiamentos cadastrados
  avulsasLancadas: number // despesas não recorrentes já registradas no mês
  reservaImprevistos: number // estimativa do que ainda deve aparecer sem estar previsto
  guardado: number
  saldoProjetado: number // receitas − todas as despesas − reserva − guardado
  valoresEstimados: number // quanto do total ainda é estimativa (previstas + reserva)
}

export interface PrevisaoDTO {
  meses: MesPrevisto[]
  mediaImprevistosMensal: number
  mesesDeHistorico: number // meses completos usados para estimar imprevistos (confiança)
}

export interface FiltroPrevisao {
  pessoaId: string | null
  mesInicial: string // AAAA-MM
}

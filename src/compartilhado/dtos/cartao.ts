// Taxas em PERCENTUAL ao mês (8.54 = 8,54%).

export interface CartaoDTO {
  id: string
  apelido: string
  instituicao: string
  cnpj8: string | null // identifica a instituição nos dados do Banco Central
  limiteCentavos: number
  diaFechamento: number
  diaVencimento: number
  pessoaId: string // titular
  cor: string
  taxaContratoMensal: number | null // taxa real do contrato, se o usuário informou
  taxaParceladoMercado: number | null // média do banco (Banco Central)
  taxaRotativoMercado: number | null
}

export interface CriarCartaoEntrada {
  apelido: string
  instituicao: string
  cnpj8: string | null
  limiteCentavos: number
  diaFechamento: number
  diaVencimento: number
  pessoaId: string
  cor: string
  taxaContratoMensal: number | null
}

// 'compra' = compra comum; 'parcelamento_fatura' = fatura parcelada no banco (dívida do cartão, com juros).
export type NaturezaCompra = 'compra' | 'parcelamento_fatura'

export interface CompraCartaoDTO {
  id: string
  cartaoId: string
  descricao: string
  valorCentavos: number // valor da compra (à vista)
  totalCentavos: number // soma das parcelas (com juros, se houver)
  quantidadeParcelas: number
  valorParcelaCentavos: number
  taxaMensal: number // 0 = sem juros
  dataCompra: string
  primeiraFatura: string // AAAA-MM
  parcelasPagas: number // parcelas com vencimento já passado
  categoriaId: string
  pessoaId: string | null // null = da casa (todos os membros)
  estabelecimento: string | null
  natureza: NaturezaCompra
}

// Compra que já estava em andamento antes de usar o app: só as parcelas que faltam entram nas faturas.
export interface CompraEmAndamento {
  parcelasRestantes: number
  valorParcelaCentavos: number
  proximaFatura: string // AAAA-MM da fatura em que vence a próxima parcela
}

export interface CriarCompraCartaoEntrada {
  cartaoId: string
  descricao: string
  valorCentavos: number
  quantidadeParcelas: number
  taxaMensal: number
  dataCompra: string
  categoriaId: string
  pessoaId: string | null // null = da casa (todos os membros)
  estabelecimento?: string
  natureza?: NaturezaCompra
  emAndamento?: CompraEmAndamento | null
}

export interface FaturaMensal {
  mes: string
  totalCentavos: number // valores certos (parcelas e contas confirmadas)
  previstoCentavos: number // contas recorrentes ainda estimadas
}

export interface ResumoCartaoDTO {
  cartao: CartaoDTO
  faturaDoMesCentavos: number // fatura que vence no mês selecionado
  limiteUsadoCentavos: number // parcelas ainda não vencidas
  limiteDisponivelCentavos: number
  proximasFaturas: FaturaMensal[] // a partir do mês selecionado
  comprasAtivas: CompraCartaoDTO[] // compras com parcelas a vencer
}

export interface FiltroResumoCartoes {
  pessoaId: string | null
  mes: string
}

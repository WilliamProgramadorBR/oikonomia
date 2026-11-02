// Taxas médias de juros por instituição, publicadas pelo Banco Central.
// Taxas sempre em PERCENTUAL (8.54 = 8,54% ao mês).

export type ModalidadeCredito =
  | 'cartao_parcelado'
  | 'cartao_rotativo'
  | 'cheque_especial'
  | 'credito_pessoal'
  | 'consignado_privado'
  | 'consignado_publico'
  | 'consignado_inss'
  | 'veiculos'
  | 'imobiliario_prefixado'
  | 'imobiliario_tr'

export const NOMES_MODALIDADES: Record<ModalidadeCredito, string> = {
  cartao_parcelado: 'Cartão parcelado',
  cartao_rotativo: 'Cartão rotativo',
  cheque_especial: 'Cheque especial',
  credito_pessoal: 'Crédito pessoal',
  consignado_privado: 'Consignado privado',
  consignado_publico: 'Consignado público',
  consignado_inss: 'Consignado INSS',
  veiculos: 'Veículos',
  imobiliario_prefixado: 'Imóvel (prefixado)',
  imobiliario_tr: 'Imóvel (TR + taxa)'
}

export interface TaxaMercadoDTO {
  cnpj8: string
  instituicao: string
  modalidade: ModalidadeCredito
  taxaMensal: number
  taxaAnual: number
  posicao: number // 1 = menor taxa da modalidade
}

export interface SituacaoTaxasDTO {
  inicioPeriodo: string | null // período de referência do Banco Central
  fimPeriodo: string | null
  atualizadoEm: string | null // quando o app baixou pela última vez
  quantidade: number
}

export interface ListaTaxasDTO {
  situacao: SituacaoTaxasDTO
  taxas: TaxaMercadoDTO[]
}

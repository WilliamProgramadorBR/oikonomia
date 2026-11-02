// Taxa média de juros de uma instituição numa modalidade (dado público do Banco Central).
// É só dado de referência, sem regras, por isso uma interface e não uma classe.

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

export interface TaxaMercado {
  cnpj8: string
  instituicao: string
  modalidade: ModalidadeCredito
  taxaMensal: number // percentual
  taxaAnual: number // percentual
  posicao: number
}

export interface LoteTaxasMercado {
  inicioPeriodo: string
  fimPeriodo: string
  taxas: TaxaMercado[]
}

import type { LoteTaxasMercado, ModalidadeCredito, TaxaMercado } from '../entidades/TaxaMercado'

export interface SituacaoTaxas {
  inicioPeriodo: string | null
  fimPeriodo: string | null
  atualizadoEm: Date | null
  quantidade: number
}

export interface ITaxaMercadoRepositorio {
  // Troca todas as taxas guardadas pelas do lote mais recente.
  substituir(lote: LoteTaxasMercado): Promise<void>
  listar(modalidade?: ModalidadeCredito): Promise<TaxaMercado[]>
  situacao(): Promise<SituacaoTaxas>
}

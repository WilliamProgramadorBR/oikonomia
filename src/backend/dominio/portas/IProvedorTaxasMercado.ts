import type { LoteTaxasMercado } from '../entidades/TaxaMercado'

// Porta para uma fonte externa de taxas de juros (hoje: API pública do Banco Central).
export interface IProvedorTaxasMercado {
  buscarMaisRecentes(): Promise<LoteTaxasMercado>
}

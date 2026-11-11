import type { Migracao } from '.'

// Compras no cartão podem ser parcelamento da fatura (dívida do cartão), não só compras.
export const migracao015: Migracao = {
  versao: 15,
  nome: 'natureza_compra_cartao',
  sql: `ALTER TABLE compras_cartao ADD COLUMN natureza TEXT NOT NULL DEFAULT 'compra';`
}

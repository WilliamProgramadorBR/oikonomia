import type { Migracao } from '.'

// Motivo de um valor fora do normal numa ocorrência (ex.: holerite das férias). Ocorrências
// ajustadas não são reestimadas pela sincronização nem entram na média das contas variáveis.
export const migracao009: Migracao = {
  versao: 9,
  nome: 'ajustes_de_ocorrencia',
  sql: `ALTER TABLE transacoes ADD COLUMN ajuste TEXT;`
}

import type { Migracao } from '.'

// Conta recorrente ligada a uma conta bancária: as previsões nascem nela e entram na projeção do saldo.
export const migracao011: Migracao = {
  versao: 11,
  nome: 'conta_das_recorrentes',
  sql: `ALTER TABLE recorrencias ADD COLUMN conta_id TEXT REFERENCES contas (id);`
}

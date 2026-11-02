import type { Migracao } from '.'

export const migracao001: Migracao = {
  versao: 1,
  nome: 'criar_transacoes',
  sql: `
    CREATE TABLE transacoes (
      id             TEXT PRIMARY KEY,
      descricao      TEXT    NOT NULL,
      valor_centavos INTEGER NOT NULL,
      tipo           TEXT    NOT NULL CHECK (tipo IN ('receita', 'despesa')),
      data           TEXT    NOT NULL,
      criado_em      TEXT    NOT NULL
    );
    CREATE INDEX idx_transacoes_data ON transacoes (data);
  `
}

import type { Migracao } from '.'

const AGORA = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`

export const migracao006: Migracao = {
  versao: 6,
  nome: 'dividas',
  sql: `
    CREATE TABLE dividas (
      id                     TEXT PRIMARY KEY,
      nome                   TEXT    NOT NULL,
      tipo                   TEXT    NOT NULL,
      credor                 TEXT    NOT NULL DEFAULT '',
      cnpj8                  TEXT,
      taxa_mensal            REAL    NOT NULL,
      parcela_centavos       INTEGER NOT NULL,
      parcelas_totais        INTEGER NOT NULL,
      saldo_inicial_centavos INTEGER NOT NULL,
      dia_vencimento         INTEGER NOT NULL,
      pessoa_id              TEXT    NOT NULL REFERENCES pessoas (id),
      criado_em              TEXT    NOT NULL
    );

    -- A parcela mensal da dívida é uma conta recorrente ligada a ela
    ALTER TABLE recorrencias ADD COLUMN divida_id TEXT REFERENCES dividas (id);

    INSERT INTO categorias (id, nome, tipo, natureza, cor, icone, criado_em) VALUES
      ('cat-emprestimos', 'Empréstimos e financiamentos', 'despesa', 'outros', '#b45309', 'emprestimo', ${AGORA});
  `
}

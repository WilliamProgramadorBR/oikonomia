import type { Migracao } from '.'

// Open Finance (opcional): conexões feitas na Pluggy e as contas que vieram delas.
// Credenciais e o aceite do termo ficam em `configuracoes` (a senha cifrada pelo cofre do sistema).
export const migracao012: Migracao = {
  versao: 12,
  nome: 'open_finance',
  sql: `
    CREATE TABLE open_finance_conexoes (
      item_id       TEXT PRIMARY KEY,
      instituicao   TEXT NOT NULL,
      cor           TEXT,
      situacao      TEXT NOT NULL,
      mensagem      TEXT,
      conectado_em  TEXT NOT NULL
    );

    CREATE TABLE open_finance_contas (
      id                    TEXT PRIMARY KEY, -- id da conta na Pluggy
      item_id               TEXT    NOT NULL REFERENCES open_finance_conexoes (item_id) ON DELETE CASCADE,
      nome                  TEXT    NOT NULL,
      tipo                  TEXT    NOT NULL,
      final_numero          TEXT,
      saldo_centavos        INTEGER NOT NULL,
      conta_id              TEXT    REFERENCES contas (id), -- conta local vinculada (NULL = não importar)
      ultima_sincronizacao  TEXT
    );
    CREATE UNIQUE INDEX idx_open_finance_conta_local ON open_finance_contas (conta_id) WHERE conta_id IS NOT NULL;
  `
}

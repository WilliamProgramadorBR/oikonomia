import type { Migracao } from '.'

// Contas (corrente, poupança, carteira, investimento) com saldo de referência e importação de extrato.
export const migracao010: Migracao = {
  versao: 10,
  nome: 'contas_e_extratos',
  sql: `
    CREATE TABLE contas (
      id           TEXT PRIMARY KEY,
      nome         TEXT    NOT NULL,
      tipo         TEXT    NOT NULL CHECK (tipo IN ('corrente', 'poupanca', 'carteira', 'investimento')),
      instituicao  TEXT    NOT NULL DEFAULT '',
      cnpj8        TEXT,
      pessoa_id    TEXT    REFERENCES pessoas (id), -- NULL = conta da casa (conjunta)
      ativa        INTEGER NOT NULL DEFAULT 1,
      criado_em    TEXT    NOT NULL
    );

    -- Saldos conferidos (informados pelo usuário ou lidos do extrato). O mais recente é a referência:
    -- saldo atual = referência + lançamentos confirmados da conta depois da data dela.
    CREATE TABLE saldos_conta (
      id              TEXT PRIMARY KEY,
      conta_id        TEXT    NOT NULL REFERENCES contas (id) ON DELETE CASCADE,
      data            TEXT    NOT NULL, -- AAAA-MM-DD: saldo ao FIM deste dia
      saldo_centavos  INTEGER NOT NULL,
      origem          TEXT    NOT NULL CHECK (origem IN ('informado', 'extrato')),
      criado_em       TEXT    NOT NULL
    );
    CREATE INDEX idx_saldos_conta ON saldos_conta (conta_id, data);

    -- De qual conta saiu/entrou o dinheiro (débito, Pix, boleto) e o identificador da linha do extrato.
    ALTER TABLE transacoes ADD COLUMN conta_id TEXT REFERENCES contas (id);
    ALTER TABLE transacoes ADD COLUMN id_extrato TEXT;
    CREATE INDEX idx_transacoes_conta ON transacoes (conta_id, data);
    CREATE UNIQUE INDEX idx_transacoes_extrato ON transacoes (conta_id, id_extrato) WHERE id_extrato IS NOT NULL;
  `
}

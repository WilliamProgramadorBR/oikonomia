import type { Migracao } from '.'

export const migracao003: Migracao = {
  versao: 3,
  nome: 'cartoes_e_taxas',
  sql: `
    CREATE TABLE cartoes (
      id                   TEXT PRIMARY KEY,
      apelido              TEXT    NOT NULL,
      instituicao          TEXT    NOT NULL,
      cnpj8                TEXT,
      limite_centavos      INTEGER NOT NULL,
      dia_fechamento       INTEGER NOT NULL,
      dia_vencimento       INTEGER NOT NULL,
      pessoa_id            TEXT    NOT NULL REFERENCES pessoas (id),
      cor                  TEXT    NOT NULL,
      taxa_contrato_mensal REAL,
      criado_em            TEXT    NOT NULL
    );

    CREATE TABLE compras_cartao (
      id                 TEXT PRIMARY KEY,
      cartao_id          TEXT    NOT NULL REFERENCES cartoes (id),
      descricao          TEXT    NOT NULL,
      valor_centavos     INTEGER NOT NULL,
      quantidade_parcelas INTEGER NOT NULL,
      taxa_mensal        REAL    NOT NULL,
      data_compra        TEXT    NOT NULL,
      categoria_id       TEXT    NOT NULL REFERENCES categorias (id),
      pessoa_id          TEXT    NOT NULL REFERENCES pessoas (id),
      estabelecimento    TEXT,
      criado_em          TEXT    NOT NULL
    );

    -- Parcelas: cada uma é uma transação ligada à compra
    ALTER TABLE transacoes ADD COLUMN cartao_id TEXT REFERENCES cartoes (id);
    ALTER TABLE transacoes ADD COLUMN compra_id TEXT REFERENCES compras_cartao (id);
    ALTER TABLE transacoes ADD COLUMN parcela_numero INTEGER;
    ALTER TABLE transacoes ADD COLUMN parcela_total INTEGER;
    CREATE INDEX idx_transacoes_compra ON transacoes (compra_id);

    -- Taxas médias do Banco Central (só o lote mais recente)
    CREATE TABLE taxas_mercado (
      cnpj8        TEXT NOT NULL,
      instituicao  TEXT NOT NULL,
      modalidade   TEXT NOT NULL,
      taxa_mensal  REAL NOT NULL,
      taxa_anual   REAL NOT NULL,
      posicao      INTEGER NOT NULL,
      PRIMARY KEY (cnpj8, modalidade)
    );

    -- Chave/valor para metadados do app
    CREATE TABLE configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `
}

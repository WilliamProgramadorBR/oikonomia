import type { Migracao } from '.'

// Lançamentos "para todos": pessoa_id passa a aceitar NULL (= da casa) em contas recorrentes e
// compras no cartão. Em transações a coluna já aceitava. SQLite não altera NOT NULL, então as
// tabelas são recriadas (procedimento oficial, com as chaves estrangeiras desligadas pelo executor).
export const migracao008: Migracao = {
  versao: 8,
  nome: 'lancamentos_da_casa',
  sql: `
    CREATE TABLE recorrencias_nova (
      id             TEXT PRIMARY KEY,
      descricao      TEXT    NOT NULL,
      tipo           TEXT    NOT NULL CHECK (tipo IN ('receita', 'despesa', 'guardado')),
      valor_variavel INTEGER NOT NULL,
      valor_centavos INTEGER NOT NULL,
      dia_do_mes     INTEGER NOT NULL,
      categoria_id   TEXT    NOT NULL REFERENCES categorias (id),
      pessoa_id      TEXT    REFERENCES pessoas (id),
      cartao_id      TEXT    REFERENCES cartoes (id),
      inicio         TEXT    NOT NULL,
      fim            TEXT,
      criado_em      TEXT    NOT NULL,
      objetivo_id    TEXT    REFERENCES objetivos (id),
      divida_id      TEXT    REFERENCES dividas (id)
    );
    INSERT INTO recorrencias_nova
      (id, descricao, tipo, valor_variavel, valor_centavos, dia_do_mes, categoria_id, pessoa_id,
       cartao_id, inicio, fim, criado_em, objetivo_id, divida_id)
    SELECT id, descricao, tipo, valor_variavel, valor_centavos, dia_do_mes, categoria_id, pessoa_id,
           cartao_id, inicio, fim, criado_em, objetivo_id, divida_id
    FROM recorrencias;
    DROP TABLE recorrencias;
    ALTER TABLE recorrencias_nova RENAME TO recorrencias;

    CREATE TABLE compras_cartao_nova (
      id                  TEXT PRIMARY KEY,
      cartao_id           TEXT    NOT NULL REFERENCES cartoes (id),
      descricao           TEXT    NOT NULL,
      valor_centavos      INTEGER NOT NULL,
      quantidade_parcelas INTEGER NOT NULL,
      taxa_mensal         REAL    NOT NULL,
      data_compra         TEXT    NOT NULL,
      categoria_id        TEXT    NOT NULL REFERENCES categorias (id),
      pessoa_id           TEXT    REFERENCES pessoas (id),
      estabelecimento     TEXT,
      criado_em           TEXT    NOT NULL
    );
    INSERT INTO compras_cartao_nova
      (id, cartao_id, descricao, valor_centavos, quantidade_parcelas, taxa_mensal, data_compra,
       categoria_id, pessoa_id, estabelecimento, criado_em)
    SELECT id, cartao_id, descricao, valor_centavos, quantidade_parcelas, taxa_mensal, data_compra,
           categoria_id, pessoa_id, estabelecimento, criado_em
    FROM compras_cartao;
    DROP TABLE compras_cartao;
    ALTER TABLE compras_cartao_nova RENAME TO compras_cartao;
  `
}

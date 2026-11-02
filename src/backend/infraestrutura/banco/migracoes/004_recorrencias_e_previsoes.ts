import type { Migracao } from '.'

const AGORA = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`

// SQLite não altera CHECK de colunas existentes: para aceitar o tipo 'guardado', as tabelas
// categorias e transacoes são recriadas (criar nova -> copiar -> apagar antiga -> renomear).
// executarMigracoes desliga as chaves estrangeiras durante o processo e verifica no final.
export const migracao004: Migracao = {
  versao: 4,
  nome: 'recorrencias_e_previsoes',
  sql: `
    CREATE TABLE recorrencias (
      id             TEXT PRIMARY KEY,
      descricao      TEXT    NOT NULL,
      tipo           TEXT    NOT NULL CHECK (tipo IN ('receita', 'despesa', 'guardado')),
      valor_variavel INTEGER NOT NULL,
      valor_centavos INTEGER NOT NULL,
      dia_do_mes     INTEGER NOT NULL,
      categoria_id   TEXT    NOT NULL REFERENCES categorias (id),
      pessoa_id      TEXT    NOT NULL REFERENCES pessoas (id),
      cartao_id      TEXT    REFERENCES cartoes (id),
      inicio         TEXT    NOT NULL,
      fim            TEXT,
      criado_em      TEXT    NOT NULL
    );

    -- ===== Categorias: tipo 'guardado' + natureza das despesas =====
    CREATE TABLE categorias_nova (
      id        TEXT PRIMARY KEY,
      nome      TEXT NOT NULL,
      tipo      TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa', 'guardado')),
      natureza  TEXT CHECK (natureza IN ('essencial', 'estilo_vida', 'educacao', 'juros', 'outros')),
      cor       TEXT NOT NULL,
      icone     TEXT NOT NULL,
      criado_em TEXT NOT NULL
    );
    INSERT INTO categorias_nova (id, nome, tipo, natureza, cor, icone, criado_em)
      SELECT id, nome, tipo, CASE WHEN tipo = 'despesa' THEN 'outros' END, cor, icone, criado_em
      FROM categorias;
    DROP TABLE categorias;
    ALTER TABLE categorias_nova RENAME TO categorias;

    UPDATE categorias SET natureza = 'essencial'
      WHERE id IN ('cat-moradia', 'cat-mercado', 'cat-transporte', 'cat-saude', 'cat-contas', 'cat-pets');
    UPDATE categorias SET natureza = 'estilo_vida'
      WHERE id IN ('cat-alimentacao', 'cat-lazer', 'cat-compras', 'cat-assinaturas');
    UPDATE categorias SET natureza = 'educacao' WHERE id = 'cat-educacao';

    INSERT INTO categorias (id, nome, tipo, natureza, cor, icone, criado_em) VALUES
      ('cat-juros', 'Juros e tarifas', 'despesa', 'juros', '#dc2626', 'juros', ${AGORA}),
      ('cat-reserva', 'Reserva de emergência', 'guardado', NULL, '#0ea5e9', 'reserva', ${AGORA}),
      ('cat-investimentos-guardado', 'Investimentos', 'guardado', NULL, '#8b5cf6', 'investimentos', ${AGORA}),
      ('cat-objetivos', 'Objetivos', 'guardado', NULL, '#f59e0b', 'objetivo', ${AGORA});

    -- ===== Transações: status + vínculo com recorrência =====
    CREATE TABLE transacoes_nova (
      id                      TEXT PRIMARY KEY,
      descricao               TEXT    NOT NULL,
      valor_centavos          INTEGER NOT NULL,
      tipo                    TEXT    NOT NULL CHECK (tipo IN ('receita', 'despesa', 'guardado')),
      status                  TEXT    NOT NULL DEFAULT 'confirmada'
                                      CHECK (status IN ('prevista', 'confirmada', 'ignorada')),
      data                    TEXT    NOT NULL,
      pessoa_id               TEXT    REFERENCES pessoas (id),
      categoria_id            TEXT    REFERENCES categorias (id),
      estabelecimento         TEXT,
      cartao_id               TEXT    REFERENCES cartoes (id),
      compra_id               TEXT    REFERENCES compras_cartao (id),
      parcela_numero          INTEGER,
      parcela_total           INTEGER,
      recorrencia_id          TEXT    REFERENCES recorrencias (id),
      recorrencia_competencia TEXT,
      criado_em               TEXT    NOT NULL
    );
    INSERT INTO transacoes_nova
      (id, descricao, valor_centavos, tipo, status, data, pessoa_id, categoria_id, estabelecimento,
       cartao_id, compra_id, parcela_numero, parcela_total, criado_em)
      SELECT id, descricao, valor_centavos, tipo, 'confirmada', data, pessoa_id, categoria_id, estabelecimento,
             cartao_id, compra_id, parcela_numero, parcela_total, criado_em
      FROM transacoes;
    DROP TABLE transacoes;
    ALTER TABLE transacoes_nova RENAME TO transacoes;

    CREATE INDEX idx_transacoes_data ON transacoes (data);
    CREATE INDEX idx_transacoes_pessoa ON transacoes (pessoa_id);
    CREATE INDEX idx_transacoes_categoria ON transacoes (categoria_id);
    CREATE INDEX idx_transacoes_compra ON transacoes (compra_id);
    CREATE INDEX idx_transacoes_cartao ON transacoes (cartao_id);
    -- Uma ocorrência por recorrência e mês
    CREATE UNIQUE INDEX idx_transacoes_ocorrencia
      ON transacoes (recorrencia_id, recorrencia_competencia) WHERE recorrencia_id IS NOT NULL;
  `
}

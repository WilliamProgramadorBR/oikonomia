import type { Migracao } from '.'

export const migracao005: Migracao = {
  versao: 5,
  nome: 'objetivos',
  sql: `
    CREATE TABLE objetivos (
      id                     TEXT PRIMARY KEY,
      nome                   TEXT    NOT NULL,
      tipo                   TEXT    NOT NULL
                                     CHECK (tipo IN ('reserva', 'viagem', 'compra', 'casa', 'quitar_divida', 'outro')),
      valor_alvo_centavos    INTEGER NOT NULL,
      valor_inicial_centavos INTEGER NOT NULL DEFAULT 0,
      data_alvo              TEXT    NOT NULL,
      prioridade             INTEGER NOT NULL CHECK (prioridade IN (1, 2, 3)),
      pessoa_id              TEXT    REFERENCES pessoas (id),
      criado_em              TEXT    NOT NULL
    );

    -- Aportes (lançamentos "guardado") e aportes programados (recorrências) ligados a um objetivo
    ALTER TABLE transacoes ADD COLUMN objetivo_id TEXT REFERENCES objetivos (id);
    ALTER TABLE recorrencias ADD COLUMN objetivo_id TEXT REFERENCES objetivos (id);
    CREATE INDEX idx_transacoes_objetivo ON transacoes (objetivo_id);
  `
}

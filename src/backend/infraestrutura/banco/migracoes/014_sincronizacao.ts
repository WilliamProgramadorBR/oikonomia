import type { Migracao } from '.'

export const migracao014: Migracao = {
  versao: 14,
  nome: 'fundacao_da_sincronizacao_segura',
  sql: `
    CREATE TABLE sincronizacao_configuracao (
      id               INTEGER PRIMARY KEY CHECK (id = 1),
      modo             TEXT    NOT NULL CHECK (modo IN ('local', 'sincronizacao')),
      fase             TEXT    NOT NULL CHECK (fase IN ('local', 'cofre_preparado', 'conectando', 'ativa', 'erro')),
      dispositivo_id   TEXT,
      familia_id       TEXT,
      servidor_url     TEXT,
      cofre_chave      TEXT,
      ultimo_cursor    INTEGER NOT NULL DEFAULT 0 CHECK (ultimo_cursor >= 0),
      mensagem         TEXT,
      atualizado_em    TEXT    NOT NULL
    );

    INSERT INTO sincronizacao_configuracao
      (id, modo, fase, dispositivo_id, familia_id, servidor_url, cofre_chave, ultimo_cursor, mensagem, atualizado_em)
    VALUES
      (1, 'local', 'local', NULL, NULL, NULL, NULL, 0, NULL, CURRENT_TIMESTAMP);

    -- A outbox vive dentro do SQLite cifrado. O payload local só será cifrado com a chave da família
    -- antes de sair do processo; o servidor nunca receberá esta coluna em texto aberto.
    CREATE TABLE sincronizacao_outbox (
      id                 TEXT PRIMARY KEY,
      dispositivo_id    TEXT NOT NULL,
      entidade           TEXT NOT NULL,
      entidade_id        TEXT NOT NULL,
      operacao           TEXT NOT NULL CHECK (operacao IN ('criar', 'atualizar', 'remover')),
      versao_base        INTEGER NOT NULL DEFAULT 0,
      payload_local      TEXT,
      tentativas         INTEGER NOT NULL DEFAULT 0,
      proxima_tentativa  TEXT,
      criado_em          TEXT NOT NULL,
      enviado_em         TEXT
    );
    CREATE INDEX idx_sync_outbox_pendente ON sincronizacao_outbox (enviado_em, proxima_tentativa, criado_em);

    CREATE TABLE sincronizacao_inbox (
      operacao_id      TEXT PRIMARY KEY,
      cursor_servidor  INTEGER NOT NULL UNIQUE,
      payload_cifrado  TEXT NOT NULL,
      recebido_em      TEXT NOT NULL,
      aplicado_em      TEXT
    );
    CREATE INDEX idx_sync_inbox_pendente ON sincronizacao_inbox (aplicado_em, cursor_servidor);
  `
}

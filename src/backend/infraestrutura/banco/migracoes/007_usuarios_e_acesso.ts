import type { Migracao } from '.'

export const migracao007: Migracao = {
  versao: 7,
  nome: 'usuarios_e_acesso',
  sql: `
    CREATE TABLE usuarios (
      id                 TEXT PRIMARY KEY,
      nome               TEXT    NOT NULL,
      email              TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      senha_hash         TEXT    NOT NULL,
      pessoa_id          TEXT    REFERENCES pessoas (id) ON DELETE SET NULL,
      tentativas_falhas  INTEGER NOT NULL DEFAULT 0,
      bloqueado_ate      TEXT,
      senha_alterada_em  TEXT    NOT NULL,
      ultimo_acesso_em   TEXT,
      criado_em          TEXT    NOT NULL
    );

    -- Só o resumo (SHA-256) do token fica salvo: quem copiar o banco não consegue entrar.
    CREATE TABLE sessoes (
      id            TEXT PRIMARY KEY,
      usuario_id    TEXT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
      token_resumo  TEXT NOT NULL UNIQUE,
      expira_em     TEXT NOT NULL,
      criado_em     TEXT NOT NULL
    );

    CREATE TABLE codigos_recuperacao (
      id             TEXT PRIMARY KEY,
      usuario_id     TEXT    NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
      codigo_resumo  TEXT    NOT NULL,
      tentativas     INTEGER NOT NULL DEFAULT 0,
      expira_em      TEXT    NOT NULL,
      usado_em       TEXT,
      criado_em      TEXT    NOT NULL
    );

    CREATE INDEX idx_codigos_recuperacao_usuario ON codigos_recuperacao (usuario_id, criado_em);
  `
}

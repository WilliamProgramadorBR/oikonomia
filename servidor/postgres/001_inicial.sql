-- Modelo central do Oikonomia. A API deve usar um usuário PostgreSQL sem privilégios de proprietário
-- e definir `SET LOCAL app.usuario_id = '<uuid>'` dentro de cada transação autenticada.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS oikonomia;
SET search_path TO oikonomia, public;

CREATE TABLE usuarios (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_normalizado  TEXT NOT NULL UNIQUE,
  nome               TEXT NOT NULL,
  situacao           TEXT NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'bloqueado', 'excluido')),
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE credenciais_senha (
  usuario_id          UUID PRIMARY KEY REFERENCES usuarios (id) ON DELETE CASCADE,
  senha_hash          TEXT NOT NULL,
  alterada_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  tentativas_falhas   INTEGER NOT NULL DEFAULT 0,
  bloqueado_ate       TIMESTAMPTZ
);

CREATE TABLE autenticadores_totp (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  segredo_cifrado   BYTEA NOT NULL,
  confirmado_em     TIMESTAMPTZ,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  revogado_em       TIMESTAMPTZ
);

CREATE TABLE codigos_recuperacao_mfa (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  codigo_resumo   BYTEA NOT NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  usado_em        TIMESTAMPTZ,
  UNIQUE (usuario_id, codigo_resumo)
);

CREATE TABLE familias (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           TEXT NOT NULL,
  criado_por     UUID NOT NULL REFERENCES usuarios (id),
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  excluido_em    TIMESTAMPTZ
);

CREATE TABLE familia_membros (
  familia_id     UUID NOT NULL REFERENCES familias (id) ON DELETE CASCADE,
  usuario_id     UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  papel          TEXT NOT NULL CHECK (papel IN ('proprietario', 'administrador', 'membro', 'leitura')),
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revogado_em    TIMESTAMPTZ,
  PRIMARY KEY (familia_id, usuario_id)
);

CREATE TABLE dispositivos (
  id                 UUID PRIMARY KEY,
  usuario_id         UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  nome               TEXT NOT NULL,
  plataforma         TEXT NOT NULL,
  chave_publica      BYTEA NOT NULL,
  situacao           TEXT NOT NULL DEFAULT 'pendente' CHECK (situacao IN ('pendente', 'ativo', 'revogado')),
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  aprovado_em        TIMESTAMPTZ,
  ultimo_acesso_em   TIMESTAMPTZ,
  revogado_em        TIMESTAMPTZ
);

-- Apenas o resumo do refresh token é persistido. Cada rotação cria um token novo e invalida o anterior.
CREATE TABLE sessoes_dispositivo (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id            UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  dispositivo_id        UUID NOT NULL REFERENCES dispositivos (id) ON DELETE CASCADE,
  refresh_token_resumo  BYTEA NOT NULL UNIQUE,
  familia_rotacao       UUID NOT NULL,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em             TIMESTAMPTZ NOT NULL,
  usado_em              TIMESTAMPTZ,
  revogado_em           TIMESTAMPTZ
);

-- O envelope contém a chave aleatória da família protegida pela frase do usuário. O servidor não
-- recebe a frase nem a chave aberta. Um envelope separado permite frases diferentes por membro.
CREATE TABLE familia_cofres_usuario (
  familia_id      UUID NOT NULL REFERENCES familias (id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  envelope_chave  TEXT NOT NULL,
  versao          INTEGER NOT NULL DEFAULT 1,
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (familia_id, usuario_id)
);

CREATE TABLE operacoes_sincronizacao (
  cursor_servidor   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id                UUID NOT NULL,
  familia_id        UUID NOT NULL REFERENCES familias (id) ON DELETE CASCADE,
  dispositivo_id    UUID NOT NULL REFERENCES dispositivos (id),
  entidade          TEXT NOT NULL,
  entidade_id       UUID NOT NULL,
  operacao          TEXT NOT NULL CHECK (operacao IN ('criar', 'atualizar', 'remover')),
  versao_base       BIGINT NOT NULL,
  payload_cifrado   TEXT NOT NULL,
  payload_resumo    BYTEA NOT NULL,
  assinatura        BYTEA NOT NULL,
  criado_cliente_em TIMESTAMPTZ NOT NULL,
  recebido_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (familia_id, id)
);
CREATE INDEX idx_operacoes_familia_cursor ON operacoes_sincronizacao (familia_id, cursor_servidor);
CREATE INDEX idx_operacoes_entidade ON operacoes_sincronizacao (familia_id, entidade, entidade_id, cursor_servidor);

CREATE TABLE snapshots_sincronizacao (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id       UUID NOT NULL REFERENCES familias (id) ON DELETE CASCADE,
  ate_cursor       BIGINT NOT NULL,
  payload_cifrado  TEXT NOT NULL,
  payload_resumo   BYTEA NOT NULL,
  dispositivo_id   UUID NOT NULL REFERENCES dispositivos (id),
  assinatura       BYTEA NOT NULL,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (familia_id, ate_cursor)
);

CREATE TABLE auditoria_seguranca (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id      UUID REFERENCES usuarios (id) ON DELETE SET NULL,
  dispositivo_id  UUID REFERENCES dispositivos (id) ON DELETE SET NULL,
  evento          TEXT NOT NULL,
  ip_resumo       BYTEA,
  detalhes        JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION usuario_atual() RETURNS UUID
LANGUAGE SQL STABLE AS $$
  SELECT NULLIF(current_setting('app.usuario_id', true), '')::uuid
$$;

ALTER TABLE familias ENABLE ROW LEVEL SECURITY;
ALTER TABLE familias FORCE ROW LEVEL SECURITY;
CREATE POLICY familias_do_usuario ON familias
  USING (EXISTS (
    SELECT 1 FROM familia_membros m
    WHERE m.familia_id = familias.id AND m.usuario_id = usuario_atual() AND m.revogado_em IS NULL
  ));

ALTER TABLE operacoes_sincronizacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE operacoes_sincronizacao FORCE ROW LEVEL SECURITY;
CREATE POLICY operacoes_da_familia ON operacoes_sincronizacao
  USING (EXISTS (
    SELECT 1 FROM familia_membros m
    WHERE m.familia_id = operacoes_sincronizacao.familia_id
      AND m.usuario_id = usuario_atual() AND m.revogado_em IS NULL
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM familia_membros m
    WHERE m.familia_id = operacoes_sincronizacao.familia_id
      AND m.usuario_id = usuario_atual() AND m.revogado_em IS NULL AND m.papel <> 'leitura'
  ));

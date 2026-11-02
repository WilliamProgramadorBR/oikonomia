import type { Migracao } from '.'

const AGORA = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`

// [id, nome, tipo, cor, icone]
const CATEGORIAS_PADRAO: [string, string, string, string, string][] = [
  ['cat-moradia', 'Moradia', 'despesa', '#6366f1', 'moradia'],
  ['cat-mercado', 'Mercado', 'despesa', '#10b981', 'mercado'],
  ['cat-alimentacao', 'Alimentação', 'despesa', '#f59e0b', 'alimentacao'],
  ['cat-transporte', 'Transporte', 'despesa', '#0ea5e9', 'transporte'],
  ['cat-saude', 'Saúde', 'despesa', '#ef4444', 'saude'],
  ['cat-educacao', 'Educação', 'despesa', '#8b5cf6', 'educacao'],
  ['cat-lazer', 'Lazer', 'despesa', '#ec4899', 'lazer'],
  ['cat-compras', 'Compras', 'despesa', '#f97316', 'compras'],
  ['cat-assinaturas', 'Assinaturas', 'despesa', '#14b8a6', 'assinaturas'],
  ['cat-contas', 'Contas e serviços', 'despesa', '#64748b', 'contas'],
  ['cat-pets', 'Pets', 'despesa', '#a16207', 'pets'],
  ['cat-outros-despesa', 'Outros', 'despesa', '#94a3b8', 'outros'],
  ['cat-salario', 'Salário', 'receita', '#22c55e', 'salario'],
  ['cat-freelance', 'Freelance', 'receita', '#06b6d4', 'freelance'],
  ['cat-investimentos', 'Rendimentos', 'receita', '#84cc16', 'investimentos'],
  ['cat-outros-receita', 'Outras receitas', 'receita', '#a3a3a3', 'presente']
]

export const migracao002: Migracao = {
  versao: 2,
  nome: 'familia_e_categorias',
  sql: `
    CREATE TABLE pessoas (
      id        TEXT PRIMARY KEY,
      nome      TEXT NOT NULL,
      cor       TEXT NOT NULL,
      criado_em TEXT NOT NULL
    );

    CREATE TABLE categorias (
      id        TEXT PRIMARY KEY,
      nome      TEXT NOT NULL,
      tipo      TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
      cor       TEXT NOT NULL,
      icone     TEXT NOT NULL,
      criado_em TEXT NOT NULL
    );

    ALTER TABLE transacoes ADD COLUMN pessoa_id TEXT REFERENCES pessoas (id);
    ALTER TABLE transacoes ADD COLUMN categoria_id TEXT REFERENCES categorias (id);
    ALTER TABLE transacoes ADD COLUMN estabelecimento TEXT;

    CREATE INDEX idx_transacoes_pessoa ON transacoes (pessoa_id);
    CREATE INDEX idx_transacoes_categoria ON transacoes (categoria_id);

    INSERT INTO categorias (id, nome, tipo, cor, icone, criado_em) VALUES
    ${CATEGORIAS_PADRAO.map(
      ([id, nome, tipo, cor, icone]) => `('${id}', '${nome}', '${tipo}', '${cor}', '${icone}', ${AGORA})`
    ).join(',\n    ')};
  `
}

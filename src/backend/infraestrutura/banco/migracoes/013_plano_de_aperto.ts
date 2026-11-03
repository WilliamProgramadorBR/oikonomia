import type { Migracao } from '.'

// Plano de aperto: as ofertas que a pessoa recebeu (parcelamentos, empréstimos, prazos) para comparar pelo custo real.
export const migracao013: Migracao = {
  versao: 13,
  nome: 'plano_de_aperto',
  sql: `
    CREATE TABLE aperto_ofertas (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      grupo TEXT,
      valor_centavos INTEGER NOT NULL,
      parcelas INTEGER NOT NULL,
      parcela_centavos INTEGER NOT NULL,
      primeira_parcela_em_meses INTEGER NOT NULL,
      saldo_substituido_centavos INTEGER NOT NULL DEFAULT 0,
      parcela_substituida_centavos INTEGER NOT NULL DEFAULT 0,
      parcelas_substituidas_restantes INTEGER NOT NULL DEFAULT 0,
      situacao TEXT NOT NULL DEFAULT 'avaliando',
      motivo TEXT,
      criado_em TEXT NOT NULL
    );
  `
}

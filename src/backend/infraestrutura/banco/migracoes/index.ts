import type { BancoDeDados } from '../conexao'
import { emTransacao } from '../transacao'
import { migracao001 } from './001_criar_transacoes'
import { migracao002 } from './002_familia_e_categorias'
import { migracao003 } from './003_cartoes_e_taxas'
import { migracao004 } from './004_recorrencias_e_previsoes'
import { migracao005 } from './005_objetivos'
import { migracao006 } from './006_dividas'
import { migracao007 } from './007_usuarios_e_acesso'
import { migracao008 } from './008_lancamentos_da_casa'
import { migracao009 } from './009_ajustes_de_ocorrencia'
import { migracao010 } from './010_contas_e_extratos'
import { migracao011 } from './011_conta_das_recorrentes'
import { migracao012 } from './012_open_finance'

export interface Migracao {
  versao: number
  nome: string
  sql: string
}

// Para criar uma nova migração: crie o arquivo 00X_nome.ts e adicione-o aqui, em ordem.
const MIGRACOES: Migracao[] = [migracao001, migracao002, migracao003, migracao004, migracao005, migracao006, migracao007, migracao008, migracao009, migracao010, migracao011, migracao012]

export function executarMigracoes(banco: BancoDeDados): void {
  banco.exec(`
    CREATE TABLE IF NOT EXISTS migracoes (
      versao       INTEGER PRIMARY KEY,
      nome         TEXT NOT NULL,
      aplicada_em  TEXT NOT NULL
    )
  `)

  const linha = banco.prepare('SELECT MAX(versao) AS versao FROM migracoes').get() as
    | { versao: number | null }
    | undefined
  const versaoAtual = linha?.versao ?? 0
  const pendentes = MIGRACOES.filter((m) => m.versao > versaoAtual)
  if (pendentes.length === 0) return

  const registrar = banco.prepare(
    'INSERT INTO migracoes (versao, nome, aplicada_em) VALUES (?, ?, ?)'
  )

  // Procedimento recomendado pelo SQLite para recriar tabelas: chaves estrangeiras desligadas
  // durante as migrações (precisa ser fora de transação) e verificação de integridade no fim.
  banco.exec('PRAGMA foreign_keys = OFF')
  try {
    for (const migracao of pendentes) {
      emTransacao(banco, () => {
        banco.exec(migracao.sql)
        registrar.run(migracao.versao, migracao.nome, new Date().toISOString())
      })
    }
    const violacoes = banco.prepare('PRAGMA foreign_key_check').all()
    if (violacoes.length > 0) {
      throw new Error(`Migração deixou ${violacoes.length} referência(s) quebrada(s).`)
    }
  } finally {
    banco.exec('PRAGMA foreign_keys = ON')
  }
}

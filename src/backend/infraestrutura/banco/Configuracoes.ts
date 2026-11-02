import type { BancoDeDados } from './conexao'

// Acesso à tabela chave/valor `configuracoes`, compartilhado pelos repositórios.
export class ConfiguracoesSqlite {
  constructor(private readonly banco: BancoDeDados) {}

  ler(chave: string): string | null {
    const linha = this.banco.prepare('SELECT valor FROM configuracoes WHERE chave = ?').get(chave) as
      | { valor: string }
      | undefined
    return linha?.valor ?? null
  }

  gravar(chave: string, valor: string): void {
    this.banco.prepare('INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)').run(chave, valor)
  }

  remover(chave: string): void {
    this.banco.prepare('DELETE FROM configuracoes WHERE chave = ?').run(chave)
  }
}

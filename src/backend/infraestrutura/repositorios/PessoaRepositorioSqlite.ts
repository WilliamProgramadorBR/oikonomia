import { Pessoa } from '../../dominio/entidades/Pessoa'
import type { IPessoaRepositorio } from '../../dominio/repositorios/IPessoaRepositorio'
import type { BancoDeDados } from '../banco/conexao'

interface LinhaPessoa {
  id: string
  nome: string
  cor: string
  criado_em: string
}

export class PessoaRepositorioSqlite implements IPessoaRepositorio {
  constructor(private readonly banco: BancoDeDados) {}

  async salvar(pessoa: Pessoa): Promise<void> {
    this.banco
      .prepare(
        `INSERT INTO pessoas (id, nome, cor, criado_em) VALUES (@id, @nome, @cor, @criado_em)
         ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, cor = excluded.cor`
      )
      .run({
        id: pessoa.id,
        nome: pessoa.nome,
        cor: pessoa.cor,
        criado_em: pessoa.criadoEm.toISOString()
      })
  }

  async listar(): Promise<Pessoa[]> {
    const linhas = this.banco
      .prepare('SELECT * FROM pessoas ORDER BY criado_em')
      .all() as unknown as LinhaPessoa[]
    return linhas.map((linha) => this.paraEntidade(linha))
  }

  async buscarPorId(id: string): Promise<Pessoa | null> {
    const linha = this.banco.prepare('SELECT * FROM pessoas WHERE id = ?').get(id) as unknown as
      | LinhaPessoa
      | undefined
    return linha ? this.paraEntidade(linha) : null
  }

  async remover(id: string): Promise<void> {
    this.banco.prepare('DELETE FROM pessoas WHERE id = ?').run(id)
  }

  private paraEntidade(linha: LinhaPessoa): Pessoa {
    return Pessoa.restaurar({
      id: linha.id,
      nome: linha.nome,
      cor: linha.cor,
      criadoEm: new Date(linha.criado_em)
    })
  }
}

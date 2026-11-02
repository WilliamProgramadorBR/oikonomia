import { Categoria, type NaturezaDespesa } from '../../dominio/entidades/Categoria'
import type { TipoTransacao } from '../../dominio/entidades/Transacao'
import type { ICategoriaRepositorio } from '../../dominio/repositorios/ICategoriaRepositorio'
import type { BancoDeDados } from '../banco/conexao'

interface LinhaCategoria {
  id: string
  nome: string
  tipo: TipoTransacao
  natureza: NaturezaDespesa | null
  cor: string
  icone: string
  criado_em: string
}

export class CategoriaRepositorioSqlite implements ICategoriaRepositorio {
  constructor(private readonly banco: BancoDeDados) {}

  async salvar(categoria: Categoria): Promise<void> {
    this.banco
      .prepare(
        `INSERT INTO categorias (id, nome, tipo, natureza, cor, icone, criado_em)
         VALUES (@id, @nome, @tipo, @natureza, @cor, @icone, @criado_em)
         ON CONFLICT(id) DO UPDATE SET
           nome = excluded.nome, tipo = excluded.tipo, natureza = excluded.natureza,
           cor = excluded.cor, icone = excluded.icone`
      )
      .run({
        id: categoria.id,
        nome: categoria.nome,
        tipo: categoria.tipo,
        natureza: categoria.natureza,
        cor: categoria.cor,
        icone: categoria.icone,
        criado_em: categoria.criadoEm.toISOString()
      })
  }

  async listar(): Promise<Categoria[]> {
    const linhas = this.banco
      .prepare(
        `SELECT * FROM categorias
         ORDER BY CASE tipo WHEN 'despesa' THEN 0 WHEN 'receita' THEN 1 ELSE 2 END, nome`
      )
      .all() as unknown as LinhaCategoria[]
    return linhas.map((linha) => this.paraEntidade(linha))
  }

  async buscarPorId(id: string): Promise<Categoria | null> {
    const linha = this.banco.prepare('SELECT * FROM categorias WHERE id = ?').get(id) as unknown as
      | LinhaCategoria
      | undefined
    return linha ? this.paraEntidade(linha) : null
  }

  async remover(id: string): Promise<void> {
    this.banco.prepare('DELETE FROM categorias WHERE id = ?').run(id)
  }

  private paraEntidade(linha: LinhaCategoria): Categoria {
    return Categoria.restaurar({
      id: linha.id,
      nome: linha.nome,
      tipo: linha.tipo,
      natureza: linha.natureza,
      cor: linha.cor,
      icone: linha.icone,
      criadoEm: new Date(linha.criado_em)
    })
  }
}

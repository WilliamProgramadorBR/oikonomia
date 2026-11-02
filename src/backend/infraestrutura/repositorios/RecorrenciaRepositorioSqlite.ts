import { Recorrencia } from '../../dominio/entidades/Recorrencia'
import type { TipoTransacao } from '../../dominio/entidades/Transacao'
import type { IRecorrenciaRepositorio } from '../../dominio/repositorios/IRecorrenciaRepositorio'
import type { BancoDeDados } from '../banco/conexao'

interface LinhaRecorrencia {
  id: string
  descricao: string
  tipo: TipoTransacao
  valor_variavel: number
  valor_centavos: number
  dia_do_mes: number
  categoria_id: string
  pessoa_id: string | null
  cartao_id: string | null
  inicio: string
  fim: string | null
  objetivo_id: string | null
  divida_id: string | null
  criado_em: string
}

export class RecorrenciaRepositorioSqlite implements IRecorrenciaRepositorio {
  constructor(private readonly banco: BancoDeDados) {}

  async salvar(recorrencia: Recorrencia): Promise<void> {
    this.banco
      .prepare(
        `INSERT INTO recorrencias
           (id, descricao, tipo, valor_variavel, valor_centavos, dia_do_mes, categoria_id,
            pessoa_id, cartao_id, inicio, fim, objetivo_id, divida_id, criado_em)
         VALUES
           (@id, @descricao, @tipo, @valor_variavel, @valor_centavos, @dia_do_mes, @categoria_id,
            @pessoa_id, @cartao_id, @inicio, @fim, @objetivo_id, @divida_id, @criado_em)
         ON CONFLICT(id) DO UPDATE SET
           descricao = excluded.descricao,
           valor_variavel = excluded.valor_variavel,
           valor_centavos = excluded.valor_centavos,
           dia_do_mes = excluded.dia_do_mes,
           categoria_id = excluded.categoria_id,
           pessoa_id = excluded.pessoa_id,
           cartao_id = excluded.cartao_id,
           fim = excluded.fim,
           objetivo_id = excluded.objetivo_id,
           divida_id = excluded.divida_id`
      )
      .run({
        id: recorrencia.id,
        descricao: recorrencia.descricao,
        tipo: recorrencia.tipo,
        valor_variavel: recorrencia.valorVariavel ? 1 : 0,
        valor_centavos: recorrencia.valorCentavos,
        dia_do_mes: recorrencia.diaDoMes,
        categoria_id: recorrencia.categoriaId,
        pessoa_id: recorrencia.pessoaId,
        cartao_id: recorrencia.cartaoId,
        inicio: recorrencia.inicio,
        fim: recorrencia.fim,
        objetivo_id: recorrencia.objetivoId,
        divida_id: recorrencia.dividaId,
        criado_em: recorrencia.criadoEm.toISOString()
      })
  }

  async listar(): Promise<Recorrencia[]> {
    const linhas = this.banco
      .prepare('SELECT * FROM recorrencias ORDER BY dia_do_mes, descricao')
      .all() as unknown as LinhaRecorrencia[]
    return linhas.map((linha) => this.paraEntidade(linha))
  }

  async buscarPorId(id: string): Promise<Recorrencia | null> {
    const linha = this.banco.prepare('SELECT * FROM recorrencias WHERE id = ?').get(id) as unknown as
      | LinhaRecorrencia
      | undefined
    return linha ? this.paraEntidade(linha) : null
  }

  async existeComCategoria(categoriaId: string): Promise<boolean> {
    return !!this.banco
      .prepare('SELECT 1 FROM recorrencias WHERE categoria_id = ? LIMIT 1')
      .get(categoriaId)
  }

  async existeComPessoa(pessoaId: string): Promise<boolean> {
    return !!this.banco.prepare('SELECT 1 FROM recorrencias WHERE pessoa_id = ? LIMIT 1').get(pessoaId)
  }

  private paraEntidade(linha: LinhaRecorrencia): Recorrencia {
    return Recorrencia.restaurar({
      id: linha.id,
      descricao: linha.descricao,
      tipo: linha.tipo,
      valorVariavel: linha.valor_variavel === 1,
      valorCentavos: linha.valor_centavos,
      diaDoMes: linha.dia_do_mes,
      categoriaId: linha.categoria_id,
      pessoaId: linha.pessoa_id,
      cartaoId: linha.cartao_id,
      inicio: linha.inicio,
      fim: linha.fim,
      objetivoId: linha.objetivo_id,
      dividaId: linha.divida_id,
      criadoEm: new Date(linha.criado_em)
    })
  }
}

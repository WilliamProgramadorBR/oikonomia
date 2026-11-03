import {
  Transacao,
  type StatusTransacao,
  type TipoTransacao
} from '../../dominio/entidades/Transacao'
import type {
  FiltroListagemTransacoes,
  ITransacaoRepositorio
} from '../../dominio/repositorios/ITransacaoRepositorio'
import type { BancoDeDados } from '../banco/conexao'

interface LinhaTransacao {
  id: string
  descricao: string
  valor_centavos: number
  tipo: TipoTransacao
  status: StatusTransacao
  data: string
  pessoa_id: string | null
  categoria_id: string
  estabelecimento: string | null
  cartao_id: string | null
  compra_id: string | null
  parcela_numero: number | null
  parcela_total: number | null
  recorrencia_id: string | null
  recorrencia_competencia: string | null
  objetivo_id: string | null
  criado_em: string
  ajuste: string | null
}

export class TransacaoRepositorioSqlite implements ITransacaoRepositorio {
  constructor(private readonly banco: BancoDeDados) {}

  async salvar(transacao: Transacao): Promise<void> {
    this.salvarSincrono(transacao)
  }

  // Versão síncrona, para ser usada dentro de transações do banco (ver CompraCartaoRepositorioSqlite).
  salvarSincrono(transacao: Transacao): void {
    this.banco
      .prepare(
        `INSERT INTO transacoes
           (id, descricao, valor_centavos, tipo, status, data, pessoa_id, categoria_id, estabelecimento,
            cartao_id, compra_id, parcela_numero, parcela_total, recorrencia_id, recorrencia_competencia,
            objetivo_id, ajuste, criado_em)
         VALUES
           (@id, @descricao, @valor_centavos, @tipo, @status, @data, @pessoa_id, @categoria_id, @estabelecimento,
            @cartao_id, @compra_id, @parcela_numero, @parcela_total, @recorrencia_id, @recorrencia_competencia,
            @objetivo_id, @ajuste, @criado_em)
         ON CONFLICT(id) DO UPDATE SET
           descricao = excluded.descricao,
           valor_centavos = excluded.valor_centavos,
           tipo = excluded.tipo,
           status = excluded.status,
           data = excluded.data,
           pessoa_id = excluded.pessoa_id,
           categoria_id = excluded.categoria_id,
           estabelecimento = excluded.estabelecimento,
           cartao_id = excluded.cartao_id,
           objetivo_id = excluded.objetivo_id,
           ajuste = excluded.ajuste`
      )
      .run({ ...this.paraLinha(transacao) })
  }

  async listar(filtro: FiltroListagemTransacoes = {}): Promise<Transacao[]> {
    const condicoes: string[] = []
    const parametros: Record<string, string> = {}

    if (filtro.pessoaId) {
      condicoes.push('pessoa_id = @pessoaId')
      parametros.pessoaId = filtro.pessoaId
    }
    if (filtro.inicio) {
      condicoes.push('data >= @inicio')
      parametros.inicio = filtro.inicio
    }
    if (filtro.fim) {
      condicoes.push('data <= @fim')
      parametros.fim = filtro.fim
    }
    if (filtro.recorrenciaId) {
      condicoes.push('recorrencia_id = @recorrenciaId')
      parametros.recorrenciaId = filtro.recorrenciaId
    }
    if (filtro.somenteCartao) condicoes.push('cartao_id IS NOT NULL')
    if (filtro.somenteObjetivos) condicoes.push('objetivo_id IS NOT NULL')
    if (!filtro.incluirIgnoradas) condicoes.push("status <> 'ignorada'")

    const onde = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
    const linhas = this.banco
      .prepare(`SELECT * FROM transacoes ${onde} ORDER BY data DESC, criado_em DESC`)
      .all(parametros) as unknown as LinhaTransacao[]
    return linhas.map((linha) => this.paraEntidade(linha))
  }

  async buscarPorId(id: string): Promise<Transacao | null> {
    const linha = this.banco.prepare('SELECT * FROM transacoes WHERE id = ?').get(id) as unknown as
      | LinhaTransacao
      | undefined
    return linha ? this.paraEntidade(linha) : null
  }

  async remover(id: string): Promise<void> {
    this.banco.prepare('DELETE FROM transacoes WHERE id = ?').run(id)
  }

  async removerPrevistasDesde(recorrenciaId: string, competencia: string): Promise<void> {
    this.banco
      .prepare(
        `DELETE FROM transacoes
         WHERE recorrencia_id = ? AND recorrencia_competencia >= ? AND status <> 'confirmada'`
      )
      .run(recorrenciaId, competencia)
  }

  async existeComPessoa(pessoaId: string): Promise<boolean> {
    return !!this.banco.prepare('SELECT 1 FROM transacoes WHERE pessoa_id = ? LIMIT 1').get(pessoaId)
  }

  async existeComCategoria(categoriaId: string): Promise<boolean> {
    return !!this.banco
      .prepare('SELECT 1 FROM transacoes WHERE categoria_id = ? LIMIT 1')
      .get(categoriaId)
  }

  private paraLinha(transacao: Transacao): LinhaTransacao {
    return {
      id: transacao.id,
      descricao: transacao.descricao,
      valor_centavos: transacao.valorCentavos,
      tipo: transacao.tipo,
      status: transacao.status,
      data: transacao.data.toISOString().slice(0, 10),
      pessoa_id: transacao.pessoaId,
      categoria_id: transacao.categoriaId,
      estabelecimento: transacao.estabelecimento,
      cartao_id: transacao.cartaoId,
      compra_id: transacao.parcela?.compraId ?? null,
      parcela_numero: transacao.parcela?.numero ?? null,
      parcela_total: transacao.parcela?.total ?? null,
      recorrencia_id: transacao.recorrencia?.recorrenciaId ?? null,
      recorrencia_competencia: transacao.recorrencia?.competencia ?? null,
      objetivo_id: transacao.objetivoId,
      ajuste: transacao.ajuste,
      criado_em: transacao.criadoEm.toISOString()
    }
  }

  private paraEntidade(linha: LinhaTransacao): Transacao {
    return Transacao.restaurar({
      id: linha.id,
      descricao: linha.descricao,
      valorCentavos: linha.valor_centavos,
      tipo: linha.tipo,
      status: linha.status,
      data: new Date(`${linha.data}T00:00:00Z`),
      pessoaId: linha.pessoa_id,
      categoriaId: linha.categoria_id,
      estabelecimento: linha.estabelecimento,
      cartaoId: linha.cartao_id,
      parcela: linha.compra_id
        ? {
            compraId: linha.compra_id,
            numero: linha.parcela_numero ?? 1,
            total: linha.parcela_total ?? 1
          }
        : null,
      recorrencia:
        linha.recorrencia_id && linha.recorrencia_competencia
          ? { recorrenciaId: linha.recorrencia_id, competencia: linha.recorrencia_competencia }
          : null,
      objetivoId: linha.objetivo_id,
      ajuste: linha.ajuste,
      criadoEm: new Date(linha.criado_em)
    })
  }
}

import { CompraCartao } from '../../dominio/entidades/CompraCartao'
import type { Transacao } from '../../dominio/entidades/Transacao'
import type { ICompraCartaoRepositorio } from '../../dominio/repositorios/ICompraCartaoRepositorio'
import type { BancoDeDados } from '../banco/conexao'
import { emTransacao } from '../banco/transacao'
import type { TransacaoRepositorioSqlite } from './TransacaoRepositorioSqlite'

interface LinhaCompra {
  id: string
  cartao_id: string
  descricao: string
  valor_centavos: number
  quantidade_parcelas: number
  taxa_mensal: number
  data_compra: string
  categoria_id: string
  pessoa_id: string | null
  estabelecimento: string | null
  criado_em: string
}

export class CompraCartaoRepositorioSqlite implements ICompraCartaoRepositorio {
  constructor(
    private readonly banco: BancoDeDados,
    private readonly transacoes: TransacaoRepositorioSqlite
  ) {}

  async salvar(compra: CompraCartao, parcelas: Transacao[]): Promise<void> {
    emTransacao(this.banco, () => {
      this.banco
        .prepare(
          `INSERT INTO compras_cartao
             (id, cartao_id, descricao, valor_centavos, quantidade_parcelas, taxa_mensal,
              data_compra, categoria_id, pessoa_id, estabelecimento, criado_em)
           VALUES
             (@id, @cartao_id, @descricao, @valor_centavos, @quantidade_parcelas, @taxa_mensal,
              @data_compra, @categoria_id, @pessoa_id, @estabelecimento, @criado_em)`
        )
        .run({
          id: compra.id,
          cartao_id: compra.cartaoId,
          descricao: compra.descricao,
          valor_centavos: compra.valorCentavos,
          quantidade_parcelas: compra.quantidadeParcelas,
          taxa_mensal: compra.taxaMensal,
          data_compra: compra.dataCompra.toISOString().slice(0, 10),
          categoria_id: compra.categoriaId,
          pessoa_id: compra.pessoaId,
          estabelecimento: compra.estabelecimento,
          criado_em: compra.criadoEm.toISOString()
        })
      for (const parcela of parcelas) this.transacoes.salvarSincrono(parcela)
    })
  }

  async listar(): Promise<CompraCartao[]> {
    const linhas = this.banco
      .prepare('SELECT * FROM compras_cartao ORDER BY data_compra DESC, criado_em DESC')
      .all() as unknown as LinhaCompra[]
    return linhas.map((linha) => this.paraEntidade(linha))
  }

  async buscarPorId(id: string): Promise<CompraCartao | null> {
    const linha = this.banco
      .prepare('SELECT * FROM compras_cartao WHERE id = ?')
      .get(id) as unknown as LinhaCompra | undefined
    return linha ? this.paraEntidade(linha) : null
  }

  async remover(id: string): Promise<void> {
    emTransacao(this.banco, () => {
      this.banco.prepare('DELETE FROM transacoes WHERE compra_id = ?').run(id)
      this.banco.prepare('DELETE FROM compras_cartao WHERE id = ?').run(id)
    })
  }

  async existeNoCartao(cartaoId: string): Promise<boolean> {
    return !!this.banco
      .prepare('SELECT 1 FROM compras_cartao WHERE cartao_id = ? LIMIT 1')
      .get(cartaoId)
  }

  private paraEntidade(linha: LinhaCompra): CompraCartao {
    return CompraCartao.restaurar({
      id: linha.id,
      cartaoId: linha.cartao_id,
      descricao: linha.descricao,
      valorCentavos: linha.valor_centavos,
      quantidadeParcelas: linha.quantidade_parcelas,
      taxaMensal: linha.taxa_mensal,
      dataCompra: new Date(`${linha.data_compra}T00:00:00Z`),
      categoriaId: linha.categoria_id,
      pessoaId: linha.pessoa_id,
      estabelecimento: linha.estabelecimento,
      criadoEm: new Date(linha.criado_em)
    })
  }
}

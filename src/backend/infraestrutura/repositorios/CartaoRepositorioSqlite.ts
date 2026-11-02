import { Cartao } from '../../dominio/entidades/Cartao'
import type { ICartaoRepositorio } from '../../dominio/repositorios/ICartaoRepositorio'
import type { BancoDeDados } from '../banco/conexao'

interface LinhaCartao {
  id: string
  apelido: string
  instituicao: string
  cnpj8: string | null
  limite_centavos: number
  dia_fechamento: number
  dia_vencimento: number
  pessoa_id: string
  cor: string
  taxa_contrato_mensal: number | null
  criado_em: string
}

export class CartaoRepositorioSqlite implements ICartaoRepositorio {
  constructor(private readonly banco: BancoDeDados) {}

  async salvar(cartao: Cartao): Promise<void> {
    this.banco
      .prepare(
        `INSERT INTO cartoes
           (id, apelido, instituicao, cnpj8, limite_centavos, dia_fechamento, dia_vencimento,
            pessoa_id, cor, taxa_contrato_mensal, criado_em)
         VALUES
           (@id, @apelido, @instituicao, @cnpj8, @limite_centavos, @dia_fechamento, @dia_vencimento,
            @pessoa_id, @cor, @taxa_contrato_mensal, @criado_em)
         ON CONFLICT(id) DO UPDATE SET
           apelido = excluded.apelido,
           instituicao = excluded.instituicao,
           cnpj8 = excluded.cnpj8,
           limite_centavos = excluded.limite_centavos,
           dia_fechamento = excluded.dia_fechamento,
           dia_vencimento = excluded.dia_vencimento,
           pessoa_id = excluded.pessoa_id,
           cor = excluded.cor,
           taxa_contrato_mensal = excluded.taxa_contrato_mensal`
      )
      .run({
        id: cartao.id,
        apelido: cartao.apelido,
        instituicao: cartao.instituicao,
        cnpj8: cartao.cnpj8,
        limite_centavos: cartao.limiteCentavos,
        dia_fechamento: cartao.diaFechamento,
        dia_vencimento: cartao.diaVencimento,
        pessoa_id: cartao.pessoaId,
        cor: cartao.cor,
        taxa_contrato_mensal: cartao.taxaContratoMensal,
        criado_em: cartao.criadoEm.toISOString()
      })
  }

  async listar(): Promise<Cartao[]> {
    const linhas = this.banco
      .prepare('SELECT * FROM cartoes ORDER BY criado_em')
      .all() as unknown as LinhaCartao[]
    return linhas.map((linha) => this.paraEntidade(linha))
  }

  async buscarPorId(id: string): Promise<Cartao | null> {
    const linha = this.banco.prepare('SELECT * FROM cartoes WHERE id = ?').get(id) as unknown as
      | LinhaCartao
      | undefined
    return linha ? this.paraEntidade(linha) : null
  }

  async remover(id: string): Promise<void> {
    this.banco.prepare('DELETE FROM cartoes WHERE id = ?').run(id)
  }

  private paraEntidade(linha: LinhaCartao): Cartao {
    return Cartao.restaurar({
      id: linha.id,
      apelido: linha.apelido,
      instituicao: linha.instituicao,
      cnpj8: linha.cnpj8,
      limiteCentavos: linha.limite_centavos,
      diaFechamento: linha.dia_fechamento,
      diaVencimento: linha.dia_vencimento,
      pessoaId: linha.pessoa_id,
      cor: linha.cor,
      taxaContratoMensal: linha.taxa_contrato_mensal,
      criadoEm: new Date(linha.criado_em)
    })
  }
}

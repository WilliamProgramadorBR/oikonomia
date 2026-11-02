import { Divida, type TipoDivida } from '../../dominio/entidades/Divida'
import type { IDividaRepositorio } from '../../dominio/repositorios/IDividaRepositorio'
import type { BancoDeDados } from '../banco/conexao'
import { emTransacao } from '../banco/transacao'

interface LinhaDivida {
  id: string
  nome: string
  tipo: TipoDivida
  credor: string
  cnpj8: string | null
  taxa_mensal: number
  parcela_centavos: number
  parcelas_totais: number
  saldo_inicial_centavos: number
  dia_vencimento: number
  pessoa_id: string
  criado_em: string
}

export class DividaRepositorioSqlite implements IDividaRepositorio {
  constructor(private readonly banco: BancoDeDados) {}

  async salvar(divida: Divida): Promise<void> {
    this.banco
      .prepare(
        `INSERT OR REPLACE INTO dividas
           (id, nome, tipo, credor, cnpj8, taxa_mensal, parcela_centavos, parcelas_totais,
            saldo_inicial_centavos, dia_vencimento, pessoa_id, criado_em)
         VALUES
           (@id, @nome, @tipo, @credor, @cnpj8, @taxa_mensal, @parcela_centavos, @parcelas_totais,
            @saldo_inicial_centavos, @dia_vencimento, @pessoa_id, @criado_em)`
      )
      .run({
        id: divida.id,
        nome: divida.nome,
        tipo: divida.tipo,
        credor: divida.credor,
        cnpj8: divida.cnpj8,
        taxa_mensal: divida.taxaMensal,
        parcela_centavos: divida.parcelaCentavos,
        parcelas_totais: divida.parcelasTotais,
        saldo_inicial_centavos: divida.saldoInicialCentavos,
        dia_vencimento: divida.diaVencimento,
        pessoa_id: divida.pessoaId,
        criado_em: divida.criadoEm.toISOString()
      })
  }

  async listar(): Promise<Divida[]> {
    const linhas = this.banco
      .prepare('SELECT * FROM dividas ORDER BY taxa_mensal DESC')
      .all() as unknown as LinhaDivida[]
    return linhas.map((linha) => this.paraEntidade(linha))
  }

  async buscarPorId(id: string): Promise<Divida | null> {
    const linha = this.banco.prepare('SELECT * FROM dividas WHERE id = ?').get(id) as unknown as
      | LinhaDivida
      | undefined
    return linha ? this.paraEntidade(linha) : null
  }

  async remover(id: string): Promise<void> {
    emTransacao(this.banco, () => {
      this.banco.prepare('UPDATE recorrencias SET divida_id = NULL WHERE divida_id = ?').run(id)
      this.banco.prepare('DELETE FROM dividas WHERE id = ?').run(id)
    })
  }

  private paraEntidade(linha: LinhaDivida): Divida {
    return Divida.restaurar({
      id: linha.id,
      nome: linha.nome,
      tipo: linha.tipo,
      credor: linha.credor,
      cnpj8: linha.cnpj8,
      taxaMensal: linha.taxa_mensal,
      parcelaCentavos: linha.parcela_centavos,
      parcelasTotais: linha.parcelas_totais,
      saldoInicialCentavos: linha.saldo_inicial_centavos,
      diaVencimento: linha.dia_vencimento,
      pessoaId: linha.pessoa_id,
      criadoEm: new Date(linha.criado_em)
    })
  }
}

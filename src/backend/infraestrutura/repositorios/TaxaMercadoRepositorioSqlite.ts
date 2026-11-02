import type {
  LoteTaxasMercado,
  ModalidadeCredito,
  TaxaMercado
} from '../../dominio/entidades/TaxaMercado'
import type {
  ITaxaMercadoRepositorio,
  SituacaoTaxas
} from '../../dominio/repositorios/ITaxaMercadoRepositorio'
import { ConfiguracoesSqlite } from '../banco/Configuracoes'
import type { BancoDeDados } from '../banco/conexao'
import { emTransacao } from '../banco/transacao'

interface LinhaTaxa {
  cnpj8: string
  instituicao: string
  modalidade: ModalidadeCredito
  taxa_mensal: number
  taxa_anual: number
  posicao: number
}

const CHAVES = {
  inicio: 'taxas.inicio_periodo',
  fim: 'taxas.fim_periodo',
  atualizadoEm: 'taxas.atualizado_em'
}

export class TaxaMercadoRepositorioSqlite implements ITaxaMercadoRepositorio {
  private readonly configuracoes: ConfiguracoesSqlite

  constructor(private readonly banco: BancoDeDados) {
    this.configuracoes = new ConfiguracoesSqlite(banco)
  }

  async substituir(lote: LoteTaxasMercado): Promise<void> {
    emTransacao(this.banco, () => {
      this.banco.exec('DELETE FROM taxas_mercado')
      const inserir = this.banco.prepare(
        `INSERT OR REPLACE INTO taxas_mercado
           (cnpj8, instituicao, modalidade, taxa_mensal, taxa_anual, posicao)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      for (const t of lote.taxas) {
        inserir.run(t.cnpj8, t.instituicao, t.modalidade, t.taxaMensal, t.taxaAnual, t.posicao)
      }

      this.configuracoes.gravar(CHAVES.inicio, lote.inicioPeriodo)
      this.configuracoes.gravar(CHAVES.fim, lote.fimPeriodo)
      this.configuracoes.gravar(CHAVES.atualizadoEm, new Date().toISOString())
    })
  }

  async listar(modalidade?: ModalidadeCredito): Promise<TaxaMercado[]> {
    const sql = `SELECT * FROM taxas_mercado ${modalidade ? 'WHERE modalidade = ?' : ''}
                 ORDER BY modalidade, taxa_mensal`
    const consulta = this.banco.prepare(sql)
    const linhas = (modalidade ? consulta.all(modalidade) : consulta.all()) as unknown as LinhaTaxa[]
    return linhas.map((linha) => ({
      cnpj8: linha.cnpj8,
      instituicao: linha.instituicao,
      modalidade: linha.modalidade,
      taxaMensal: linha.taxa_mensal,
      taxaAnual: linha.taxa_anual,
      posicao: linha.posicao
    }))
  }

  async situacao(): Promise<SituacaoTaxas> {
    const ler = (chave: string) => this.configuracoes.ler(chave)
    const { quantidade } = this.banco
      .prepare('SELECT COUNT(*) AS quantidade FROM taxas_mercado')
      .get() as { quantidade: number }
    const atualizadoEm = ler(CHAVES.atualizadoEm)

    return {
      inicioPeriodo: ler(CHAVES.inicio),
      fimPeriodo: ler(CHAVES.fim),
      atualizadoEm: atualizadoEm ? new Date(atualizadoEm) : null,
      quantidade
    }
  }
}

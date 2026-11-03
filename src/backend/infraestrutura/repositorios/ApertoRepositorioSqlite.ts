import type { OfertaAperto, SituacaoOferta, TipoOferta } from '@compartilhado/dtos/aperto'
import type { IApertoRepositorio } from '../../dominio/repositorios/IApertoRepositorio'
import type { BancoDeDados } from '../banco/conexao'
import type { ConfiguracoesSqlite } from '../banco/Configuracoes'

interface LinhaOferta {
  id: string
  tipo: TipoOferta
  descricao: string
  grupo: string | null
  valor_centavos: number
  parcelas: number
  parcela_centavos: number
  primeira_parcela_em_meses: number
  saldo_substituido_centavos: number
  parcela_substituida_centavos: number
  parcelas_substituidas_restantes: number
  situacao: SituacaoOferta
  motivo: string | null
}

const CHAVE_PASSOS = 'aperto.passosFeitos'
const CHAVE_CAIXA = 'aperto.caixaExtra'

export class ApertoRepositorioSqlite implements IApertoRepositorio {
  constructor(
    private readonly banco: BancoDeDados,
    private readonly configuracoes: ConfiguracoesSqlite
  ) {}

  async listar(): Promise<OfertaAperto[]> {
    const linhas = this.banco.prepare('SELECT * FROM aperto_ofertas ORDER BY criado_em').all() as unknown as LinhaOferta[]
    return linhas.map((l) => ({
      id: l.id,
      tipo: l.tipo,
      descricao: l.descricao,
      grupo: l.grupo,
      valorCentavos: l.valor_centavos,
      parcelas: l.parcelas,
      parcelaCentavos: l.parcela_centavos,
      primeiraParcelaEmMeses: l.primeira_parcela_em_meses,
      saldoSubstituidoCentavos: l.saldo_substituido_centavos,
      parcelaSubstituidaCentavos: l.parcela_substituida_centavos,
      parcelasSubstituidasRestantes: l.parcelas_substituidas_restantes,
      situacao: l.situacao,
      motivo: l.motivo
    }))
  }

  async salvar(o: OfertaAperto): Promise<void> {
    this.banco
      .prepare(
        `INSERT INTO aperto_ofertas
           (id, tipo, descricao, grupo, valor_centavos, parcelas, parcela_centavos, primeira_parcela_em_meses,
            saldo_substituido_centavos, parcela_substituida_centavos, parcelas_substituidas_restantes, situacao, motivo, criado_em)
         VALUES
           (@id, @tipo, @descricao, @grupo, @valor, @parcelas, @parcela, @primeira, @saldo, @parcelaAntiga, @restantes, @situacao, @motivo, @criado)
         ON CONFLICT(id) DO UPDATE SET
           tipo = excluded.tipo, descricao = excluded.descricao, grupo = excluded.grupo, valor_centavos = excluded.valor_centavos,
           parcelas = excluded.parcelas, parcela_centavos = excluded.parcela_centavos,
           primeira_parcela_em_meses = excluded.primeira_parcela_em_meses,
           saldo_substituido_centavos = excluded.saldo_substituido_centavos,
           parcela_substituida_centavos = excluded.parcela_substituida_centavos,
           parcelas_substituidas_restantes = excluded.parcelas_substituidas_restantes,
           situacao = excluded.situacao, motivo = excluded.motivo`
      )
      .run({
        id: o.id,
        tipo: o.tipo,
        descricao: o.descricao,
        grupo: o.grupo,
        valor: o.valorCentavos,
        parcelas: o.parcelas,
        parcela: o.parcelaCentavos,
        primeira: o.primeiraParcelaEmMeses,
        saldo: o.saldoSubstituidoCentavos,
        parcelaAntiga: o.parcelaSubstituidaCentavos,
        restantes: o.parcelasSubstituidasRestantes,
        situacao: o.situacao,
        motivo: o.motivo,
        criado: new Date().toISOString()
      })
  }

  async remover(id: string): Promise<void> {
    this.banco.prepare('DELETE FROM aperto_ofertas WHERE id = ?').run(id)
  }

  passosFeitos(): Set<string> {
    try {
      return new Set(JSON.parse(this.configuracoes.ler(CHAVE_PASSOS) ?? '[]') as string[])
    } catch {
      return new Set()
    }
  }

  marcarPasso(chave: string, feito: boolean): void {
    const feitos = this.passosFeitos()
    if (feito) feitos.add(chave)
    else feitos.delete(chave)
    this.configuracoes.gravar(CHAVE_PASSOS, JSON.stringify([...feitos]))
  }

  caixaExtra(): number {
    return Number(this.configuracoes.ler(CHAVE_CAIXA) ?? 0) || 0
  }

  definirCaixaExtra(centavos: number): void {
    this.configuracoes.gravar(CHAVE_CAIXA, String(Math.max(0, Math.round(centavos))))
  }
}

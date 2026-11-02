import type { FiltroPrevisao, MesPrevisto, PrevisaoDTO } from '@compartilhado/dtos/previsao'
import { deslocarMes, intervaloDoMes, mesAtual } from '@compartilhado/utilitarios/mes'
import type { Transacao } from '../../../dominio/entidades/Transacao'
import type { IRecorrenciaRepositorio } from '../../../dominio/repositorios/IRecorrenciaRepositorio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'

const MESES_PREVISTOS = 6
const MESES_DE_HISTORICO = 3 // base para estimar imprevistos

const mesDe = (t: Transacao) => t.data.toISOString().slice(0, 7)
const soma = (lista: Transacao[]) => lista.reduce((total, t) => total + t.valorCentavos, 0)
const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// Provisão dos próximos meses: o que já está comprometido (contas recorrentes e parcelas)
// mais uma reserva para imprevistos, estimada pela média dos últimos meses completos.
export class ObterPrevisao {
  constructor(
    private readonly transacaoRepositorio: ITransacaoRepositorio,
    private readonly recorrenciaRepositorio: IRecorrenciaRepositorio
  ) {}

  async executar({ pessoaId, mesInicial }: FiltroPrevisao): Promise<PrevisaoDTO> {
    // Lançamentos manuais antigos de uma conta que depois virou recorrente (mesma descrição e
    // categoria) não são imprevistos: já estão cobertos pela recorrência nas previsões.
    const recorrencias = await this.recorrenciaRepositorio.listar()
    // Parcelas de dívidas cadastradas são recorrências, mas contam como parcela (não conta fixa).
    const recorrenciasDeDivida = new Set(recorrencias.filter((r) => r.dividaId).map((r) => r.id))
    const ehParcelaDeDivida = (t: Transacao) =>
      !!t.recorrencia && recorrenciasDeDivida.has(t.recorrencia.recorrenciaId)
    const assinaturasRecorrentes = new Set(
      recorrencias.map(
        (r) => `${r.categoriaId}|${normalizar(r.descricao)}`
      )
    )
    // Despesa "avulsa": nem recorrente, nem parcela de cartão. É o que chamamos de imprevisto.
    const ehAvulsa = (t: Transacao) =>
      t.tipo === 'despesa' &&
      !t.recorrencia &&
      !t.parcela &&
      !assinaturasRecorrentes.has(`${t.categoriaId}|${normalizar(t.descricao)}`)

    const atual = mesAtual()
    const meses = Array.from({ length: MESES_PREVISTOS }, (_, k) => deslocarMes(mesInicial, k))
    const historico = Array.from({ length: MESES_DE_HISTORICO }, (_, k) =>
      deslocarMes(atual, k - MESES_DE_HISTORICO)
    )
    const inicio = [historico[0], meses[0]].sort()[0]

    const transacoes = await this.transacaoRepositorio.listar({
      pessoaId: pessoaId ?? undefined,
      inicio: intervaloDoMes(inicio).inicio,
      fim: intervaloDoMes(meses[meses.length - 1]).fim
    })

    const porMes = new Map<string, Transacao[]>()
    for (const t of transacoes) porMes.set(mesDe(t), [...(porMes.get(mesDe(t)) ?? []), t])

    // Só conta meses com algum registro, para não puxar a média para baixo antes de usar o app.
    const mesesComDados = historico.filter((m) => (porMes.get(m) ?? []).length > 0)
    const mediaImprevistos = mesesComDados.length
      ? Math.round(
          mesesComDados.reduce((total, m) => total + soma((porMes.get(m) ?? []).filter(ehAvulsa)), 0) /
            mesesComDados.length
        )
      : 0

    const previstos: MesPrevisto[] = meses.map((mes) => {
      const doMes = porMes.get(mes) ?? []
      const despesas = doMes.filter((t) => t.tipo === 'despesa')
      const receitas = soma(doMes.filter((t) => t.tipo === 'receita'))
      const contasRecorrentes = soma(despesas.filter((t) => t.recorrencia && !ehParcelaDeDivida(t)))
      const parcelasDividas = soma(despesas.filter(ehParcelaDeDivida))
      const parcelasCartao = soma(despesas.filter((t) => t.parcela))
      const avulsasLancadas = soma(despesas.filter(ehAvulsa))
      const guardado = soma(doMes.filter((t) => t.tipo === 'guardado'))

      // Mês passado: o que aconteceu, aconteceu. Mês atual: só o que falta da média.
      const reservaImprevistos =
        mes < atual ? 0 : mes === atual ? Math.max(0, mediaImprevistos - avulsasLancadas) : mediaImprevistos

      return {
        mes,
        receitas,
        contasRecorrentes,
        parcelasCartao,
        parcelasDividas,
        avulsasLancadas,
        reservaImprevistos,
        guardado,
        saldoProjetado:
          receitas -
          contasRecorrentes -
          parcelasCartao -
          parcelasDividas -
          avulsasLancadas -
          reservaImprevistos -
          guardado,
        valoresEstimados: soma(doMes.filter((t) => t.status === 'prevista')) + reservaImprevistos
      }
    })

    return {
      meses: previstos,
      mediaImprevistosMensal: mediaImprevistos,
      mesesDeHistorico: mesesComDados.length
    }
  }
}

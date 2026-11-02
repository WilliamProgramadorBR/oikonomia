import type {
  ContextoNarrativa,
  INarradorFinanceiro,
  Insight,
  Narrativa
} from '../portas/INarradorFinanceiro'
import { moeda, nomeMes, percentual } from './formatacao'

const CLASSIFICACOES = {
  excelente: 'excelente',
  boa: 'boa',
  atencao: 'pedindo atenção',
  critica: 'crítica'
}

const ORDEM: Record<Insight['tipo'], number> = { critico: 0, atencao: 1, dica: 2, positivo: 3 }

// Textos escritos pelo próprio app a partir dos números. Funciona sempre, sem internet e sem IA.
export class NarradorNativo implements INarradorFinanceiro {
  async narrar(c: ContextoNarrativa): Promise<Narrativa> {
    const { avaliacao: a, entrada: e } = c
    const mes = nomeMes(c.mesReferencia)
    const p = a.parametros
    const indicador = (id: string) => a.indicadores.find((i) => i.id === id)
    const insights: Insight[] = []

    // ===== Meses no vermelho =====
    if (c.mesesNegativos.length > 0) {
      const [primeiro] = c.mesesNegativos
      insights.push({
        tipo: c.mesesNegativos.length > 1 ? 'critico' : 'atencao',
        titulo:
          c.mesesNegativos.length > 1
            ? `${c.mesesNegativos.length} meses devem fechar no vermelho`
            : `${capitalizar(nomeMes(primeiro.mes))} deve fechar no vermelho`,
        texto: `A projeção indica saldo de ${moeda(primeiro.saldo)} em ${nomeMes(primeiro.mes)}. Antes de qualquer nova compra parcelada, revise as contas recorrentes e os gastos avulsos, que custam em média ${moeda(c.mediaImprevistos)} por mês.`
      })
    }

    // ===== Parcelas =====
    const parcelas = indicador('parcelas')
    if (parcelas && parcelas.status !== 'bom') {
      const alivio = c.alivioParcelas
        ? ` Em ${nomeMes(c.alivioParcelas.mes)} elas caem para ${moeda(c.alivioParcelas.parcelas)}; até lá, evite novos parcelamentos.`
        : ' Elas seguem altas pelos próximos meses: priorize terminar as atuais antes de assumir novas.'
      insights.push({
        tipo: parcelas.status === 'critico' ? 'critico' : 'atencao',
        titulo: 'As parcelas estão pesando',
        texto: `Em ${mes}, as parcelas (cartão e empréstimos) somam ${moeda(e.parcelas)}, ou ${percentual(parcelas.valor)} da renda. O confortável é até ${percentual(p.parcelasConfortaveis)} e o teto, ${percentual(p.tetoParcelas)}.${alivio}`
      })
    }

    // ===== Contas recorrentes pagas no cartão =====
    if (c.recorrentesNoCartao > 0) {
      const faturas = e.parcelas + c.recorrentesNoCartao
      const pesoFaturas = faturas / Math.max(e.renda, 1)
      insights.push({
        tipo: pesoFaturas > p.tetoParcelas ? 'atencao' : 'dica',
        titulo: 'Contas do mês no cartão de crédito',
        texto: `${moeda(c.recorrentesNoCartao)} em contas recorrentes são pagos no cartão e empurrados para a fatura seguinte. Isso dá fôlego agora, mas cada mês já começa comprometido. Somando parcelas, as faturas de ${mes} levam ${percentual(pesoFaturas)} da renda; mantenha abaixo de ${percentual(p.tetoParcelas)}.`
      })
    }

    // ===== Juros =====
    const juros = indicador('juros')
    if (juros && e.jurosMensais > 0) {
      insights.push({
        tipo: juros.status === 'critico' ? 'critico' : 'atencao',
        titulo: 'Juros: dinheiro que não volta',
        texto: `Nos últimos meses foram em média ${moeda(e.jurosMensais)} por mês em juros e tarifas. Quitar ou renegociar a dívida mais cara costuma render mais do que qualquer investimento.`
      })
    }

    // ===== Reserva de emergência =====
    const metaReserva = Math.round(a.custoVidaMensal * p.metaReservaMeses)
    const aporteMensal = e.guardadoPrevisto + a.orcamento.guardarSugerido
    if (a.reservaMeses < p.metaReservaMeses) {
      const falta = Math.max(0, metaReserva - e.totalGuardado)
      const prazo =
        aporteMensal > 0
          ? ` Guardando ${moeda(aporteMensal)} por mês, a meta chega em cerca de ${Math.ceil(falta / aporteMensal)} meses.`
          : ' Comece com um valor fixo por mês, mesmo pequeno, logo que a renda entrar.'
      insights.push({
        tipo: indicador('reserva')?.status === 'critico' ? 'critico' : 'atencao',
        titulo: 'Reserva de emergência',
        texto: `O dinheiro guardado (${moeda(e.totalGuardado)}) cobre ${formatarMeses(a.reservaMeses)} do custo de vida, de ${moeda(a.custoVidaMensal)} por mês. A meta é ${p.metaReservaMeses} meses, ou ${moeda(metaReserva)}.${prazo}`
      })
    } else {
      insights.push({
        tipo: 'positivo',
        titulo: 'Reserva de emergência completa',
        texto: `O que está guardado cobre ${formatarMeses(a.reservaMeses)} do custo de vida. Com a reserva garantida, o que sobrar pode ir para objetivos e investimentos.`
      })
    }

    // ===== Poupança =====
    const poupanca = indicador('poupanca')
    if (poupanca?.status === 'bom') {
      insights.push({
        tipo: 'positivo',
        titulo: 'Boa margem para guardar',
        texto: `Depois dos gastos previstos, sobra ${percentual(poupanca.valor)} da renda em ${mes}. Mantendo esse ritmo, dá para acelerar a reserva e os objetivos.`
      })
    } else if (a.orcamento.guardarSugerido > 0) {
      insights.push({
        tipo: 'dica',
        titulo: 'Pague-se primeiro',
        texto: `Separe ${moeda(a.orcamento.guardarSugerido)} assim que a renda de ${mes} cair, antes de gastar. O que fica separado no começo do mês não some no meio dele.`
      })
    }

    // ===== Limite dos cartões =====
    const limite = indicador('limite')
    if (limite && limite.status !== 'bom') {
      insights.push({
        tipo: limite.status === 'critico' ? 'critico' : 'atencao',
        titulo: 'Limite dos cartões apertado',
        texto: `${percentual(limite.valor)} do limite total já está tomado por cobranças a vencer. Usar muito do limite deixa pouca margem para emergências e pode pesar no seu score de crédito.`
      })
    }

    insights.sort((x, y) => ORDEM[x.tipo] - ORDEM[y.tipo])

    return {
      resumo: this.resumo(c),
      explicacaoLimite: this.explicacaoLimite(c),
      insights,
      fonte: 'nativo'
    }
  }

  private resumo(c: ContextoNarrativa): string {
    const { avaliacao: a, entrada: e } = c
    const mes = nomeMes(c.mesReferencia)
    const comprometido = e.contasRecorrentes + e.parcelas
    const abertura = `A saúde financeira ${c.sujeito} está ${CLASSIFICACOES[a.classificacao]} (nota ${a.nota}).`
    const renda = `Em ${mes}, a renda prevista é ${moeda(e.renda)} e ${moeda(comprometido)} (${percentual(comprometido / Math.max(e.renda, 1))}) já estão comprometidos com contas e parcelas.`
    const credito =
      a.limiteCredito.parcelaMensalMaxima > 0
        ? `É seguro assumir até ${moeda(a.limiteCredito.parcelaMensalMaxima)} por mês em novas parcelas.`
        : 'Não é recomendável assumir novas parcelas agora.'
    return `${abertura} ${renda} ${credito}`
  }

  private explicacaoLimite(c: ContextoNarrativa): string {
    const { avaliacao: a, entrada: e } = c
    const p = a.parametros
    const o = a.orcamento
    switch (a.limiteCredito.motivo) {
      case 'sem_folga': {
        const base = `O orçamento de ${nomeMes(c.mesReferencia)} não tem folga: depois das contas, parcelas, imprevistos, do que vale guardar e da margem de segurança de ${moeda(o.margemSeguranca)}, ${o.livreParaGastar < 0 ? `faltam ${moeda(-o.livreParaGastar)}` : `sobram ${moeda(o.livreParaGastar)}`}.`
        // Deixa claro o custo da escolha: a folga existe, mas está reservada para guardar.
        const semGuardar = o.livreParaGastar + o.guardarSugerido
        return semGuardar > 0 && o.guardarSugerido > 0
          ? `${base} Abrindo mão de guardar os ${moeda(o.guardarSugerido)} sugeridos, caberiam até ${moeda(semGuardar)} por mês em parcelas, mas sem reserva de emergência qualquer imprevisto vira dívida. Por isso a recomendação é zero.`
          : `${base} Qualquer nova parcela sairia da reserva ou viraria dívida.`
      }
      case 'regra_parcelas':
        return `A folga do orçamento permitiria mais, mas as parcelas não devem passar de ${percentual(p.tetoParcelas)} da renda (${moeda(Math.round(e.renda * p.tetoParcelas))}). Já há ${moeda(e.parcelas)} em parcelas, então o espaço restante é este.`
      case 'folga':
        return `É o que sobra no orçamento de ${nomeMes(c.mesReferencia)} depois das contas, parcelas, da reserva para imprevistos (${moeda(o.imprevistos)}), do valor sugerido para guardar e de uma margem de segurança de ${moeda(o.margemSeguranca)}.`
    }
  }
}

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

function formatarMeses(meses: number): string {
  if (meses < 1) return 'menos de 1 mês'
  const arredondado = Math.floor(meses * 10) / 10
  return `${arredondado.toLocaleString('pt-BR')} ${arredondado < 2 ? 'mês' : 'meses'}`
}

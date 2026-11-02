// Planejamento de objetivos com matemática financeira (valor futuro com rendimento mensal).
// Serviço puro: recebe números, devolve um plano estruturado. Os textos ficam no narrador.

const LIMITE_MESES = 600 // 50 anos: além disso consideramos "não chega"
const MESES_NA_PROJECAO = 120

export type Viabilidade =
  | 'concluido'
  | 'no_caminho'
  | 'viavel'
  | 'apertado'
  | 'inviavel_no_prazo'
  | 'aguardando' // hoje a folga vai para objetivos mais prioritários; recebe quando eles terminarem
  | 'sem_capacidade'

export interface EntradaPlano {
  valorAlvo: number
  valorAtual: number
  mesesAtePrazo: number
  aporteProgramado: number // aporte mensal já cadastrado como recorrente
  capacidadeDisponivel: number // folga mensal ainda livre (depois de objetivos mais prioritários)
  rendimentoMensal: number // fração (0.009 = 0,9% a.m.)
  cortesPossiveis: { nome: string; valorMensal: number }[]
  dividaCara: { saldo: number; taxaMensal: number } | null // taxa em fração
  quitarAntes: boolean // perfil não prioriza guardar antes de quitar
  reservaMinimaPendente: boolean // falta reserva mínima e o perfil pede segurança antes
}

export interface PlanoObjetivo {
  viabilidade: Viabilidade
  aporteNecessario: number
  aporteSugerido: number
  prazoRealistaMeses: number | null // meses a partir de agora com o aporte possível
  valorPossivelNoPrazo: number
  cortesSugeridos: { nome: string; valorMensal: number }[]
  quitarDividaAntes: { mesesParaQuitar: number; saldo: number; taxaMensal: number } | null
  reservaAntes: boolean
  projecao: number[] // saldo acumulado mês a mês com o aporte sugerido (índice 0 = hoje)
}

// Valor futuro: saldo atual rendendo + aportes mensais rendendo.
export function valorFuturo(atual: number, aporte: number, taxa: number, meses: number): number {
  if (taxa === 0) return atual + aporte * meses
  const fator = Math.pow(1 + taxa, meses)
  return atual * fator + (aporte * (fator - 1)) / taxa
}

// Aporte mensal para sair de `atual` e chegar em `alvo` em `meses`.
export function aporteNecessario(alvo: number, atual: number, taxa: number, meses: number): number {
  if (meses <= 0) return Math.max(0, alvo - atual)
  if (taxa === 0) return Math.max(0, (alvo - atual) / meses)
  const fator = Math.pow(1 + taxa, meses)
  return Math.max(0, ((alvo - atual * fator) * taxa) / (fator - 1))
}

// Quantos meses aportando `aporte` por mês até chegar em `alvo` (null = não chega).
export function mesesAteAlvo(alvo: number, atual: number, aporte: number, taxa: number): number | null {
  if (atual >= alvo) return 0
  if (aporte <= 0 && (taxa === 0 || atual <= 0)) return null
  const meses =
    taxa === 0
      ? (alvo - atual) / aporte
      : Math.log((alvo * taxa + aporte) / (atual * taxa + aporte)) / Math.log(1 + taxa)
  return Number.isFinite(meses) && meses <= LIMITE_MESES ? Math.ceil(meses) : null
}

// ===== Simulação em cascata de vários objetivos =====
// Mês a mês, a folga livre vai para os objetivos por ordem de prioridade, cada um recebendo o
// necessário para chegar no prazo (recalculado todo mês). Quando um objetivo termina, o aporte
// programado dele é redirecionado para os seguintes. Assim o prazo de cada um considera os demais.

export interface ObjetivoParaSimular {
  id: string
  valorAlvo: number
  valorAtual: number
  aporteProgramado: number
  rendimentoMensal: number
  prazoMeses: number
}

export interface ResultadoSimulacao {
  aporteInicial: number // aporte no primeiro mês
  inicioAportes: number | null // primeiro mês (1, 2...) em que recebe algo
  conclusao: number | null // mês em que atinge o alvo (0 = já atingiu); null = não chega
  serie: number[] // saldo mês a mês (índice 0 = hoje)
}

export function simularObjetivos(
  porPrioridade: ObjetivoParaSimular[],
  capacidadeLivre: number
): Map<string, ResultadoSimulacao> {
  const saldos = porPrioridade.map((o) => o.valorAtual)
  const resultados = porPrioridade.map<ResultadoSimulacao>((o) => ({
    aporteInicial: 0,
    inicioAportes: null,
    conclusao: o.valorAtual >= o.valorAlvo ? 0 : null,
    serie: [o.valorAtual]
  }))

  for (let mes = 1; mes <= LIMITE_MESES; mes++) {
    if (resultados.every((r) => r.conclusao !== null)) break

    let livre =
      Math.max(0, capacidadeLivre) +
      porPrioridade.reduce((soma, o, i) => soma + (resultados[i].conclusao !== null ? o.aporteProgramado : 0), 0)

    porPrioridade.forEach((o, i) => {
      const r = resultados[i]
      if (r.conclusao !== null) {
        if (mes <= MESES_NA_PROJECAO) r.serie.push(saldos[i])
        return
      }
      const mesesRestantes = o.prazoMeses - (mes - 1)
      const meta =
        mesesRestantes > 0
          ? aporteNecessario(o.valorAlvo, saldos[i], o.rendimentoMensal, mesesRestantes)
          : o.valorAlvo - saldos[i] // prazo vencido: tudo o que der
      const extra = Math.min(livre, Math.max(0, meta - o.aporteProgramado))
      livre -= extra
      const aporte = o.aporteProgramado + extra

      if (mes === 1) r.aporteInicial = Math.round(aporte)
      if (aporte > 0 && r.inicioAportes === null) r.inicioAportes = mes
      saldos[i] = saldos[i] * (1 + o.rendimentoMensal) + aporte
      if (saldos[i] >= o.valorAlvo) r.conclusao = mes
      if (mes <= MESES_NA_PROJECAO) r.serie.push(Math.round(Math.min(saldos[i], o.valorAlvo)))
    })
  }

  return new Map(porPrioridade.map((o, i) => [o.id, resultados[i]]))
}

export function planejarObjetivo(e: EntradaPlano): PlanoObjetivo {
  const i = e.rendimentoMensal
  const n = Math.max(1, e.mesesAtePrazo)
  const base = {
    cortesSugeridos: [] as PlanoObjetivo['cortesSugeridos'],
    quitarDividaAntes: null as PlanoObjetivo['quitarDividaAntes'],
    reservaAntes: false
  }

  if (e.valorAtual >= e.valorAlvo) {
    return {
      ...base,
      viabilidade: 'concluido',
      aporteNecessario: 0,
      aporteSugerido: 0,
      prazoRealistaMeses: 0,
      valorPossivelNoPrazo: e.valorAtual,
      projecao: [e.valorAtual]
    }
  }

  const necessario = Math.ceil(aporteNecessario(e.valorAlvo, e.valorAtual, i, n))
  const capacidade = e.aporteProgramado + Math.max(0, e.capacidadeDisponivel)
  const totalCortes = e.cortesPossiveis.reduce((soma, c) => soma + c.valorMensal, 0)

  let viabilidade: Viabilidade
  let aporteSugerido: number
  let cortesSugeridos: PlanoObjetivo['cortesSugeridos'] = []

  if (e.aporteProgramado >= necessario) {
    viabilidade = 'no_caminho'
    aporteSugerido = e.aporteProgramado
  } else if (capacidade >= necessario) {
    viabilidade = 'viavel'
    aporteSugerido = necessario
  } else if (capacidade + totalCortes >= necessario && capacidade + totalCortes > 0) {
    viabilidade = 'apertado'
    aporteSugerido = necessario
    // Sugere só os cortes necessários, dos maiores para os menores.
    let falta = necessario - capacidade
    for (const corte of [...e.cortesPossiveis].sort((a, b) => b.valorMensal - a.valorMensal)) {
      if (falta <= 0) break
      const valor = Math.min(corte.valorMensal, falta)
      cortesSugeridos.push({ nome: corte.nome, valorMensal: Math.ceil(valor) })
      falta -= valor
    }
  } else if (capacidade <= 0) {
    viabilidade = 'sem_capacidade'
    aporteSugerido = 0
  } else {
    viabilidade = 'inviavel_no_prazo'
    aporteSugerido = capacidade
  }

  const prazoRealistaMeses = mesesAteAlvo(e.valorAlvo, e.valorAtual, Math.max(capacidade, aporteSugerido), i)

  const quitarDividaAntes =
    e.quitarAntes && e.dividaCara && e.dividaCara.taxaMensal > i && capacidade > 0
      ? {
          mesesParaQuitar: Math.ceil(e.dividaCara.saldo / capacidade),
          saldo: e.dividaCara.saldo,
          taxaMensal: e.dividaCara.taxaMensal
        }
      : null

  const horizonte = Math.min(MESES_NA_PROJECAO, Math.max(n, prazoRealistaMeses ?? n))
  const projecao = Array.from({ length: horizonte + 1 }, (_, k) =>
    Math.min(Math.round(valorFuturo(e.valorAtual, aporteSugerido, i, k)), Math.max(e.valorAlvo, e.valorAtual) * 2)
  )

  return {
    viabilidade,
    aporteNecessario: necessario,
    aporteSugerido: Math.round(aporteSugerido),
    prazoRealistaMeses,
    valorPossivelNoPrazo: Math.round(valorFuturo(e.valorAtual, capacidade, i, n)),
    cortesSugeridos,
    quitarDividaAntes,
    reservaAntes: e.reservaMinimaPendente,
    projecao
  }
}

// Encontra gastos avulsos que se repetem todo mês (mesma descrição e categoria, valores parecidos):
// candidatos a virar conta recorrente, o que melhora a previsão.

export interface GastoAvulso {
  descricao: string
  categoriaId: string
  pessoaId: string
  valorCentavos: number
  data: string // AAAA-MM-DD
}

export interface Habito {
  assinatura: string
  descricao: string
  categoriaId: string
  pessoaId: string
  valorMedio: number // média mensal
  diaTipico: number // mediana do dia do mês
  mesesComOcorrencia: number
  ultimaData: string
}

const MINIMO_MESES = 3
// Coeficiente de variação dos valores mensais: hábito tem valor estável (o que sobe ou cai mês a
// mês é tendência, não hábito).
const VARIACAO_MAXIMA = 0.25

export const assinaturaDe = (categoriaId: string, descricao: string) =>
  `${categoriaId}|${descricao.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()}`

const mediana = (numeros: number[]) => {
  const ordenados = [...numeros].sort((a, b) => a - b)
  return ordenados[Math.floor(ordenados.length / 2)]
}

// `ultimosMeses`: meses da janela (AAAA-MM), em ordem; o hábito precisa aparecer em 2 dos 3 últimos.
export function detectarHabitos(
  gastos: GastoAvulso[],
  ultimosMeses: string[],
  assinaturasIgnoradas: Set<string>
): Habito[] {
  const grupos = new Map<string, GastoAvulso[]>()
  for (const gasto of gastos) {
    const assinatura = assinaturaDe(gasto.categoriaId, gasto.descricao)
    if (assinaturasIgnoradas.has(assinatura)) continue
    grupos.set(assinatura, [...(grupos.get(assinatura) ?? []), gasto])
  }

  const recentes = new Set(ultimosMeses.slice(-3))
  const habitos: Habito[] = []

  for (const [assinatura, doGrupo] of grupos) {
    const porMes = new Map<string, number>()
    for (const g of doGrupo) porMes.set(g.data.slice(0, 7), (porMes.get(g.data.slice(0, 7)) ?? 0) + g.valorCentavos)
    if (porMes.size < MINIMO_MESES) continue
    if ([...porMes.keys()].filter((m) => recentes.has(m)).length < 2) continue

    const valores = [...porMes.values()]
    const media = valores.reduce((soma, v) => soma + v, 0) / valores.length
    const desvio = Math.sqrt(valores.reduce((soma, v) => soma + (v - media) ** 2, 0) / valores.length)
    if (media <= 0 || desvio / media > VARIACAO_MAXIMA) continue

    const maisRecente = [...doGrupo].sort((a, b) => b.data.localeCompare(a.data))[0]
    habitos.push({
      assinatura,
      descricao: maisRecente.descricao,
      categoriaId: maisRecente.categoriaId,
      pessoaId: maisRecente.pessoaId,
      valorMedio: Math.round(media),
      diaTipico: mediana(doGrupo.map((g) => Number(g.data.slice(8, 10)))),
      mesesComOcorrencia: porMes.size,
      ultimaData: maisRecente.data
    })
  }

  return habitos.sort((a, b) => b.valorMedio - a.valorMedio)
}

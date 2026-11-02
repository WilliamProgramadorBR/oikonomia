// Regressão linear simples (mínimos quadrados) sobre uma série mensal: x = 0, 1, 2...

export interface ResultadoRegressao {
  inclinacao: number // variação média por mês
  intercepto: number
  r2: number // 0 a 1: quanto da variação a reta explica (confiança na tendência)
  prever: (x: number) => number
}

export function regressaoLinear(valores: number[]): ResultadoRegressao {
  const n = valores.length
  if (n < 2) {
    const constante = valores[0] ?? 0
    return { inclinacao: 0, intercepto: constante, r2: 0, prever: () => constante }
  }

  const mediaX = (n - 1) / 2
  const mediaY = valores.reduce((soma, y) => soma + y, 0) / n

  let somaXY = 0
  let somaXX = 0
  valores.forEach((y, x) => {
    somaXY += (x - mediaX) * (y - mediaY)
    somaXX += (x - mediaX) ** 2
  })

  const inclinacao = somaXY / somaXX
  const intercepto = mediaY - inclinacao * mediaX
  const prever = (x: number) => intercepto + inclinacao * x

  const somaTotal = valores.reduce((soma, y) => soma + (y - mediaY) ** 2, 0)
  const somaResiduos = valores.reduce((soma, y, x) => soma + (y - prever(x)) ** 2, 0)
  const r2 = somaTotal === 0 ? 0 : Math.max(0, 1 - somaResiduos / somaTotal)

  return { inclinacao, intercepto, r2, prever }
}

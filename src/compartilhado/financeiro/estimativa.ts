// Estimativa do próximo valor de uma conta variável (luz, água, mercado do mês...).
// Média ponderada dos últimos valores confirmados: os mais recentes pesam mais.
// Com o tempo, entra aqui sazonalidade/regressão sem mudar quem chama.

const PESOS = [3, 2, 1]

export function estimarProximoValor(confirmadosRecentes: number[], valorBase: number): number {
  const amostra = confirmadosRecentes.slice(0, PESOS.length)
  if (amostra.length === 0) return valorBase

  const somaPesos = amostra.reduce((soma, _, i) => soma + PESOS[i], 0)
  const ponderado = amostra.reduce((soma, valor, i) => soma + valor * PESOS[i], 0)
  return Math.round(ponderado / somaPesos)
}

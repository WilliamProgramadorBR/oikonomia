const formatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const formatadorCompacto = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1
})
const formatadorPercentual = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1
})

export function formatarCentavos(centavos: number): string {
  return formatador.format(centavos / 100)
}

// Para eixos de gráfico: "R$ 1,2 mil"
export function formatarCentavosCompacto(centavos: number): string {
  return formatadorCompacto.format(centavos / 100)
}

// 0.153 -> "15,3%"
export function formatarPercentual(fracao: number): string {
  return formatadorPercentual.format(fracao)
}

// Taxa já em percentual: 8.54 -> "8,54% a.m."
export function formatarTaxa(percentual: number, sufixo = 'a.m.'): string {
  return `${percentual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% ${sufixo}`
}

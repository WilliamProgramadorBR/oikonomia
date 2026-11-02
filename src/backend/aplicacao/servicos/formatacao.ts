// Formatação pt-BR para textos gerados no backend (narrativas).

const moedaFormatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const percentualFormatador = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 0
})

export const moeda = (centavos: number) => moedaFormatador.format(centavos / 100)

export const percentual = (fracao: number) => percentualFormatador.format(fracao)

// '2026-12' -> 'dezembro'
export const nomeMes = (mes: string) =>
  new Date(`${mes}-01T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })

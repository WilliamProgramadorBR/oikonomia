import { hojeISO } from '@compartilhado/utilitarios/mes'

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

// Datas ISO são interpretadas ao meio-dia UTC para não "voltarem um dia" no fuso do Brasil.
const paraData = (iso: string) => new Date(`${iso.length === 7 ? `${iso}-01` : iso}T12:00:00Z`)

// '2026-11' -> 'Novembro de 2026'
export function nomeDoMes(mes: string): string {
  return capitalizar(
    paraData(mes).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  )
}

// '2026-11' -> 'Nov'
export function mesAbreviado(mes: string): string {
  return capitalizar(
    paraData(mes)
      .toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' })
      .replace('.', '')
  )
}

// '2026-11-02' -> 'Hoje' | 'Ontem' | 'Segunda, 2 de novembro'
export function rotuloDoDia(data: string): string {
  const hoje = hojeISO()
  if (data === hoje) return 'Hoje'
  const ontem = new Date(paraData(hoje).getTime() - 86_400_000).toISOString().slice(0, 10)
  if (data === ontem) return 'Ontem'
  return capitalizar(
    paraData(data)
      .toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
      .replace('-feira', '')
  )
}

// '2026-11-02' -> '02/11'
export function dataCurta(data: string): string {
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes}`
}

// Matemática de parcelamento no cartão. Funções puras: o backend usa para gerar as parcelas
// e o frontend usa para mostrar a prévia antes de salvar.

import { deslocarMes, intervaloDoMes } from '../utilitarios/mes'

export interface ResultadoParcelamento {
  parcelas: number[] // valor de cada parcela, em centavos
  totalCentavos: number
  jurosCentavos: number
}

// Sem juros: divide igualmente e joga a sobra de centavos na 1ª parcela.
// Com juros: tabela Price (parcelas iguais), PMT = PV · i / (1 − (1 + i)^−n).
export function calcularParcelamento(
  valorCentavos: number,
  quantidade: number,
  taxaMensalPercentual: number
): ResultadoParcelamento {
  let parcelas: number[]

  if (taxaMensalPercentual <= 0 || quantidade === 1) {
    const base = Math.floor(valorCentavos / quantidade)
    parcelas = Array.from({ length: quantidade }, () => base)
    parcelas[0] += valorCentavos - base * quantidade
  } else {
    const i = taxaMensalPercentual / 100
    const pmt = (valorCentavos * i) / (1 - Math.pow(1 + i, -quantidade))
    parcelas = Array.from({ length: quantidade }, () => Math.round(pmt))
  }

  const totalCentavos = parcelas.reduce((soma, p) => soma + p, 0)
  return { parcelas, totalCentavos, jurosCentavos: totalCentavos - valorCentavos }
}

// Taxa mensal (percentual) embutida em `quantidade` parcelas de `parcelaCentavos` para pagar `valorCentavos`.
// Usada quando o banco informa só a parcela (ex.: parcelamento da fatura). 0 se não há juros.
export function taxaImplicita(valorCentavos: number, parcelaCentavos: number, quantidade: number): number {
  if (valorCentavos <= 0 || quantidade <= 0 || parcelaCentavos * quantidade <= valorCentavos) return 0
  const valorPresente = (i: number) => (parcelaCentavos * (1 - Math.pow(1 + i, -quantidade))) / i
  let baixo = 1e-9
  let alto = 1
  for (let k = 0; k < 100; k++) {
    const meio = (baixo + alto) / 2
    if (valorPresente(meio) > valorCentavos) baixo = meio
    else alto = meio
  }
  return Math.round(((baixo + alto) / 2) * 10000) / 100
}

// Mês (AAAA-MM) da fatura em que cai a 1ª parcela, identificado pelo mês do VENCIMENTO.
// Compras a partir do dia de fechamento vão para a fatura seguinte.
export function mesDaPrimeiraFatura(
  dataCompra: string,
  diaFechamento: number,
  diaVencimento: number
): string {
  const mesCompra = dataCompra.slice(0, 7)
  const dia = Number(dataCompra.slice(8, 10))
  const mesFechamento = dia < diaFechamento ? mesCompra : deslocarMes(mesCompra, 1)
  return diaVencimento > diaFechamento ? mesFechamento : deslocarMes(mesFechamento, 1)
}

// Data de vencimento no mês, ajustando dias que não existem (ex.: dia 31 em fevereiro).
export function dataDeVencimento(mes: string, diaVencimento: number): string {
  const ultimoDia = Number(intervaloDoMes(mes).fim.slice(8, 10))
  return `${mes}-${String(Math.min(diaVencimento, ultimoDia)).padStart(2, '0')}`
}

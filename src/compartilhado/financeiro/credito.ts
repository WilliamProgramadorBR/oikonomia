// Matemática de crédito (funções puras): tabelas Price e SAC, valor presente e saldo devedor.
// Usada no backend (dívidas, ranking de bancos) e no frontend (tabela de amortização instantânea).

export type SistemaAmortizacao = 'price' | 'sac'

export interface LinhaAmortizacao {
  numero: number
  parcela: number
  juros: number
  amortizacao: number
  saldo: number
}

export interface ResultadoFinanciamento {
  linhas: LinhaAmortizacao[]
  totalPago: number
  totalJuros: number
  primeiraParcela: number
  ultimaParcela: number
}

// Parcela fixa (Price) para quitar `valor` em `meses` à taxa `taxa` (fração ao mês).
export function parcelaPrice(valor: number, taxa: number, meses: number): number {
  if (meses <= 0) return valor
  if (taxa === 0) return valor / meses
  return (valor * taxa) / (1 - Math.pow(1 + taxa, -meses))
}

// Quanto vale hoje uma sequência de `meses` parcelas de `parcela` (saldo devedor equivalente).
export function valorPresente(parcela: number, taxa: number, meses: number): number {
  if (taxa === 0) return parcela * meses
  return (parcela * (1 - Math.pow(1 + taxa, -meses))) / taxa
}

// Saldo devedor depois de `pagas` parcelas fixas.
export function saldoApos(saldoInicial: number, parcela: number, taxa: number, pagas: number): number {
  if (taxa === 0) return Math.max(0, saldoInicial - parcela * pagas)
  const fator = Math.pow(1 + taxa, pagas)
  return Math.max(0, saldoInicial * fator - (parcela * (fator - 1)) / taxa)
}

export function simularFinanciamento(
  valorCentavos: number,
  taxaMensalPercentual: number,
  meses: number,
  sistema: SistemaAmortizacao
): ResultadoFinanciamento {
  const taxa = taxaMensalPercentual / 100
  const linhas: LinhaAmortizacao[] = []
  let saldo = valorCentavos
  const fixa = parcelaPrice(valorCentavos, taxa, meses)
  const amortizacaoSac = valorCentavos / meses

  for (let numero = 1; numero <= meses; numero++) {
    const juros = saldo * taxa
    let amortizacao = sistema === 'price' ? fixa - juros : amortizacaoSac
    if (numero === meses) amortizacao = saldo // última parcela zera o saldo (arredondamentos)
    saldo -= amortizacao
    linhas.push({
      numero,
      parcela: Math.round(juros + amortizacao),
      juros: Math.round(juros),
      amortizacao: Math.round(amortizacao),
      saldo: Math.max(0, Math.round(saldo))
    })
  }

  const totalPago = linhas.reduce((soma, l) => soma + l.parcela, 0)
  return {
    linhas,
    totalPago,
    totalJuros: totalPago - valorCentavos,
    primeiraParcela: linhas[0]?.parcela ?? 0,
    ultimaParcela: linhas[linhas.length - 1]?.parcela ?? 0
  }
}

import { ErroDominio } from '../erros/ErroDominio'

// Férias de quem é CLT, do ponto de vista do caixa da família:
// - o pagamento das férias (salário dos dias + 1/3) chega até 2 dias ANTES de começar (art. 145);
// - vendendo 10 dias (abono pecuniário, art. 143), eles também são pagos com 1/3, junto;
// - o holerite do mês das férias vem só com os dias trabalhados, porque o resto já foi pago.
// Os valores partem do salário líquido cadastrado, então são estimativas (o desconto de INSS e IR
// das férias é parecido, mas não idêntico); o recibo de férias confirma o valor real.

export interface EntradaFerias {
  salarioMensalCentavos: number
  inicio: string // AAAA-MM-DD, primeiro dia de descanso
  diasDescanso: number
  venderDias: boolean // abono pecuniário de 10 dias
  diaPagamento: number // dia do mês em que o salário cai
  pagamentoNoMesSeguinte: boolean // true: salário do mês M cai no mês M+1 (5º dia útil)
}

export interface HoleriteAfetado {
  mesTrabalhado: string // AAAA-MM a que o salário se refere
  mesPagamento: string // AAAA-MM em que o dinheiro cai (competência da conta recorrente)
  diasFerias: number
  diasTrabalhados: number // base de 30 dias
  valorCentavos: number
}

export interface PlanoFerias {
  inicio: string
  fim: string // último dia de descanso
  retorno: string
  dataAdiantamento: string // até 2 dias antes do início
  valorFeriasCentavos: number // dias de descanso + 1/3
  valorAbonoCentavos: number // 10 dias vendidos + 1/3 (0 se não vender)
  adiantamentoCentavos: number
  holerites: HoleriteAfetado[]
}

const DIA = 24 * 60 * 60 * 1000
const paraData = (iso: string) => new Date(`${iso}T00:00:00Z`)
const paraIso = (data: Date) => data.toISOString().slice(0, 10)
const somarDias = (iso: string, dias: number) => paraIso(new Date(paraData(iso).getTime() + dias * DIA))
const diasNoMes = (mes: string) => new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).getUTCDate()
const proximoMes = (mes: string) => paraIso(new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 1))).slice(0, 7)

export function planejarFerias(e: EntradaFerias): PlanoFerias {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.inicio) || Number.isNaN(paraData(e.inicio).getTime())) {
    throw new ErroDominio('Informe a data de início das férias.')
  }
  if (!Number.isInteger(e.diasDescanso) || e.diasDescanso < 5 || e.diasDescanso > 30) {
    throw new ErroDominio('As férias precisam ter entre 5 e 30 dias.')
  }
  if (e.venderDias && e.diasDescanso > 20) {
    throw new ErroDominio('Vendendo 10 dias, sobram no máximo 20 dias de descanso.')
  }
  if (!Number.isInteger(e.salarioMensalCentavos) || e.salarioMensalCentavos <= 0) {
    throw new ErroDominio('O salário precisa ter um valor para calcular as férias.')
  }

  const diaria = e.salarioMensalCentavos / 30
  const valorFerias = Math.round(diaria * e.diasDescanso * (4 / 3))
  const valorAbono = e.venderDias ? Math.round(diaria * 10 * (4 / 3)) : 0
  const fim = somarDias(e.inicio, e.diasDescanso - 1)

  // Dias de férias em cada mês do calendário.
  const feriasPorMes = new Map<string, number>()
  for (let k = 0; k < e.diasDescanso; k++) {
    const mes = somarDias(e.inicio, k).slice(0, 7)
    feriasPorMes.set(mes, (feriasPorMes.get(mes) ?? 0) + 1)
  }

  const holerites = [...feriasPorMes].map(([mes, diasFerias]): HoleriteAfetado => {
    const diasTrabalhados = Math.max(0, Math.min(30, diasNoMes(mes) - diasFerias))
    return {
      mesTrabalhado: mes,
      mesPagamento: e.pagamentoNoMesSeguinte ? proximoMes(mes) : mes,
      diasFerias,
      diasTrabalhados,
      valorCentavos: Math.round(diaria * diasTrabalhados)
    }
  })

  return {
    inicio: e.inicio,
    fim,
    retorno: somarDias(fim, 1),
    dataAdiantamento: somarDias(e.inicio, -2),
    valorFeriasCentavos: valorFerias,
    valorAbonoCentavos: valorAbono,
    adiantamentoCentavos: valorFerias + valorAbono,
    holerites
  }
}

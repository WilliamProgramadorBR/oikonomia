// Avaliação da saúde financeira. Regras puras sobre números já agregados: sem banco, sem datas,
// sem textos longos (quem narra é o NarradorFinanceiro). Fácil de testar e de reaproveitar no mobile.

import {
  PERFIL_PADRAO,
  parametrosDoPerfil,
  type ParametrosFinanceiros
} from '../entidades/PerfilFinanceiro'

// Parâmetros do perfil equilibrado (padrão). Cada família pode ter os seus (ver PerfilFinanceiro).
export const PARAMETROS: ParametrosFinanceiros = parametrosDoPerfil(PERFIL_PADRAO)

const pct = (fracao: number) => `${Math.round(fracao * 100)}%`

export interface EntradaSaude {
  renda: number // renda de referência do mês avaliado
  contasRecorrentes: number
  parcelas: number
  imprevistos: number // avulsos já lançados + reserva estimada
  guardadoPrevisto: number
  saldoProjetado: number // renda − tudo acima
  totalGuardado: number // acumulado até hoje
  jurosMensais: number // média recente de juros e tarifas pagos
  usoLimiteCartoes: number | null // fração; null sem cartões
  limiteDisponivelCartoes: number | null
  mesesNoVermelho: number // na projeção dos próximos meses
}

export type Status = 'bom' | 'atencao' | 'critico'
export type Classificacao = 'excelente' | 'boa' | 'atencao' | 'critica'

export interface Indicador {
  id: string
  nome: string
  descricao: string
  valor: number
  unidade: 'percentual' | 'meses' | 'quantidade'
  status: Status
  pontuacao: number
  referencia: string
  peso: number
}

export interface Orcamento {
  renda: number
  contasRecorrentes: number
  parcelas: number
  imprevistos: number
  guardarPrevisto: number
  guardarSugerido: number
  margemSeguranca: number
  livreParaGastar: number
}

export interface LimiteCredito {
  parcelaMensalMaxima: number
  comprasMaximas: { parcelas: number; valorCentavos: number; limitadaPeloCartao: boolean }[]
  limiteDisponivelCartoes: number | null
  motivo: 'folga' | 'regra_parcelas' | 'sem_folga'
}

export interface AvaliacaoSaude {
  nota: number
  classificacao: Classificacao
  indicadores: Indicador[]
  orcamento: Orcamento
  limiteCredito: LimiteCredito
  custoVidaMensal: number
  reservaMeses: number
  parametros: ParametrosFinanceiros
}

const PARCELAMENTOS_SIMULADOS = [1, 3, 6, 10, 12]

// Interpolação linear entre pontos [valor, nota] (valores fora da faixa ficam nas pontas).
function pontuar(valor: number, pontos: [number, number][]): number {
  if (valor <= pontos[0][0]) return pontos[0][1]
  for (let i = 1; i < pontos.length; i++) {
    const [x0, y0] = pontos[i - 1]
    const [x1, y1] = pontos[i]
    if (valor <= x1) return Math.round(y0 + ((valor - x0) / (x1 - x0)) * (y1 - y0))
  }
  return pontos[pontos.length - 1][1]
}

const statusPorTeto = (valor: number, bom: number, atencao: number): Status =>
  valor <= bom ? 'bom' : valor <= atencao ? 'atencao' : 'critico'
const statusPorPiso = (valor: number, bom: number, atencao: number): Status =>
  valor >= bom ? 'bom' : valor >= atencao ? 'atencao' : 'critico'

function classificar(nota: number): Classificacao {
  if (nota >= 80) return 'excelente'
  if (nota >= 60) return 'boa'
  if (nota >= 40) return 'atencao'
  return 'critica'
}

export function avaliarSaude(e: EntradaSaude, p: ParametrosFinanceiros = PARAMETROS): AvaliacaoSaude {
  const renda = Math.max(e.renda, 1)
  const custoVidaMensal = e.contasRecorrentes + e.parcelas + e.imprevistos
  const reservaMeses = custoVidaMensal > 0 ? e.totalGuardado / custoVidaMensal : 0

  const comprometimento = (e.contasRecorrentes + e.parcelas) / renda
  const pesoParcelas = e.parcelas / renda
  const potencialPoupanca = (e.saldoProjetado + e.guardadoPrevisto) / renda
  const pesoJuros = e.jurosMensais / renda

  const indicadores: Indicador[] = [
    {
      id: 'comprometimento',
      nome: 'Renda comprometida',
      descricao: 'Quanto da renda já está preso em contas recorrentes e parcelas.',
      valor: comprometimento,
      unidade: 'percentual',
      status: statusPorTeto(comprometimento, 0.5, 0.7),
      pontuacao: pontuar(comprometimento, [[0.3, 100], [0.5, 80], [0.7, 40], [0.9, 0]]),
      referencia: 'até 50%',
      peso: 20
    },
    {
      id: 'parcelas',
      nome: 'Peso das parcelas',
      descricao: 'Parcelas (cartão e empréstimos) em relação à renda.',
      valor: pesoParcelas,
      unidade: 'percentual',
      status: statusPorTeto(pesoParcelas, p.parcelasConfortaveis, p.tetoParcelas),
      pontuacao: pontuar(pesoParcelas, [[0, 100], [p.parcelasConfortaveis, 80], [p.tetoParcelas, 40], [p.tetoParcelas * 1.5, 0]]),
      referencia: `até ${pct(p.parcelasConfortaveis)}`,
      peso: 15
    },
    {
      id: 'poupanca',
      nome: 'Capacidade de poupança',
      descricao: 'O que sobra da renda depois dos gastos previstos (inclui o que já é guardado).',
      valor: potencialPoupanca,
      unidade: 'percentual',
      status: statusPorPiso(potencialPoupanca, p.metaPoupanca, 0),
      pontuacao: pontuar(potencialPoupanca, [[-0.1, 0], [0, 25], [p.metaPoupanca / 2, 60], [p.metaPoupanca, 90], [p.metaPoupanca * 1.5, 100]]),
      referencia: `${pct(p.metaPoupanca)} ou mais`,
      peso: 20
    },
    {
      id: 'reserva',
      nome: 'Reserva de emergência',
      descricao: 'Quantos meses de custo de vida o dinheiro guardado cobre.',
      valor: reservaMeses,
      unidade: 'meses',
      status: statusPorPiso(reservaMeses, p.metaReservaMeses, p.metaReservaMeses / 2),
      pontuacao: pontuar(reservaMeses, [[0, 0], [1, 30], [p.metaReservaMeses / 2, 60], [p.metaReservaMeses, 100]]),
      referencia: `${p.metaReservaMeses} meses`,
      peso: 15
    },
    {
      id: 'juros',
      nome: 'Juros pagos',
      descricao: 'Juros e tarifas pagos por mês, em relação à renda.',
      valor: pesoJuros,
      unidade: 'percentual',
      status: pesoJuros === 0 ? 'bom' : statusPorTeto(pesoJuros, 0, 0.05),
      pontuacao: pontuar(pesoJuros, [[0, 100], [0.01, 70], [0.05, 20], [0.1, 0]]),
      referencia: 'zero',
      peso: 10
    },
    {
      id: 'vermelho',
      nome: 'Meses no vermelho',
      descricao: 'Meses que fecham negativos na projeção dos próximos 6 meses.',
      valor: e.mesesNoVermelho,
      unidade: 'quantidade',
      status: e.mesesNoVermelho === 0 ? 'bom' : e.mesesNoVermelho === 1 ? 'atencao' : 'critico',
      pontuacao: pontuar(e.mesesNoVermelho, [[0, 100], [1, 50], [2, 20], [3, 0]]),
      referencia: 'nenhum',
      peso: 10
    }
  ]

  if (e.usoLimiteCartoes !== null) {
    indicadores.splice(2, 0, {
      id: 'limite',
      nome: 'Uso do limite dos cartões',
      descricao: 'Quanto do limite total já está tomado por cobranças a vencer.',
      valor: e.usoLimiteCartoes,
      unidade: 'percentual',
      status: statusPorTeto(e.usoLimiteCartoes, 0.3, 0.7),
      pontuacao: pontuar(e.usoLimiteCartoes, [[0.3, 100], [0.5, 75], [0.8, 30], [1, 0]]),
      referencia: 'até 30%',
      peso: 10
    })
  }

  const pesoTotal = indicadores.reduce((soma, i) => soma + i.peso, 0)
  const nota = Math.round(indicadores.reduce((soma, i) => soma + i.pontuacao * i.peso, 0) / pesoTotal)

  // ===== Orçamento do mês =====
  // Guardar: sugerimos completar a meta de 20%, mas nunca mais que metade do que sobra (realismo).
  const metaGuardar = Math.round(e.renda * p.metaPoupanca)
  const guardarSugerido = Math.min(
    Math.max(0, metaGuardar - e.guardadoPrevisto),
    Math.round(Math.max(0, e.saldoProjetado) / 2)
  )
  const margemSeguranca = Math.round(e.renda * p.margemSeguranca)
  const livreParaGastar = e.saldoProjetado - guardarSugerido - margemSeguranca

  // ===== Limite seguro de crédito =====
  // Novas parcelas precisam caber na folga do orçamento E no teto de 30% da renda em parcelas.
  const espacoRegraParcelas = Math.round(e.renda * p.tetoParcelas) - e.parcelas
  const parcelaMensalMaxima = Math.max(0, Math.min(livreParaGastar, espacoRegraParcelas))
  const motivo: LimiteCredito['motivo'] =
    livreParaGastar <= 0 ? 'sem_folga' : espacoRegraParcelas < livreParaGastar ? 'regra_parcelas' : 'folga'

  const comprasMaximas = PARCELAMENTOS_SIMULADOS.map((parcelas) => {
    const pelaFolga = parcelaMensalMaxima * parcelas
    const limitadaPeloCartao =
      e.limiteDisponivelCartoes !== null && e.limiteDisponivelCartoes < pelaFolga
    return {
      parcelas,
      valorCentavos: limitadaPeloCartao ? Math.max(0, e.limiteDisponivelCartoes!) : pelaFolga,
      limitadaPeloCartao
    }
  })

  return {
    nota,
    classificacao: classificar(nota),
    indicadores,
    orcamento: {
      renda: e.renda,
      contasRecorrentes: e.contasRecorrentes,
      parcelas: e.parcelas,
      imprevistos: e.imprevistos,
      guardarPrevisto: e.guardadoPrevisto,
      guardarSugerido,
      margemSeguranca,
      livreParaGastar
    },
    limiteCredito: {
      parcelaMensalMaxima,
      comprasMaximas,
      limiteDisponivelCartoes: e.limiteDisponivelCartoes,
      motivo
    },
    custoVidaMensal,
    reservaMeses,
    parametros: p
  }
}

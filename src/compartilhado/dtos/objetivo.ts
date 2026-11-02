import type { PerfilDTO } from './perfil'

export type TipoObjetivo = 'reserva' | 'viagem' | 'compra' | 'casa' | 'quitar_divida' | 'outro'
export type PrioridadeObjetivo = 1 | 2 | 3 // 1 = alta

// concluido: já atingiu | no_caminho: o aporte programado basta | viavel: cabe na folga
// apertado: só cabe com cortes | inviavel_no_prazo: não dá no prazo | sem_capacidade: não sobra nada
export type ViabilidadeObjetivo =
  | 'concluido'
  | 'no_caminho'
  | 'viavel'
  | 'apertado'
  | 'inviavel_no_prazo'
  | 'aguardando' // a folga hoje vai para objetivos mais prioritários
  | 'sem_capacidade'

export type AcaoPasso =
  | { tipo: 'programar_aporte'; valorCentavos: number }
  | { tipo: 'ajustar_prazo'; mes: string }
  | { tipo: 'ajustar_valor'; valorCentavos: number }

export interface PassoPlanoDTO {
  tipo: 'divida' | 'reserva' | 'aporte' | 'corte' | 'prazo' | 'meta' | 'concluido'
  titulo: string
  descricao: string
  acao?: AcaoPasso
}

export interface PlanoObjetivoDTO {
  viabilidade: ViabilidadeObjetivo
  aporteNecessario: number // por mês, para chegar no prazo
  aporteSugerido: number // o que cabe/recomendamos por mês
  prazoRealista: string | null // AAAA-MM com o aporte possível; null = não chega
  inicioAportes: string | null // AAAA-MM em que passa a receber aportes
  valorPossivelNoPrazo: number
  passos: PassoPlanoDTO[]
  projecao: { mes: string; valor: number }[]
}

export interface ObjetivoDTO {
  id: string
  nome: string
  tipo: TipoObjetivo
  valorAlvoCentavos: number
  valorAtualCentavos: number // inicial + aportes confirmados
  progresso: number // fração
  dataAlvo: string // AAAA-MM
  prioridade: PrioridadeObjetivo
  pessoaId: string | null // null = da família
  aporteProgramadoCentavos: number // aporte mensal recorrente já cadastrado
  plano: PlanoObjetivoDTO
}

export interface ObjetivosDTO {
  perfil: PerfilDTO
  capacidadeMensal: number // quanto sobra por mês para novos aportes (média dos próximos meses)
  aportesProgramados: number
  sugestaoReserva: number // reserva ideal pelo perfil (meses × custo de vida)
  objetivos: ObjetivoDTO[]
}

export interface CriarObjetivoEntrada {
  nome: string
  tipo: TipoObjetivo
  valorAlvoCentavos: number
  valorInicialCentavos: number
  dataAlvo: string
  prioridade: PrioridadeObjetivo
  pessoaId: string | null
}

export interface AtualizarObjetivoEntrada {
  id: string
  valorAlvoCentavos?: number
  dataAlvo?: string
}

export interface AportarObjetivoEntrada {
  objetivoId: string
  valorCentavos: number
  data: string
  pessoaId: string
}

export interface ProgramarAporteEntrada {
  objetivoId: string
  valorCentavos: number
  diaDoMes: number
  pessoaId: string
}

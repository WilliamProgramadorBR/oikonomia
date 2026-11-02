import type { TipoTransacaoDTO } from './transacao'

// Conta que se repete todo mês (aluguel, luz, salário, aporte na reserva...).
export interface RecorrenciaDTO {
  id: string
  descricao: string
  tipo: TipoTransacaoDTO
  valorVariavel: boolean // ex.: conta de luz
  valorCentavos: number // valor fixo, ou estimativa inicial se variável
  estimativaCentavos: number // valor usado nas próximas previsões (aprende com o histórico)
  diaDoMes: number
  categoriaId: string
  pessoaId: string
  cartaoId: string | null // null = boleto/débito/Pix
  inicio: string // AAAA-MM
  fim: string | null // AAAA-MM; null = sem data para acabar
  objetivoId: string | null
  historicoCentavos: number[] // últimos valores confirmados (mais recente primeiro)
  proxima: { data: string; valorCentavos: number; status: 'prevista' | 'confirmada' } | null
}

export interface CriarRecorrenciaEntrada {
  descricao: string
  tipo: TipoTransacaoDTO
  valorVariavel: boolean
  valorCentavos: number
  diaDoMes: number
  categoriaId: string
  pessoaId: string
  cartaoId: string | null
  inicio: string
  objetivoId?: string | null // aporte programado para um objetivo
}

export interface EncerrarRecorrenciaEntrada {
  id: string
  aPartirDe: string // AAAA-MM: primeiro mês que NÃO terá mais a conta
}

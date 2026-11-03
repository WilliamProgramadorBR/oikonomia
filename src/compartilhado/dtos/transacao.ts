// DTOs trafegam entre backend e frontend. Nada de classes aqui: apenas dados serializáveis.

// 'guardado' = dinheiro poupado/investido: não é gasto, alimenta reservas e objetivos.
export type TipoTransacaoDTO = 'receita' | 'despesa' | 'guardado'

// prevista: gerada por uma conta recorrente, com valor estimado, aguardando confirmação
// confirmada: valor real conhecido | ignorada: ocorrência pulada (não conta em nada)
export type StatusTransacaoDTO = 'prevista' | 'confirmada' | 'ignorada'

export interface TransacaoDTO {
  id: string
  descricao: string
  valorCentavos: number
  tipo: TipoTransacaoDTO
  status: StatusTransacaoDTO
  data: string // ISO (AAAA-MM-DD)
  pessoaId: string | null // null = da casa (todos os membros)
  categoriaId: string
  estabelecimento: string | null
  cartaoId: string | null // cobrada em cartão de crédito (parcela ou conta recorrente)
  parcela: { numero: number; total: number } | null
  recorrenciaId: string | null
  objetivoId: string | null // aporte para um objetivo (só tipo 'guardado')
  ajuste: string | null // motivo de um valor fora do normal (ex.: "Férias")
  criadoEm: string // ISO completo
}

export interface CriarTransacaoEntrada {
  descricao: string
  valorCentavos: number
  tipo: TipoTransacaoDTO
  data: string
  pessoaId: string | null // null = da casa (todos os membros)
  categoriaId: string
  estabelecimento?: string
  objetivoId?: string | null
}

export interface ConfirmarTransacaoEntrada {
  id: string
  valorCentavos: number // valor real
  data: string
}

export interface FiltroTransacoes {
  pessoaId?: string | null // null/ausente = família inteira
  mes?: string // AAAA-MM
}

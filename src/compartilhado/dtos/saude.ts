// Saúde financeira: indicadores, nota, orçamento do próximo mês e limite seguro de crédito.

export type StatusIndicador = 'bom' | 'atencao' | 'critico'
export type UnidadeIndicador = 'percentual' | 'meses' | 'quantidade'
export type ClassificacaoSaude = 'excelente' | 'boa' | 'atencao' | 'critica'

export interface IndicadorSaudeDTO {
  id: string
  nome: string
  descricao: string // o que o indicador mede
  valor: number // fração (percentual), meses ou quantidade
  unidade: UnidadeIndicador
  status: StatusIndicador
  pontuacao: number // 0 a 100
  referencia: string // ex.: "até 30%"
}

export interface OrcamentoMesDTO {
  mes: string
  renda: number
  contasRecorrentes: number
  parcelas: number
  imprevistos: number // avulsos já lançados + reserva estimada
  guardarPrevisto: number // aportes já programados
  guardarSugerido: number // a mais, para chegar perto da meta de poupança
  margemSeguranca: number
  livreParaGastar: number // depois de tudo acima, inclusive a margem
}

export interface CompraMaximaDTO {
  parcelas: number
  valorCentavos: number
  limitadaPeloCartao: boolean
}

// folga: o que sobra no orçamento | regra_parcelas: teto de 30% da renda em parcelas
// sem_folga: o orçamento do mês não comporta novas parcelas
export type MotivoLimite = 'folga' | 'regra_parcelas' | 'sem_folga'

export interface LimiteCreditoDTO {
  mes: string
  parcelaMensalMaxima: number // quanto de NOVAS parcelas cabe por mês
  comprasMaximas: CompraMaximaDTO[]
  limiteDisponivelCartoes: number | null
  motivo: MotivoLimite
  explicacao: string
}

export type TipoInsight = 'positivo' | 'atencao' | 'critico' | 'dica'

export interface InsightDTO {
  tipo: TipoInsight
  titulo: string
  texto: string
}

export type SaudeFinanceiraDTO =
  | { dadosSuficientes: false; motivo: string }
  | {
      dadosSuficientes: true
      mesReferencia: string // próximo mês
      nota: number
      classificacao: ClassificacaoSaude
      resumo: string
      indicadores: IndicadorSaudeDTO[]
      orcamento: OrcamentoMesDTO
      limiteCredito: LimiteCreditoDTO
      insights: InsightDTO[]
      fonteTextos: 'nativo' | 'ia'
    }

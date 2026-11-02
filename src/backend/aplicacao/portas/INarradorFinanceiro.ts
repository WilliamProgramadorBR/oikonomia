import type { AvaliacaoSaude, EntradaSaude } from '../../dominio/servicos/AvaliadorSaudeFinanceira'

export interface ContextoNarrativa {
  sujeito: string // já com preposição: "da família" ou "de Ana"
  mesReferencia: string // AAAA-MM
  avaliacao: AvaliacaoSaude
  entrada: EntradaSaude
  mesesNegativos: { mes: string; saldo: number }[]
  recorrentesNoCartao: number // contas recorrentes cobradas no cartão no mês de referência
  mediaImprevistos: number
  alivioParcelas: { mes: string; parcelas: number } | null // quando as parcelas voltam a um nível confortável
}

export interface Insight {
  tipo: 'positivo' | 'atencao' | 'critico' | 'dica'
  titulo: string
  texto: string
}

export interface Narrativa {
  resumo: string
  explicacaoLimite: string
  insights: Insight[]
  fonte: 'nativo' | 'ia'
}

// Transforma números em explicações. Implementação nativa hoje; uma IA (Gemini) poderá
// implementar a mesma porta, com a nativa como plano B quando a IA falhar.
export interface INarradorFinanceiro {
  narrar(contexto: ContextoNarrativa): Promise<Narrativa>
}

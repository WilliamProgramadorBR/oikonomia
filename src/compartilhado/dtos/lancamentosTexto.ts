import type { TipoTransacaoDTO } from './transacao'

// Lançamentos escritos em linguagem natural ("paguei 120 de luz ontem, aluguel 1500 todo dia 10").
// O app interpreta, mostra cada proposta para revisão e só grava depois da confirmação.

export type FormaLancamento = 'avulso' | 'recorrente' | 'cartao'

export interface PropostaLancamentoDTO {
  chave: string // identificador temporário, só para a tela
  forma: FormaLancamento
  tipo: TipoTransacaoDTO
  descricao: string
  valorCentavos: number
  data: string // AAAA-MM-DD (avulso e cartão: data do lançamento; recorrente: primeira ocorrência)
  diaDoMes: number // usado quando é recorrente
  valorVariavel: boolean // recorrente com valor que muda (luz, água)
  categoriaId: string
  pessoaId: string | null // null = todos (da casa)
  cartaoId: string | null
  parcelas: number
  estabelecimento: string | null
  trecho: string // parte do texto que originou a proposta
  suposicoes: string[] // o que foi assumido (ex.: "sem data: usei hoje")
}

export interface InterpretacaoLancamentosDTO {
  propostas: PropostaLancamentoDTO[]
  fonte: 'ia' | 'nativo'
  motivoFallback: string | null
  naoEntendido: string | null // trechos sem valor ou ambíguos demais
}

export interface ResultadoLancamentosDTO {
  criados: number
  falhas: { descricao: string; erro: string }[]
  mensagem: string
}

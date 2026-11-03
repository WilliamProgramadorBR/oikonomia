import type { ArquivoEntrada } from './importacao'
import type { TipoTransacaoDTO } from './transacao'

export type TipoContaDTO = 'corrente' | 'poupanca' | 'carteira' | 'investimento'

export interface ContaDTO {
  id: string
  nome: string
  tipo: TipoContaDTO
  instituicao: string
  cnpj8: string | null
  pessoaId: string | null // null = conta da casa (conjunta)
  ativa: boolean
  saldoAtualCentavos: number // referência + lançamentos confirmados da conta depois dela
  referencia: { data: string; saldoCentavos: number; origem: 'informado' | 'extrato' } | null
  movimentosDesdeReferencia: number
  diasDesdeConferencia: number | null
  // Saldo atual + contas previstas nesta conta até a data (fim do mês; ou do próximo, se este já está acabando).
  projecao: {
    ate: string
    saldoCentavos: number
    previstos: number
    menorSaldo: { valorCentavos: number; data: string } // ponto mais baixo no caminho
  }
}

export interface CriarContaEntrada {
  nome: string
  tipo: TipoContaDTO
  instituicao: string
  cnpj8: string | null
  pessoaId: string | null
  saldoCentavos: number // saldo de hoje (ou da data informada), visto no app do banco
  dataSaldo: string // AAAA-MM-DD
}

export interface ConferirSaldoEntrada {
  contaId: string
  saldoCentavos: number // saldo real, visto no app do banco
  data: string
}

export interface ResultadoConferenciaDTO {
  diferencaCentavos: number // real − calculado pelo app
  mensagem: string
}

// ===== Importação de extrato =====

export type SituacaoLinhaExtrato =
  | 'nova' // não existe no app: vira lançamento
  | 'prevista' // confirma uma conta recorrente prevista com o valor real
  | 'ja_lancada' // já foi lançada à mão: só liga à conta
  | 'ja_importada' // veio num extrato anterior
  | 'fatura' // pagamento da fatura do cartão: as compras já estão no cartão
  | 'transferencia' // entre contas da própria família ou resgate de investimento

export interface LinhaImportacaoDTO {
  chave: string
  idExtrato: string
  data: string
  valorCentavos: number // com sinal: positivo entrou, negativo saiu
  descricaoOriginal: string
  situacao: SituacaoLinhaExtrato
  incluir: boolean // sugestão do app; o usuário pode mudar
  explicacao: string
  transacaoId: string | null // prevista ou já lançada que corresponde à linha
  proposta: {
    tipo: TipoTransacaoDTO
    descricao: string
    categoriaId: string
    pessoaId: string | null
  }
}

export interface PreviaImportacaoDTO {
  contaId: string
  formato: 'ofx' | 'csv'
  periodo: { inicio: string; fim: string }
  linhas: LinhaImportacaoDTO[]
  saldoFinal: { valorCentavos: number; data: string } | null
}

export interface LerExtratoEntrada {
  contaId: string
  arquivo: ArquivoEntrada
}

export interface ImportarExtratoEntrada {
  contaId: string
  linhas: LinhaImportacaoDTO[] // só as marcadas para incluir, já com as edições do usuário
  saldoFinal: { valorCentavos: number; data: string } | null
}

export interface ResultadoImportacaoDTO {
  criados: number
  confirmados: number
  vinculados: number
  saldoAtualCentavos: number
  mensagem: string
}

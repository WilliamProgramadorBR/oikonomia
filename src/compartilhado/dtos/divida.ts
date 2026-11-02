import type { SistemaAmortizacao } from '../financeiro/credito'
import type { ModalidadeCredito } from './taxa'

export type TipoDivida =
  | 'emprestimo_pessoal'
  | 'consignado'
  | 'financiamento_imovel'
  | 'financiamento_veiculo'
  | 'cheque_especial'
  | 'rotativo_cartao'
  | 'outro'

export interface DividaDTO {
  id: string
  origem: 'cadastrada' | 'cartao' // 'cartao' = compra parcelada com juros (somente leitura)
  nome: string
  tipo: TipoDivida
  credor: string
  taxaMensal: number // percentual
  taxaMercadoMediana: number | null // mediana da modalidade no Banco Central
  parcelaCentavos: number // 0 = sem parcela fixa (rotativo, cheque especial)
  parcelasTotais: number
  parcelasPagas: number
  parcelasRestantes: number
  saldoAtualCentavos: number
  jurosRestantesCentavos: number
  quitacaoPrevista: string | null // AAAA-MM pagando só a parcela
  pessoaId: string | null
}

export interface CriarDividaEntrada {
  nome: string
  tipo: TipoDivida
  credor: string
  cnpj8: string | null
  taxaMensal: number
  parcelaCentavos: number
  parcelasRestantes: number
  saldoDevedorCentavos: number | null // null = calcular pela parcela, prazo e taxa
  diaVencimento: number
  pessoaId: string
}

export type MetodoQuitacao = 'avalanche' | 'bola_de_neve'

export interface ResultadoQuitacaoDTO {
  meses: number | null // null = não quita (pagamentos não cobrem os juros)
  livreEm: string | null
  totalJuros: number | null // null = não quita: os juros crescem sem limite
  ordem: { id: string; nome: string; quitadaEm: string | null }[]
}

export interface SugestaoTrocaDTO {
  dividaId: string
  dividaNome: string
  taxaAtual: number
  alternativa: string
  taxaAlternativa: number
  economiaCentavos: number
  observacao: string
}

export interface PlanoDividasDTO {
  dividas: DividaDTO[]
  totalDevido: number
  parcelasMensais: number
  jurosRestantes: number
  extraMensal: number // valor extra usado na simulação
  folgaMensal: number // sugestão de extra: folga do orçamento
  resultados: {
    minimo: ResultadoQuitacaoDTO
    avalanche: ResultadoQuitacaoDTO
    bola_de_neve: ResultadoQuitacaoDTO
  }
  recomendado: MetodoQuitacao
  explicacao: string
  trocas: SugestaoTrocaDTO[]
}

export interface SimularCreditoEntrada {
  modalidade: ModalidadeCredito
  valorCentavos: number
  meses: number
  sistema: SistemaAmortizacao
}

export interface OfertaCreditoDTO {
  cnpj8: string
  instituicao: string
  taxaMensal: number
  taxaAnual: number
  primeiraParcela: number
  ultimaParcela: number
  totalPago: number
  totalJuros: number
  cabeNoOrcamento: boolean | null // primeira parcela x limite seguro de novas parcelas
}

export interface SimulacaoCreditoDTO {
  limiteSeguroMensal: number | null
  ofertas: OfertaCreditoDTO[]
}

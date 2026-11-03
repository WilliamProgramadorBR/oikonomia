// Plano de aperto: diagnóstico do buraco de caixa, comparação das saídas pelo custo real e plano de ação.

export type TipoOferta =
  | 'parcelar_fatura' // parcelamento da fatura do cartão
  | 'credito_no_cartao' // pagar uma conta (aluguel, boleto) via Pix/boleto no crédito
  | 'emprestimo' // empréstimo novo
  | 'refinanciamento' // refinanciar/renovar uma dívida existente recebendo dinheiro
  | 'antecipacao_fgts' // antecipação do saque-aniversário
  | 'custo_zero' // negociar data com o credor, adiantamento salarial...

export type SituacaoOferta = 'avaliando' | 'recusada' | 'indisponivel'

export interface OfertaApertoEntrada {
  id?: string
  tipo: TipoOferta
  descricao: string
  grupo: string | null // ofertas do mesmo grupo são alternativas entre si (ex.: "Fatura Mercado Pago")
  valorCentavos: number // fatura/conta que deixa de pagar agora, ou dinheiro recebido
  parcelas: number
  parcelaCentavos: number
  primeiraParcelaEmMeses: number // 0 = cobrada já neste mês
  saldoSubstituidoCentavos: number // refinanciamento: saldo da dívida antiga que já seria pago
  parcelaSubstituidaCentavos: number // refinanciamento: parcela antiga que deixa de existir
  parcelasSubstituidasRestantes: number
  situacao: SituacaoOferta
  motivo: string | null
}

export type OfertaAperto = OfertaApertoEntrada & { id: string }

export interface AvisoOferta {
  regra: string // R1..R12
  texto: string
  nivel: 'info' | 'alerta' | 'perigo'
}

export interface OfertaAvaliadaDTO extends OfertaAperto {
  totalPagoCentavos: number
  custoRealCentavos: number
  custoPercentual: number // custo real ÷ valor
  alivioNoMesCentavos: number // quanto sobra a mais no caixa deste mês
  escolhida: boolean
  rotulo: 'mais_barata' | 'ultimo_recurso' | null
  avisos: AvisoOferta[]
}

export interface PassoAperto {
  chave: string
  texto: string
  valorCentavos: number | null
  feito: boolean
}

export interface MesAperto {
  mes: string // AAAA-MM
  receitas: number
  despesas: number
  saldoMes: number // receitas − despesas, sem plano
  caixaSemPlano: number // acumulado, levando a sobra (ou falta) de um mês para o outro
  caixaComPlano: number
  avisos: string[]
}

export interface PlanoApertoDTO {
  mes: string
  caixaExtraCentavos: number // dinheiro que já está na conta (informado)
  receitasMes: number
  contasMes: number
  buracoCentavos: number // quanto falta neste mês (0 = sem aperto)
  situacao: 'sem_aperto' | 'pontual' | 'estrutural'
  mesMaisApertado: string | null
  ofertas: OfertaAvaliadaDTO[]
  fecha: boolean // as saídas escolhidas cobrem o buraco
  sobraComPlanoCentavos: number
  custoTotalPlanoCentavos: number
  passos: PassoAperto[]
  planoB: string[]
  dicas: AvisoOferta[]
  projecao: MesAperto[]
  explicacao: string
}

export interface MesBaseAperto {
  mes: string
  receitas: number
  despesas: number
  avisos: string[]
}

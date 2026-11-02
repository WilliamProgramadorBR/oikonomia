import { ErroDominio } from '../erros/ErroDominio'

// 'guardado' = dinheiro poupado/investido. Não é gasto.
export type TipoTransacao = 'receita' | 'despesa' | 'guardado'
export type StatusTransacao = 'prevista' | 'confirmada' | 'ignorada'

export const TIPOS_TRANSACAO: TipoTransacao[] = ['receita', 'despesa', 'guardado']

// Quando a transação é uma parcela de compra no cartão.
export interface Parcela {
  compraId: string
  numero: number
  total: number
}

// Quando a transação foi gerada por uma conta recorrente.
export interface OcorrenciaRecorrencia {
  recorrenciaId: string
  competencia: string // AAAA-MM a que a ocorrência se refere
}

export interface PropsTransacao {
  id: string
  descricao: string
  valorCentavos: number
  tipo: TipoTransacao
  status: StatusTransacao
  data: Date
  pessoaId: string
  categoriaId: string
  estabelecimento: string | null
  cartaoId: string | null
  parcela: Parcela | null
  recorrencia: OcorrenciaRecorrencia | null
  objetivoId: string | null // aporte para um objetivo
  criadoEm: Date
}

export type DadosNovaTransacao = Pick<
  PropsTransacao,
  'descricao' | 'valorCentavos' | 'tipo' | 'data' | 'pessoaId' | 'categoriaId'
> &
  Partial<
    Pick<PropsTransacao, 'estabelecimento' | 'cartaoId' | 'parcela' | 'recorrencia' | 'status' | 'objetivoId'>
  >

const validarValor = (valorCentavos: number) => {
  if (!Number.isInteger(valorCentavos) || valorCentavos <= 0) {
    throw new ErroDominio('Informe um valor maior que zero.')
  }
}

const validarData = (data: Date) => {
  if (Number.isNaN(data.getTime())) throw new ErroDominio('Data inválida.')
}

export class Transacao {
  private constructor(private props: PropsTransacao) {}

  // Cria uma transação nova, aplicando as regras de negócio.
  static criar(dados: DadosNovaTransacao): Transacao {
    const descricao = dados.descricao.trim()

    if (!descricao) throw new ErroDominio('A descrição é obrigatória.')
    validarValor(dados.valorCentavos)
    if (!TIPOS_TRANSACAO.includes(dados.tipo)) throw new ErroDominio('Tipo de lançamento inválido.')
    validarData(dados.data)
    if (!dados.pessoaId) throw new ErroDominio('Informe a pessoa do lançamento.')
    if (!dados.categoriaId) throw new ErroDominio('Informe a categoria do lançamento.')
    if (dados.cartaoId && dados.tipo !== 'despesa') {
      throw new ErroDominio('Só despesas podem ser cobradas no cartão.')
    }
    if (dados.objetivoId && dados.tipo !== 'guardado') {
      throw new ErroDominio('Só valores guardados podem ir para um objetivo.')
    }
    if (dados.status === 'prevista' && !dados.recorrencia) {
      throw new ErroDominio('Só contas recorrentes geram lançamentos previstos.')
    }

    return new Transacao({
      ...dados,
      descricao,
      status: dados.status ?? 'confirmada',
      estabelecimento: dados.estabelecimento?.trim() || null,
      cartaoId: dados.cartaoId ?? null,
      parcela: dados.parcela ?? null,
      recorrencia: dados.recorrencia ?? null,
      objetivoId: dados.objetivoId ?? null,
      id: crypto.randomUUID(),
      criadoEm: new Date()
    })
  }

  // Reconstrói uma transação já persistida (sem revalidar).
  static restaurar(props: PropsTransacao): Transacao {
    return new Transacao(props)
  }

  // A conta chegou: grava o valor real.
  confirmar(valorCentavos: number, data: Date): void {
    if (this.props.status === 'ignorada') throw new ErroDominio('Este lançamento foi ignorado.')
    validarValor(valorCentavos)
    validarData(data)
    this.props = { ...this.props, valorCentavos, data, status: 'confirmada' }
  }

  // Pula esta ocorrência da recorrência (ex.: não houve a conta neste mês).
  ignorar(): void {
    if (!this.props.recorrencia) throw new ErroDominio('Só ocorrências de contas recorrentes podem ser ignoradas.')
    this.props = { ...this.props, status: 'ignorada' }
  }

  // Nova estimativa para uma ocorrência ainda prevista (o app aprendeu com o histórico).
  reestimar(valorCentavos: number, data: Date): void {
    if (this.props.status !== 'prevista') return
    this.props = { ...this.props, valorCentavos, data }
  }

  get id(): string {
    return this.props.id
  }
  get descricao(): string {
    return this.props.descricao
  }
  get valorCentavos(): number {
    return this.props.valorCentavos
  }
  get tipo(): TipoTransacao {
    return this.props.tipo
  }
  get status(): StatusTransacao {
    return this.props.status
  }
  get data(): Date {
    return this.props.data
  }
  get pessoaId(): string {
    return this.props.pessoaId
  }
  get categoriaId(): string {
    return this.props.categoriaId
  }
  get estabelecimento(): string | null {
    return this.props.estabelecimento
  }
  get cartaoId(): string | null {
    return this.props.cartaoId
  }
  get parcela(): Parcela | null {
    return this.props.parcela
  }
  get recorrencia(): OcorrenciaRecorrencia | null {
    return this.props.recorrencia
  }
  get objetivoId(): string | null {
    return this.props.objetivoId
  }
  get criadoEm(): Date {
    return this.props.criadoEm
  }
}

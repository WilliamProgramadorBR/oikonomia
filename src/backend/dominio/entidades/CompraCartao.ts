import { ErroDominio } from '../erros/ErroDominio'

export const MAXIMO_PARCELAS = 48

export interface PropsCompraCartao {
  id: string
  cartaoId: string
  descricao: string
  valorCentavos: number // valor à vista
  quantidadeParcelas: number
  taxaMensal: number // percentual ao mês; 0 = sem juros
  dataCompra: Date
  categoriaId: string
  pessoaId: string
  estabelecimento: string | null
  criadoEm: Date
}

export type DadosNovaCompraCartao = Omit<PropsCompraCartao, 'id' | 'criadoEm'>

// A compra em si. As parcelas viram transações (uma por fatura), geradas no caso de uso.
export class CompraCartao {
  private constructor(private readonly props: PropsCompraCartao) {}

  static criar(dados: DadosNovaCompraCartao): CompraCartao {
    const descricao = dados.descricao.trim()

    if (!descricao) throw new ErroDominio('A descrição é obrigatória.')
    if (!Number.isInteger(dados.valorCentavos) || dados.valorCentavos <= 0) {
      throw new ErroDominio('Informe um valor maior que zero.')
    }
    if (
      !Number.isInteger(dados.quantidadeParcelas) ||
      dados.quantidadeParcelas < 1 ||
      dados.quantidadeParcelas > MAXIMO_PARCELAS
    ) {
      throw new ErroDominio(`O número de parcelas deve estar entre 1 e ${MAXIMO_PARCELAS}.`)
    }
    if (!(dados.taxaMensal >= 0 && dados.taxaMensal < 100)) {
      throw new ErroDominio('A taxa de juros deve estar entre 0% e 100% ao mês.')
    }
    if (Number.isNaN(dados.dataCompra.getTime())) throw new ErroDominio('Data inválida.')
    if (!dados.categoriaId) throw new ErroDominio('Informe a categoria da compra.')
    if (!dados.pessoaId) throw new ErroDominio('Informe quem fez a compra.')

    return new CompraCartao({
      ...dados,
      descricao,
      // Compra à vista nunca tem juros
      taxaMensal: dados.quantidadeParcelas === 1 ? 0 : dados.taxaMensal,
      estabelecimento: dados.estabelecimento?.trim() || null,
      id: crypto.randomUUID(),
      criadoEm: new Date()
    })
  }

  static restaurar(props: PropsCompraCartao): CompraCartao {
    return new CompraCartao(props)
  }

  get id(): string {
    return this.props.id
  }
  get cartaoId(): string {
    return this.props.cartaoId
  }
  get descricao(): string {
    return this.props.descricao
  }
  get valorCentavos(): number {
    return this.props.valorCentavos
  }
  get quantidadeParcelas(): number {
    return this.props.quantidadeParcelas
  }
  get taxaMensal(): number {
    return this.props.taxaMensal
  }
  get dataCompra(): Date {
    return this.props.dataCompra
  }
  get categoriaId(): string {
    return this.props.categoriaId
  }
  get pessoaId(): string {
    return this.props.pessoaId
  }
  get estabelecimento(): string | null {
    return this.props.estabelecimento
  }
  get criadoEm(): Date {
    return this.props.criadoEm
  }
}

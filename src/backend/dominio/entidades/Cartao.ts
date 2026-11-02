import { ErroDominio } from '../erros/ErroDominio'

export interface PropsCartao {
  id: string
  apelido: string
  instituicao: string
  cnpj8: string | null
  limiteCentavos: number
  diaFechamento: number
  diaVencimento: number
  pessoaId: string
  cor: string
  taxaContratoMensal: number | null // percentual ao mês
  criadoEm: Date
}

export type DadosNovoCartao = Omit<PropsCartao, 'id' | 'criadoEm'>

const COR_HEX = /^#[0-9a-f]{6}$/i
const diaValido = (dia: number) => Number.isInteger(dia) && dia >= 1 && dia <= 31

export class Cartao {
  private constructor(private readonly props: PropsCartao) {}

  static criar(dados: DadosNovoCartao): Cartao {
    const apelido = dados.apelido.trim()
    const instituicao = dados.instituicao.trim()

    if (!apelido) throw new ErroDominio('Dê um apelido para o cartão.')
    if (!instituicao) throw new ErroDominio('Informe o banco ou instituição do cartão.')
    if (!Number.isInteger(dados.limiteCentavos) || dados.limiteCentavos <= 0) {
      throw new ErroDominio('Informe o limite do cartão.')
    }
    if (!diaValido(dados.diaFechamento) || !diaValido(dados.diaVencimento)) {
      throw new ErroDominio('Os dias de fechamento e vencimento devem estar entre 1 e 31.')
    }
    if (dados.diaFechamento === dados.diaVencimento) {
      throw new ErroDominio('O fechamento e o vencimento não podem ser no mesmo dia.')
    }
    if (!dados.pessoaId) throw new ErroDominio('Informe o titular do cartão.')
    if (!COR_HEX.test(dados.cor)) throw new ErroDominio('Cor inválida.')
    if (
      dados.taxaContratoMensal !== null &&
      !(dados.taxaContratoMensal > 0 && dados.taxaContratoMensal < 100)
    ) {
      throw new ErroDominio('A taxa do contrato deve estar entre 0% e 100% ao mês.')
    }

    return new Cartao({
      ...dados,
      apelido,
      instituicao,
      id: crypto.randomUUID(),
      criadoEm: new Date()
    })
  }

  static restaurar(props: PropsCartao): Cartao {
    return new Cartao(props)
  }

  get id(): string {
    return this.props.id
  }
  get apelido(): string {
    return this.props.apelido
  }
  get instituicao(): string {
    return this.props.instituicao
  }
  get cnpj8(): string | null {
    return this.props.cnpj8
  }
  get limiteCentavos(): number {
    return this.props.limiteCentavos
  }
  get diaFechamento(): number {
    return this.props.diaFechamento
  }
  get diaVencimento(): number {
    return this.props.diaVencimento
  }
  get pessoaId(): string {
    return this.props.pessoaId
  }
  get cor(): string {
    return this.props.cor
  }
  get taxaContratoMensal(): number | null {
    return this.props.taxaContratoMensal
  }
  get criadoEm(): Date {
    return this.props.criadoEm
  }
}

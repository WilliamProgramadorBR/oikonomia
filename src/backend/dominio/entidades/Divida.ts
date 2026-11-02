import { valorPresente } from '@compartilhado/financeiro/credito'
import { ErroDominio } from '../erros/ErroDominio'

export type TipoDivida =
  | 'emprestimo_pessoal'
  | 'consignado'
  | 'financiamento_imovel'
  | 'financiamento_veiculo'
  | 'cheque_especial'
  | 'rotativo_cartao'
  | 'outro'

const TIPOS: TipoDivida[] = [
  'emprestimo_pessoal',
  'consignado',
  'financiamento_imovel',
  'financiamento_veiculo',
  'cheque_especial',
  'rotativo_cartao',
  'outro'
]
// Dívidas sem parcela fixa: o saldo só cai com pagamentos extras.
const SEM_PARCELA: TipoDivida[] = ['cheque_especial', 'rotativo_cartao', 'outro']

export interface PropsDivida {
  id: string
  nome: string
  tipo: TipoDivida
  credor: string
  cnpj8: string | null
  taxaMensal: number // percentual
  parcelaCentavos: number // 0 = sem parcela fixa
  parcelasTotais: number // parcelas restantes no momento do cadastro
  saldoInicialCentavos: number // saldo devedor no cadastro
  diaVencimento: number
  pessoaId: string
  criadoEm: Date
}

export type DadosNovaDivida = Omit<PropsDivida, 'id' | 'criadoEm' | 'saldoInicialCentavos'> & {
  saldoInicialCentavos: number | null // null = calcular pela parcela, prazo e taxa
}

export class Divida {
  private constructor(private readonly props: PropsDivida) {}

  static criar(dados: DadosNovaDivida): Divida {
    const nome = dados.nome.trim()
    if (!nome) throw new ErroDominio('Dê um nome para a dívida.')
    if (!TIPOS.includes(dados.tipo)) throw new ErroDominio('Tipo de dívida inválido.')
    if (!(dados.taxaMensal >= 0 && dados.taxaMensal < 100)) {
      throw new ErroDominio('A taxa deve estar entre 0% e 100% ao mês.')
    }
    if (!Number.isInteger(dados.diaVencimento) || dados.diaVencimento < 1 || dados.diaVencimento > 31) {
      throw new ErroDominio('O dia de vencimento deve estar entre 1 e 31.')
    }
    if (!dados.pessoaId) throw new ErroDominio('Informe de quem é a dívida.')

    const temParcela = dados.parcelaCentavos > 0
    if (!temParcela && !SEM_PARCELA.includes(dados.tipo)) {
      throw new ErroDominio('Informe o valor da parcela.')
    }
    if (temParcela && (!Number.isInteger(dados.parcelasTotais) || dados.parcelasTotais < 1)) {
      throw new ErroDominio('Informe quantas parcelas faltam.')
    }

    const taxa = dados.taxaMensal / 100
    const saldo =
      dados.saldoInicialCentavos ??
      (temParcela ? Math.round(valorPresente(dados.parcelaCentavos, taxa, dados.parcelasTotais)) : 0)
    if (!Number.isInteger(saldo) || saldo <= 0) throw new ErroDominio('Informe o saldo devedor.')
    if (temParcela && dados.parcelaCentavos <= saldo * taxa) {
      throw new ErroDominio('A parcela não cobre nem os juros do mês: a dívida nunca seria quitada.')
    }

    return new Divida({
      ...dados,
      nome,
      credor: dados.credor.trim(),
      parcelasTotais: temParcela ? dados.parcelasTotais : 0,
      saldoInicialCentavos: saldo,
      id: crypto.randomUUID(),
      criadoEm: new Date()
    })
  }

  static restaurar(props: PropsDivida): Divida {
    return new Divida(props)
  }

  get id(): string {
    return this.props.id
  }
  get nome(): string {
    return this.props.nome
  }
  get tipo(): TipoDivida {
    return this.props.tipo
  }
  get credor(): string {
    return this.props.credor
  }
  get cnpj8(): string | null {
    return this.props.cnpj8
  }
  get taxaMensal(): number {
    return this.props.taxaMensal
  }
  get parcelaCentavos(): number {
    return this.props.parcelaCentavos
  }
  get parcelasTotais(): number {
    return this.props.parcelasTotais
  }
  get saldoInicialCentavos(): number {
    return this.props.saldoInicialCentavos
  }
  get diaVencimento(): number {
    return this.props.diaVencimento
  }
  get pessoaId(): string {
    return this.props.pessoaId
  }
  get criadoEm(): Date {
    return this.props.criadoEm
  }
}

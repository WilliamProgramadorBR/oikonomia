import { ErroDominio } from '../erros/ErroDominio'

export type TipoConta = 'corrente' | 'poupanca' | 'carteira' | 'investimento'
export const TIPOS_CONTA: TipoConta[] = ['corrente', 'poupanca', 'carteira', 'investimento']

export interface PropsContaBancaria {
  id: string
  nome: string
  tipo: TipoConta
  instituicao: string
  cnpj8: string | null
  pessoaId: string | null // null = conta da casa (conjunta)
  ativa: boolean
  criadoEm: Date
}

export type DadosContaBancaria = Pick<PropsContaBancaria, 'nome' | 'tipo' | 'instituicao' | 'cnpj8' | 'pessoaId'>

// Onde o dinheiro da família está: conta corrente, poupança, carteira (dinheiro vivo) ou investimento.
export class ContaBancaria {
  private constructor(private props: PropsContaBancaria) {}

  static criar(dados: DadosContaBancaria): ContaBancaria {
    return new ContaBancaria({ ...ContaBancaria.validar(dados), ativa: true, id: crypto.randomUUID(), criadoEm: new Date() })
  }

  static restaurar(props: PropsContaBancaria): ContaBancaria {
    return new ContaBancaria(props)
  }

  private static validar(dados: DadosContaBancaria): DadosContaBancaria {
    const nome = dados.nome.trim()
    if (!nome) throw new ErroDominio('Dê um nome para a conta.')
    if (nome.length > 40) throw new ErroDominio('O nome da conta deve ter no máximo 40 caracteres.')
    if (!TIPOS_CONTA.includes(dados.tipo)) throw new ErroDominio('Tipo de conta inválido.')
    return { ...dados, nome, instituicao: dados.instituicao.trim() }
  }

  arquivar(): void {
    this.props = { ...this.props, ativa: false }
  }

  get id(): string {
    return this.props.id
  }
  get nome(): string {
    return this.props.nome
  }
  get tipo(): TipoConta {
    return this.props.tipo
  }
  get instituicao(): string {
    return this.props.instituicao
  }
  get cnpj8(): string | null {
    return this.props.cnpj8
  }
  get pessoaId(): string | null {
    return this.props.pessoaId
  }
  get ativa(): boolean {
    return this.props.ativa
  }
  get criadoEm(): Date {
    return this.props.criadoEm
  }
}

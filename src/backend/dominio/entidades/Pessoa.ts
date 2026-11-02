import { ErroDominio } from '../erros/ErroDominio'

export interface PropsPessoa {
  id: string
  nome: string
  cor: string
  criadoEm: Date
}

export type DadosPessoa = Pick<PropsPessoa, 'nome' | 'cor'>

const COR_HEX = /^#[0-9a-f]{6}$/i

// Um membro da família. Cada lançamento pertence a uma pessoa.
export class Pessoa {
  private constructor(private props: PropsPessoa) {}

  static criar(dados: DadosPessoa): Pessoa {
    return new Pessoa({ ...Pessoa.validar(dados), id: crypto.randomUUID(), criadoEm: new Date() })
  }

  static restaurar(props: PropsPessoa): Pessoa {
    return new Pessoa(props)
  }

  atualizar(dados: DadosPessoa): void {
    this.props = { ...this.props, ...Pessoa.validar(dados) }
  }

  private static validar({ nome, cor }: DadosPessoa): DadosPessoa {
    const nomeLimpo = nome.trim()
    if (!nomeLimpo) throw new ErroDominio('O nome é obrigatório.')
    if (nomeLimpo.length > 40) throw new ErroDominio('O nome deve ter no máximo 40 caracteres.')
    if (!COR_HEX.test(cor)) throw new ErroDominio('Cor inválida.')
    return { nome: nomeLimpo, cor }
  }

  get id(): string {
    return this.props.id
  }
  get nome(): string {
    return this.props.nome
  }
  get cor(): string {
    return this.props.cor
  }
  get criadoEm(): Date {
    return this.props.criadoEm
  }
}

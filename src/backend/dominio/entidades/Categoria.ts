import { ErroDominio } from '../erros/ErroDominio'
import { TIPOS_TRANSACAO, type TipoTransacao } from './Transacao'

// Para onde vai o dinheiro de uma despesa (usado nas análises de "retorno" dos gastos).
export type NaturezaDespesa = 'essencial' | 'estilo_vida' | 'educacao' | 'juros' | 'outros'

const NATUREZAS: NaturezaDespesa[] = ['essencial', 'estilo_vida', 'educacao', 'juros', 'outros']

export interface PropsCategoria {
  id: string
  nome: string
  tipo: TipoTransacao
  natureza: NaturezaDespesa | null
  cor: string
  icone: string
  criadoEm: Date
}

export type DadosNovaCategoria = Omit<PropsCategoria, 'id' | 'criadoEm'>

const COR_HEX = /^#[0-9a-f]{6}$/i

export class Categoria {
  private constructor(private readonly props: PropsCategoria) {}

  static criar(dados: DadosNovaCategoria): Categoria {
    const nome = dados.nome.trim()
    if (!nome) throw new ErroDominio('O nome da categoria é obrigatório.')
    if (!TIPOS_TRANSACAO.includes(dados.tipo)) throw new ErroDominio('Tipo de categoria inválido.')
    if (!COR_HEX.test(dados.cor)) throw new ErroDominio('Cor inválida.')
    if (!dados.icone) throw new ErroDominio('Escolha um ícone.')

    // Natureza só faz sentido para despesas; sem escolha, vira "outros".
    const natureza =
      dados.tipo === 'despesa'
        ? dados.natureza && NATUREZAS.includes(dados.natureza)
          ? dados.natureza
          : 'outros'
        : null

    return new Categoria({ ...dados, nome, natureza, id: crypto.randomUUID(), criadoEm: new Date() })
  }

  static restaurar(props: PropsCategoria): Categoria {
    return new Categoria(props)
  }

  get id(): string {
    return this.props.id
  }
  get nome(): string {
    return this.props.nome
  }
  get tipo(): TipoTransacao {
    return this.props.tipo
  }
  get natureza(): NaturezaDespesa | null {
    return this.props.natureza
  }
  get cor(): string {
    return this.props.cor
  }
  get icone(): string {
    return this.props.icone
  }
  get criadoEm(): Date {
    return this.props.criadoEm
  }
}

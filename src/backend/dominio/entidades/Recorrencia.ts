import { ErroDominio } from '../erros/ErroDominio'
import { TIPOS_TRANSACAO, type TipoTransacao } from './Transacao'

const MES = /^\d{4}-(0[1-9]|1[0-2])$/

export interface PropsRecorrencia {
  id: string
  descricao: string
  tipo: TipoTransacao
  valorVariavel: boolean
  valorCentavos: number // fixo, ou estimativa inicial quando variável
  diaDoMes: number
  categoriaId: string
  pessoaId: string | null // null = da casa (todos os membros)
  cartaoId: string | null // cobrada no cartão de crédito
  contaId: string | null // conta bancária de onde sai (ou onde entra) o dinheiro
  inicio: string // AAAA-MM
  fim: string | null // AAAA-MM (inclusivo)
  objetivoId: string | null // aporte programado para um objetivo
  dividaId: string | null // parcela de uma dívida cadastrada
  criadoEm: Date
}

export type DadosNovaRecorrencia = Omit<PropsRecorrencia, 'id' | 'criadoEm' | 'fim' | 'objetivoId' | 'dividaId' | 'contaId'> & {
  objetivoId?: string | null
  contaId?: string | null
  dividaId?: string | null
}

// Conta que se repete todo mês. Gera um lançamento previsto por mês (ver SincronizarRecorrencias).
export class Recorrencia {
  private constructor(private props: PropsRecorrencia) {}

  static criar(dados: DadosNovaRecorrencia): Recorrencia {
    const descricao = dados.descricao.trim()

    if (!descricao) throw new ErroDominio('A descrição é obrigatória.')
    if (!TIPOS_TRANSACAO.includes(dados.tipo)) throw new ErroDominio('Tipo inválido.')
    if (!Number.isInteger(dados.valorCentavos) || dados.valorCentavos <= 0) {
      throw new ErroDominio(
        dados.valorVariavel ? 'Informe um valor estimado.' : 'Informe o valor da conta.'
      )
    }
    if (!Number.isInteger(dados.diaDoMes) || dados.diaDoMes < 1 || dados.diaDoMes > 31) {
      throw new ErroDominio('O dia do mês deve estar entre 1 e 31.')
    }
    if (!dados.categoriaId) throw new ErroDominio('Informe a categoria.')
    if (dados.cartaoId && dados.tipo !== 'despesa') {
      throw new ErroDominio('Só despesas podem ser cobradas no cartão.')
    }
    if (dados.cartaoId && dados.contaId) throw new ErroDominio('A conta é cobrada no cartão ou numa conta bancária, não nos dois.')
    if (!MES.test(dados.inicio)) throw new ErroDominio('Mês de início inválido.')
    if (dados.objetivoId && dados.tipo !== 'guardado') {
      throw new ErroDominio('Só aportes (guardar) podem ir para um objetivo.')
    }

    return new Recorrencia({
      ...dados,
      descricao,
      objetivoId: dados.objetivoId ?? null,
      dividaId: dados.dividaId ?? null,
      contaId: dados.contaId ?? null,
      fim: null,
      id: crypto.randomUUID(),
      criadoEm: new Date()
    })
  }

  static restaurar(props: PropsRecorrencia): Recorrencia {
    return new Recorrencia(props)
  }

  // A conta deixa de existir a partir de `mes` (o último mês com ela é o anterior).
  encerrar(ultimoMes: string): void {
    if (!MES.test(ultimoMes)) throw new ErroDominio('Mês inválido.')
    this.props = { ...this.props, fim: ultimoMes }
  }

  // Muda a conta bancária da qual a conta sai (null = não informar).
  definirConta(contaId: string | null): void {
    if (contaId && this.props.cartaoId) throw new ErroDominio('Esta conta é cobrada no cartão de crédito.')
    this.props = { ...this.props, contaId }
  }

  ocorreEm(mes: string): boolean {
    return mes >= this.props.inicio && (this.props.fim === null || mes <= this.props.fim)
  }

  get id(): string {
    return this.props.id
  }
  get descricao(): string {
    return this.props.descricao
  }
  get tipo(): TipoTransacao {
    return this.props.tipo
  }
  get valorVariavel(): boolean {
    return this.props.valorVariavel
  }
  get valorCentavos(): number {
    return this.props.valorCentavos
  }
  get diaDoMes(): number {
    return this.props.diaDoMes
  }
  get categoriaId(): string {
    return this.props.categoriaId
  }
  get pessoaId(): string | null {
    return this.props.pessoaId
  }
  get cartaoId(): string | null {
    return this.props.cartaoId
  }
  get contaId(): string | null {
    return this.props.contaId
  }
  get inicio(): string {
    return this.props.inicio
  }
  get fim(): string | null {
    return this.props.fim
  }
  get objetivoId(): string | null {
    return this.props.objetivoId
  }
  get dividaId(): string | null {
    return this.props.dividaId
  }
  get criadoEm(): Date {
    return this.props.criadoEm
  }
}

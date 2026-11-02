import { ErroDominio } from '../erros/ErroDominio'

export type TipoObjetivo = 'reserva' | 'viagem' | 'compra' | 'casa' | 'quitar_divida' | 'outro'
export type PrioridadeObjetivo = 1 | 2 | 3

const TIPOS: TipoObjetivo[] = ['reserva', 'viagem', 'compra', 'casa', 'quitar_divida', 'outro']
const MES = /^\d{4}-(0[1-9]|1[0-2])$/

export interface PropsObjetivo {
  id: string
  nome: string
  tipo: TipoObjetivo
  valorAlvoCentavos: number
  valorInicialCentavos: number // o que já existia ao criar o objetivo
  dataAlvo: string // AAAA-MM
  prioridade: PrioridadeObjetivo
  pessoaId: string | null // null = da família
  criadoEm: Date
}

export type DadosNovoObjetivo = Omit<PropsObjetivo, 'id' | 'criadoEm'>

export class Objetivo {
  private constructor(private props: PropsObjetivo) {}

  static criar(dados: DadosNovoObjetivo): Objetivo {
    const nome = dados.nome.trim()
    if (!nome) throw new ErroDominio('Dê um nome para o objetivo.')
    if (!TIPOS.includes(dados.tipo)) throw new ErroDominio('Tipo de objetivo inválido.')
    Objetivo.validarValor(dados.valorAlvoCentavos)
    if (!Number.isInteger(dados.valorInicialCentavos) || dados.valorInicialCentavos < 0) {
      throw new ErroDominio('O valor que você já tem não pode ser negativo.')
    }
    Objetivo.validarData(dados.dataAlvo)
    if (![1, 2, 3].includes(dados.prioridade)) throw new ErroDominio('Prioridade inválida.')

    return new Objetivo({ ...dados, nome, id: crypto.randomUUID(), criadoEm: new Date() })
  }

  static restaurar(props: PropsObjetivo): Objetivo {
    return new Objetivo(props)
  }

  ajustar({ valorAlvoCentavos, dataAlvo }: { valorAlvoCentavos?: number; dataAlvo?: string }): void {
    if (valorAlvoCentavos !== undefined) Objetivo.validarValor(valorAlvoCentavos)
    if (dataAlvo !== undefined) Objetivo.validarData(dataAlvo)
    this.props = {
      ...this.props,
      valorAlvoCentavos: valorAlvoCentavos ?? this.props.valorAlvoCentavos,
      dataAlvo: dataAlvo ?? this.props.dataAlvo
    }
  }

  private static validarValor(valor: number) {
    if (!Number.isInteger(valor) || valor <= 0) throw new ErroDominio('Informe quanto o objetivo custa.')
  }

  private static validarData(mes: string) {
    if (!MES.test(mes)) throw new ErroDominio('Informe o prazo do objetivo.')
  }

  get id(): string {
    return this.props.id
  }
  get nome(): string {
    return this.props.nome
  }
  get tipo(): TipoObjetivo {
    return this.props.tipo
  }
  get valorAlvoCentavos(): number {
    return this.props.valorAlvoCentavos
  }
  get valorInicialCentavos(): number {
    return this.props.valorInicialCentavos
  }
  get dataAlvo(): string {
    return this.props.dataAlvo
  }
  get prioridade(): PrioridadeObjetivo {
    return this.props.prioridade
  }
  get pessoaId(): string | null {
    return this.props.pessoaId
  }
  get criadoEm(): Date {
    return this.props.criadoEm
  }
}

import type { ContaBancaria } from '../entidades/ContaBancaria'

export interface SaldoConferido {
  id: string
  contaId: string
  data: string // AAAA-MM-DD: saldo ao fim deste dia
  saldoCentavos: number
  origem: 'informado' | 'extrato'
  criadoEm: Date
}

export interface MovimentoConta {
  entradasCentavos: number // receitas confirmadas
  saidasCentavos: number // despesas e valores guardados confirmados
  quantidade: number
}

export interface IContaRepositorio {
  salvar(conta: ContaBancaria): Promise<void>
  listar(): Promise<ContaBancaria[]>
  buscarPorId(id: string): Promise<ContaBancaria | null>
  registrarSaldo(saldo: SaldoConferido): Promise<void>
  ultimoSaldo(contaId: string): Promise<SaldoConferido | null>
  // Lançamentos confirmados da conta com data em (depois, ate].
  movimentoEntre(contaId: string, depois: string, ate: string): Promise<MovimentoConta>
}

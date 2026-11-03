import type { DefinirContaRecorrenciaEntrada } from '@compartilhado/dtos/recorrencia'
import { ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { IContaRepositorio } from '../../../dominio/repositorios/IContaRepositorio'
import type { IRecorrenciaRepositorio } from '../../../dominio/repositorios/IRecorrenciaRepositorio'
import type { SincronizarRecorrencias } from './SincronizarRecorrencias'

// Liga uma conta recorrente já cadastrada a uma conta bancária. As previsões ainda em aberto
// passam para a conta escolhida na sincronização; o que já foi confirmado não muda.
export class DefinirContaRecorrencia {
  constructor(
    private readonly recorrencias: IRecorrenciaRepositorio,
    private readonly contas: IContaRepositorio,
    private readonly sincronizar: SincronizarRecorrencias
  ) {}

  async executar({ id, contaId }: DefinirContaRecorrenciaEntrada): Promise<void> {
    const recorrencia = await this.recorrencias.buscarPorId(id)
    if (!recorrencia) throw new ErroNaoEncontrado('Conta recorrente', id)
    if (contaId && !(await this.contas.buscarPorId(contaId))) throw new ErroNaoEncontrado('Conta', contaId)
    recorrencia.definirConta(contaId)
    await this.recorrencias.salvar(recorrencia)
    await this.sincronizar.executar()
  }
}

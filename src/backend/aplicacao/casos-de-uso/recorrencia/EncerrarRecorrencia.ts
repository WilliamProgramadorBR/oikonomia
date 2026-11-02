import type { EncerrarRecorrenciaEntrada } from '@compartilhado/dtos/recorrencia'
import { deslocarMes } from '@compartilhado/utilitarios/mes'
import { ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { IRecorrenciaRepositorio } from '../../../dominio/repositorios/IRecorrenciaRepositorio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'

// Encerra a conta a partir de um mês. O histórico confirmado fica; as previsões futuras somem.
export class EncerrarRecorrencia {
  constructor(
    private readonly recorrenciaRepositorio: IRecorrenciaRepositorio,
    private readonly transacaoRepositorio: ITransacaoRepositorio
  ) {}

  async executar({ id, aPartirDe }: EncerrarRecorrenciaEntrada): Promise<void> {
    const recorrencia = await this.recorrenciaRepositorio.buscarPorId(id)
    if (!recorrencia) throw new ErroNaoEncontrado('Conta recorrente', id)

    recorrencia.encerrar(deslocarMes(aPartirDe, -1))
    await this.recorrenciaRepositorio.salvar(recorrencia)
    await this.transacaoRepositorio.removerPrevistasDesde(id, aPartirDe)
  }
}

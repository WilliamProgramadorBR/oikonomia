import type { FiltroTransacoes, TransacaoDTO } from '@compartilhado/dtos/transacao'
import { intervaloDoMes } from '@compartilhado/utilitarios/mes'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'
import { TransacaoMapeador } from '../../mapeadores/TransacaoMapeador'

export class ListarTransacoes {
  constructor(private readonly repositorio: ITransacaoRepositorio) {}

  async executar(filtro: FiltroTransacoes = {}): Promise<TransacaoDTO[]> {
    const transacoes = await this.repositorio.listar({
      pessoaId: filtro.pessoaId ?? undefined,
      ...(filtro.mes ? intervaloDoMes(filtro.mes) : {})
    })
    return transacoes.map(TransacaoMapeador.paraDTO)
  }
}

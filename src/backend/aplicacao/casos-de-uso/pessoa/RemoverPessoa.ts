import { ErroDominio, ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { IPessoaRepositorio } from '../../../dominio/repositorios/IPessoaRepositorio'
import type { IRecorrenciaRepositorio } from '../../../dominio/repositorios/IRecorrenciaRepositorio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'

export class RemoverPessoa {
  constructor(
    private readonly pessoaRepositorio: IPessoaRepositorio,
    private readonly transacaoRepositorio: ITransacaoRepositorio,
    private readonly recorrenciaRepositorio: IRecorrenciaRepositorio
  ) {}

  async executar(id: string): Promise<void> {
    const pessoa = await this.pessoaRepositorio.buscarPorId(id)
    if (!pessoa) throw new ErroNaoEncontrado('Pessoa', id)

    const temVinculos =
      (await this.transacaoRepositorio.existeComPessoa(id)) ||
      (await this.recorrenciaRepositorio.existeComPessoa(id))
    if (temVinculos) {
      throw new ErroDominio(`${pessoa.nome} possui lançamentos e não pode ser removido(a).`)
    }

    await this.pessoaRepositorio.remover(id)
  }
}

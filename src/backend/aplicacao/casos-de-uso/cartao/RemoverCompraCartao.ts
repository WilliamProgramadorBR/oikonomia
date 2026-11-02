import { ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { ICompraCartaoRepositorio } from '../../../dominio/repositorios/ICompraCartaoRepositorio'

export class RemoverCompraCartao {
  constructor(private readonly repositorio: ICompraCartaoRepositorio) {}

  async executar(id: string): Promise<void> {
    if (!(await this.repositorio.buscarPorId(id))) throw new ErroNaoEncontrado('Compra', id)
    await this.repositorio.remover(id)
  }
}

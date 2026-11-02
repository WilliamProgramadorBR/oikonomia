import { ErroDominio, ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { ICartaoRepositorio } from '../../../dominio/repositorios/ICartaoRepositorio'
import type { ICompraCartaoRepositorio } from '../../../dominio/repositorios/ICompraCartaoRepositorio'

export class RemoverCartao {
  constructor(
    private readonly cartaoRepositorio: ICartaoRepositorio,
    private readonly compraRepositorio: ICompraCartaoRepositorio
  ) {}

  async executar(id: string): Promise<void> {
    const cartao = await this.cartaoRepositorio.buscarPorId(id)
    if (!cartao) throw new ErroNaoEncontrado('Cartão', id)

    if (await this.compraRepositorio.existeNoCartao(id)) {
      throw new ErroDominio(`O cartão "${cartao.apelido}" tem compras registradas. Remova-as antes.`)
    }

    await this.cartaoRepositorio.remover(id)
  }
}

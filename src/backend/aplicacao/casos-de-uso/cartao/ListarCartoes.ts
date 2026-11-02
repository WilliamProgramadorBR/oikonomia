import type { CartaoDTO } from '@compartilhado/dtos/cartao'
import type { ICartaoRepositorio } from '../../../dominio/repositorios/ICartaoRepositorio'
import type { ITaxaMercadoRepositorio } from '../../../dominio/repositorios/ITaxaMercadoRepositorio'
import { CartaoMapeador, indexarTaxasDeCartao } from '../../mapeadores/CartaoMapeador'

export class ListarCartoes {
  constructor(
    private readonly cartaoRepositorio: ICartaoRepositorio,
    private readonly taxaRepositorio: ITaxaMercadoRepositorio
  ) {}

  async executar(): Promise<CartaoDTO[]> {
    const [cartoes, taxas] = await Promise.all([
      this.cartaoRepositorio.listar(),
      this.taxaRepositorio.listar()
    ])
    const indice = indexarTaxasDeCartao(taxas)
    return cartoes.map((cartao) => CartaoMapeador.paraDTO(cartao, indice))
  }
}

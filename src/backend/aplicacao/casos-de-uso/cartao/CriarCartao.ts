import type { CartaoDTO, CriarCartaoEntrada } from '@compartilhado/dtos/cartao'
import { Cartao } from '../../../dominio/entidades/Cartao'
import { ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { ICartaoRepositorio } from '../../../dominio/repositorios/ICartaoRepositorio'
import type { IPessoaRepositorio } from '../../../dominio/repositorios/IPessoaRepositorio'
import type { ITaxaMercadoRepositorio } from '../../../dominio/repositorios/ITaxaMercadoRepositorio'
import { CartaoMapeador, indexarTaxasDeCartao } from '../../mapeadores/CartaoMapeador'

export class CriarCartao {
  constructor(
    private readonly cartaoRepositorio: ICartaoRepositorio,
    private readonly pessoaRepositorio: IPessoaRepositorio,
    private readonly taxaRepositorio: ITaxaMercadoRepositorio
  ) {}

  async executar(entrada: CriarCartaoEntrada): Promise<CartaoDTO> {
    if (!(await this.pessoaRepositorio.buscarPorId(entrada.pessoaId))) {
      throw new ErroNaoEncontrado('Pessoa', entrada.pessoaId)
    }

    const cartao = Cartao.criar(entrada)
    await this.cartaoRepositorio.salvar(cartao)

    const taxas = indexarTaxasDeCartao(await this.taxaRepositorio.listar())
    return CartaoMapeador.paraDTO(cartao, taxas)
  }
}

import type { CompraCartaoDTO, CriarCompraCartaoEntrada } from '@compartilhado/dtos/cartao'
import {
  calcularParcelamento,
  dataDeVencimento,
  mesDaPrimeiraFatura
} from '@compartilhado/financeiro/parcelamento'
import { deslocarMes, hojeISO } from '@compartilhado/utilitarios/mes'
import { CompraCartao } from '../../../dominio/entidades/CompraCartao'
import { Transacao } from '../../../dominio/entidades/Transacao'
import { ErroDominio, ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { ICartaoRepositorio } from '../../../dominio/repositorios/ICartaoRepositorio'
import type { ICategoriaRepositorio } from '../../../dominio/repositorios/ICategoriaRepositorio'
import type { ICompraCartaoRepositorio } from '../../../dominio/repositorios/ICompraCartaoRepositorio'
import type { IPessoaRepositorio } from '../../../dominio/repositorios/IPessoaRepositorio'
import { CartaoMapeador } from '../../mapeadores/CartaoMapeador'

// Registra a compra e gera uma transação de despesa por parcela, cada uma na fatura em que vence.
export class CriarCompraCartao {
  constructor(
    private readonly compraRepositorio: ICompraCartaoRepositorio,
    private readonly cartaoRepositorio: ICartaoRepositorio,
    private readonly pessoaRepositorio: IPessoaRepositorio,
    private readonly categoriaRepositorio: ICategoriaRepositorio
  ) {}

  async executar(entrada: CriarCompraCartaoEntrada): Promise<CompraCartaoDTO> {
    const [cartao, pessoa, categoria] = await Promise.all([
      this.cartaoRepositorio.buscarPorId(entrada.cartaoId),
      this.pessoaRepositorio.buscarPorId(entrada.pessoaId),
      this.categoriaRepositorio.buscarPorId(entrada.categoriaId)
    ])
    if (!cartao) throw new ErroNaoEncontrado('Cartão', entrada.cartaoId)
    if (!pessoa) throw new ErroNaoEncontrado('Pessoa', entrada.pessoaId)
    if (!categoria) throw new ErroNaoEncontrado('Categoria', entrada.categoriaId)
    if (categoria.tipo !== 'despesa') {
      throw new ErroDominio('Compras no cartão precisam de uma categoria de despesa.')
    }

    const compra = CompraCartao.criar({
      cartaoId: cartao.id,
      descricao: entrada.descricao,
      valorCentavos: entrada.valorCentavos,
      quantidadeParcelas: entrada.quantidadeParcelas,
      taxaMensal: entrada.taxaMensal,
      dataCompra: new Date(`${entrada.dataCompra}T00:00:00Z`),
      categoriaId: categoria.id,
      pessoaId: pessoa.id,
      estabelecimento: entrada.estabelecimento ?? null
    })

    const { parcelas: valores } = calcularParcelamento(
      compra.valorCentavos,
      compra.quantidadeParcelas,
      compra.taxaMensal
    )
    const primeiraFatura = mesDaPrimeiraFatura(
      entrada.dataCompra,
      cartao.diaFechamento,
      cartao.diaVencimento
    )

    const parcelas = valores.map((valorCentavos, indice) =>
      Transacao.criar({
        descricao: compra.descricao,
        valorCentavos,
        tipo: 'despesa',
        data: new Date(
          `${dataDeVencimento(deslocarMes(primeiraFatura, indice), cartao.diaVencimento)}T00:00:00Z`
        ),
        pessoaId: compra.pessoaId,
        categoriaId: compra.categoriaId,
        estabelecimento: compra.estabelecimento,
        cartaoId: cartao.id,
        parcela: { compraId: compra.id, numero: indice + 1, total: compra.quantidadeParcelas }
      })
    )

    await this.compraRepositorio.salvar(compra, parcelas)
    return CartaoMapeador.compraParaDTO(compra, parcelas, hojeISO())
  }
}

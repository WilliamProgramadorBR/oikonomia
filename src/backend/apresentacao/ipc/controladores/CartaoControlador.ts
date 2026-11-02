import type {
  CartaoDTO,
  CompraCartaoDTO,
  CriarCartaoEntrada,
  CriarCompraCartaoEntrada,
  FiltroResumoCartoes,
  ResumoCartaoDTO
} from '@compartilhado/dtos/cartao'
import type { CriarCartao } from '../../../aplicacao/casos-de-uso/cartao/CriarCartao'
import type { CriarCompraCartao } from '../../../aplicacao/casos-de-uso/cartao/CriarCompraCartao'
import type { ListarCartoes } from '../../../aplicacao/casos-de-uso/cartao/ListarCartoes'
import type { ObterResumoCartoes } from '../../../aplicacao/casos-de-uso/cartao/ObterResumoCartoes'
import type { RemoverCartao } from '../../../aplicacao/casos-de-uso/cartao/RemoverCartao'
import type { RemoverCompraCartao } from '../../../aplicacao/casos-de-uso/cartao/RemoverCompraCartao'

export class CartaoControlador {
  constructor(
    private readonly criarCartao: CriarCartao,
    private readonly listarCartoes: ListarCartoes,
    private readonly removerCartao: RemoverCartao,
    private readonly obterResumoCartoes: ObterResumoCartoes,
    private readonly criarCompraCartao: CriarCompraCartao,
    private readonly removerCompraCartao: RemoverCompraCartao
  ) {}

  listar(): Promise<CartaoDTO[]> {
    return this.listarCartoes.executar()
  }

  criar(entrada: CriarCartaoEntrada): Promise<CartaoDTO> {
    return this.criarCartao.executar(entrada)
  }

  remover(id: string): Promise<void> {
    return this.removerCartao.executar(id)
  }

  resumo(filtro: FiltroResumoCartoes): Promise<ResumoCartaoDTO[]> {
    return this.obterResumoCartoes.executar(filtro)
  }

  criarCompra(entrada: CriarCompraCartaoEntrada): Promise<CompraCartaoDTO> {
    return this.criarCompraCartao.executar(entrada)
  }

  removerCompra(id: string): Promise<void> {
    return this.removerCompraCartao.executar(id)
  }
}

import type {
  CartaoDTO,
  CompraCartaoDTO,
  CriarCartaoEntrada,
  CriarCompraCartaoEntrada,
  FiltroResumoCartoes,
  ResumoCartaoDTO
} from '@compartilhado/dtos/cartao'
import { api, desembrulhar } from './api'

export const cartaoServico = {
  listar(): Promise<CartaoDTO[]> {
    return desembrulhar(api.cartoes.listar())
  },

  criar(entrada: CriarCartaoEntrada): Promise<CartaoDTO> {
    return desembrulhar(api.cartoes.criar(entrada))
  },

  remover(id: string): Promise<void> {
    return desembrulhar(api.cartoes.remover(id))
  },

  resumo(filtro: FiltroResumoCartoes): Promise<ResumoCartaoDTO[]> {
    return desembrulhar(api.cartoes.resumo(filtro))
  },

  criarCompra(entrada: CriarCompraCartaoEntrada): Promise<CompraCartaoDTO> {
    return desembrulhar(api.cartoes.criarCompra(entrada))
  },

  removerCompra(id: string): Promise<void> {
    return desembrulhar(api.cartoes.removerCompra(id))
  }
}

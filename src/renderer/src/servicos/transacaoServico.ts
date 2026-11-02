import type {
  ConfirmarTransacaoEntrada,
  CriarTransacaoEntrada,
  FiltroTransacoes,
  TransacaoDTO
} from '@compartilhado/dtos/transacao'
import { api, desembrulhar } from './api'

export const transacaoServico = {
  listar(filtro: FiltroTransacoes = {}): Promise<TransacaoDTO[]> {
    return desembrulhar(api.transacoes.listar(filtro))
  },

  criar(entrada: CriarTransacaoEntrada): Promise<TransacaoDTO> {
    return desembrulhar(api.transacoes.criar(entrada))
  },

  confirmar(entrada: ConfirmarTransacaoEntrada): Promise<TransacaoDTO> {
    return desembrulhar(api.transacoes.confirmar(entrada))
  },

  // Em ocorrências de contas recorrentes, "remover" significa pular este mês.
  remover(id: string): Promise<void> {
    return desembrulhar(api.transacoes.remover(id))
  }
}

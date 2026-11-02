import type {
  AtualizarPessoaEntrada,
  CriarPessoaEntrada,
  PessoaDTO
} from '@compartilhado/dtos/pessoa'
import { api, desembrulhar } from './api'

export const pessoaServico = {
  listar(): Promise<PessoaDTO[]> {
    return desembrulhar(api.pessoas.listar())
  },

  criar(entrada: CriarPessoaEntrada): Promise<PessoaDTO> {
    return desembrulhar(api.pessoas.criar(entrada))
  },

  atualizar(entrada: AtualizarPessoaEntrada): Promise<PessoaDTO> {
    return desembrulhar(api.pessoas.atualizar(entrada))
  },

  remover(id: string): Promise<void> {
    return desembrulhar(api.pessoas.remover(id))
  }
}

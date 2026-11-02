import type {
  AtualizarPessoaEntrada,
  CriarPessoaEntrada,
  PessoaDTO
} from '@compartilhado/dtos/pessoa'
import type { AtualizarPessoa } from '../../../aplicacao/casos-de-uso/pessoa/AtualizarPessoa'
import type { CriarPessoa } from '../../../aplicacao/casos-de-uso/pessoa/CriarPessoa'
import type { ListarPessoas } from '../../../aplicacao/casos-de-uso/pessoa/ListarPessoas'
import type { RemoverPessoa } from '../../../aplicacao/casos-de-uso/pessoa/RemoverPessoa'

export class PessoaControlador {
  constructor(
    private readonly criarPessoa: CriarPessoa,
    private readonly listarPessoas: ListarPessoas,
    private readonly atualizarPessoa: AtualizarPessoa,
    private readonly removerPessoa: RemoverPessoa
  ) {}

  listar(): Promise<PessoaDTO[]> {
    return this.listarPessoas.executar()
  }

  criar(entrada: CriarPessoaEntrada): Promise<PessoaDTO> {
    return this.criarPessoa.executar(entrada)
  }

  atualizar(entrada: AtualizarPessoaEntrada): Promise<PessoaDTO> {
    return this.atualizarPessoa.executar(entrada)
  }

  remover(id: string): Promise<void> {
    return this.removerPessoa.executar(id)
  }
}

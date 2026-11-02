import type {
  ConfirmarTransacaoEntrada,
  CriarTransacaoEntrada,
  FiltroTransacoes,
  TransacaoDTO
} from '@compartilhado/dtos/transacao'
import type { ConfirmarTransacao } from '../../../aplicacao/casos-de-uso/transacao/ConfirmarTransacao'
import type { CriarTransacao } from '../../../aplicacao/casos-de-uso/transacao/CriarTransacao'
import type { ListarTransacoes } from '../../../aplicacao/casos-de-uso/transacao/ListarTransacoes'
import type { RemoverTransacao } from '../../../aplicacao/casos-de-uso/transacao/RemoverTransacao'

export class TransacaoControlador {
  constructor(
    private readonly criarTransacao: CriarTransacao,
    private readonly listarTransacoes: ListarTransacoes,
    private readonly confirmarTransacao: ConfirmarTransacao,
    private readonly removerTransacao: RemoverTransacao
  ) {}

  listar(filtro: FiltroTransacoes): Promise<TransacaoDTO[]> {
    return this.listarTransacoes.executar(filtro)
  }

  criar(entrada: CriarTransacaoEntrada): Promise<TransacaoDTO> {
    return this.criarTransacao.executar(entrada)
  }

  confirmar(entrada: ConfirmarTransacaoEntrada): Promise<TransacaoDTO> {
    return this.confirmarTransacao.executar(entrada)
  }

  remover(id: string): Promise<void> {
    return this.removerTransacao.executar(id)
  }
}

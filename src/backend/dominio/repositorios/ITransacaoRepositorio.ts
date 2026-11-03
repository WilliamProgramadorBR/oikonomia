import type { Transacao } from '../entidades/Transacao'

export interface FiltroListagemTransacoes {
  pessoaId?: string
  inicio?: string // AAAA-MM-DD, inclusivo
  fim?: string // AAAA-MM-DD, inclusivo
  somenteCartao?: boolean // apenas cobranças em cartão (parcelas e contas recorrentes)
  recorrenciaId?: string
  contaId?: string
  somenteObjetivos?: boolean // apenas aportes vinculados a objetivos
  incluirIgnoradas?: boolean // padrão: ignoradas ficam de fora
}

// Porta de saída: o domínio define O QUE precisa, a infraestrutura define COMO.
// Assíncrono de propósito, para permitir implementações mobile/remotas no futuro.
export interface ITransacaoRepositorio {
  salvar(transacao: Transacao): Promise<void>
  listar(filtro?: FiltroListagemTransacoes): Promise<Transacao[]> // mais recentes primeiro
  buscarPorId(id: string): Promise<Transacao | null>
  remover(id: string): Promise<void>
  // Remove ocorrências ainda previstas da recorrência a partir da competência informada.
  removerPrevistasDesde(recorrenciaId: string, competencia: string): Promise<void>
  existeComPessoa(pessoaId: string): Promise<boolean>
  existeComCategoria(categoriaId: string): Promise<boolean>
}

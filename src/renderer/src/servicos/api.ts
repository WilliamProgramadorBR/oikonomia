import type { ApiFinanceiro } from '@compartilhado/contratos/api'
import { ERRO_NAO_AUTENTICADO, type Resposta } from '@compartilhado/contratos/resposta'

// Ponto único de acesso ao backend. No desktop vem do preload (IPC).
// Para o mobile, basta trocar esta implementação mantendo o contrato ApiFinanceiro.
export const api: ApiFinanceiro = window.api

// Disparado quando o backend recusa uma chamada por falta de sessão; o app volta ao login.
export const EVENTO_SESSAO_ENCERRADA = 'sessao-encerrada'

// Converte o envelope Resposta<T> em valor ou exceção, para uso confortável no React.
export async function desembrulhar<T>(promessa: Promise<Resposta<T>>): Promise<T> {
  const resposta = await promessa
  if (!resposta.sucesso) {
    if (resposta.erro === ERRO_NAO_AUTENTICADO) window.dispatchEvent(new Event(EVENTO_SESSAO_ENCERRADA))
    throw new Error(resposta.erro)
  }
  return resposta.dados
}

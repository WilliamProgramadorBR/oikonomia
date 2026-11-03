import type { InterpretacaoLancamentosDTO } from './lancamentosTexto'

export interface ConfiguracaoIADTO {
  chaveConfigurada: boolean // a chave nunca volta para a tela
  modelo: string
  usarNosTextos: boolean // textos da saúde financeira escritos pela IA
  criptografiaDisponivel: boolean
}

export interface SalvarConfiguracaoIAEntrada {
  chave?: string | null // ausente = manter a atual; null = remover
  modelo: string
  usarNosTextos: boolean
}

export interface TesteIADTO {
  ok: boolean
  mensagem: string
}

export interface MensagemChatDTO {
  papel: 'usuario' | 'assistente'
  texto: string
}

export interface RespostaAssistenteDTO {
  texto: string // markdown simples (negrito, listas)
  fonte: 'ia' | 'nativo'
  motivoFallback: string | null
  propostas?: InterpretacaoLancamentosDTO // quando a mensagem pede para lançar algo: revisar e confirmar
}

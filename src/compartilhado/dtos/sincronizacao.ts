export type ModoArmazenamento = 'local' | 'sincronizacao'
export type FaseSincronizacao = 'local' | 'cofre_preparado' | 'conectando' | 'ativa' | 'erro'

export interface EstadoSincronizacaoDTO {
  modo: ModoArmazenamento
  fase: FaseSincronizacao
  bloqueado: boolean
  dispositivoId: string | null
  familiaId: string | null
  ultimoCursor: number
  mensagem: string | null
}

export interface AtivarSincronizacaoEntrada {
  fraseSecreta: string
  confirmacao: string
}

export interface DesbloquearSincronizacaoEntrada {
  fraseSecreta: string
}

export interface AlterarFraseSincronizacaoEntrada {
  fraseAtual: string
  fraseNova: string
  confirmacao: string
}

export interface DesativarSincronizacaoEntrada {
  fraseSecreta: string
}

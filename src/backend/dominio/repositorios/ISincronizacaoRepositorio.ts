import type { FaseSincronizacao, ModoArmazenamento } from '../../../compartilhado/dtos/sincronizacao'

export interface EstadoSincronizacaoPersistido {
  modo: ModoArmazenamento
  fase: FaseSincronizacao
  dispositivoId: string | null
  familiaId: string | null
  servidorUrl: string | null
  cofreChave: string | null
  ultimoCursor: number
  mensagem: string | null
  atualizadoEm: Date
}

export interface ISincronizacaoRepositorio {
  obterEstado(): Promise<EstadoSincronizacaoPersistido>
  prepararCofre(entrada: { dispositivoId: string; cofreChave: string; atualizadoEm: Date }): Promise<void>
  atualizarCofre(cofreChave: string, atualizadoEm: Date): Promise<void>
  voltarParaLocal(atualizadoEm: Date): Promise<void>
}

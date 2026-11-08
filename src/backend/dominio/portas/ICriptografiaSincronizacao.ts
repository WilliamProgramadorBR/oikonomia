export interface CofreSincronizacaoCriado {
  envelope: string
  chaveDados: Uint8Array
}

export interface ICriptografiaSincronizacao {
  criar(fraseSecreta: string): Promise<CofreSincronizacaoCriado>
  abrir(fraseSecreta: string, envelope: string): Promise<Uint8Array>
  reproteger(chaveDados: Uint8Array, fraseNova: string): Promise<string>
  cifrar(chaveDados: Uint8Array, conteudo: Uint8Array, contexto: string): string
  decifrar(chaveDados: Uint8Array, envelope: string, contexto: string): Uint8Array
  limpar(chaveDados: Uint8Array): void
}

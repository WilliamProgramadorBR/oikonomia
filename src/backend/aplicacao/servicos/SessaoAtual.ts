// Quem está conectado neste momento. Vive só na memória do processo principal: o renderer
// nunca recebe o token, e todo canal IPC protegido consulta esta classe antes de executar.
export class SessaoAtual {
  private atual: { usuarioId: string; sessaoId: string } | null = null

  definir(usuarioId: string, sessaoId: string): void {
    this.atual = { usuarioId, sessaoId }
  }

  limpar(): void {
    this.atual = null
  }

  get autenticado(): boolean {
    return this.atual !== null
  }

  get usuarioId(): string | null {
    return this.atual?.usuarioId ?? null
  }

  get sessaoId(): string | null {
    return this.atual?.sessaoId ?? null
  }
}

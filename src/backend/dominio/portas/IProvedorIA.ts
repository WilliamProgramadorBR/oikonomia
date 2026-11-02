// Porta para um modelo de linguagem (hoje Gemini; amanhã, o modelo próprio do usuário).

export interface MensagemIA {
  papel: 'usuario' | 'assistente'
  texto: string
}

export interface AnexoIA {
  mime: string
  base64: string
}

export interface IProvedorIA {
  disponivel(): Promise<boolean>
  gerarTexto(pedido: { sistema: string; mensagens: MensagemIA[] }): Promise<string>
  // `esquema` segue o formato de schema de resposta do provedor (OpenAPI simplificado).
  gerarJson<T>(pedido: { sistema: string; prompt: string; esquema: object; anexos?: AnexoIA[] }): Promise<T>
}

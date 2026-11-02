import type { AnexoIA, IProvedorIA, MensagemIA } from '../../dominio/portas/IProvedorIA'
import type { IConfiguracaoIARepositorio } from '../../dominio/repositorios/IConfiguracaoIARepositorio'

const ENDERECO = 'https://generativelanguage.googleapis.com/v1beta/models'
const TEMPO_LIMITE_MS = 45_000

interface RespostaGemini {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
  error?: { code: number; message: string; status: string }
}

// Cliente da API REST do Gemini (Google AI Studio). Roda só no processo principal.
export class GeminiProvedor implements IProvedorIA {
  constructor(private readonly configuracao: IConfiguracaoIARepositorio) {}

  async disponivel(): Promise<boolean> {
    return (await this.configuracao.obter()).chave !== null
  }

  async gerarTexto({ sistema, mensagens }: { sistema: string; mensagens: MensagemIA[] }): Promise<string> {
    return this.chamar({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: mensagens.map((m) => ({ role: m.papel === 'usuario' ? 'user' : 'model', parts: [{ text: m.texto }] })),
      generationConfig: { temperature: 0.4 }
    })
  }

  async gerarJson<T>({
    sistema,
    prompt,
    esquema,
    anexos = []
  }: {
    sistema: string
    prompt: string
    esquema: object
    anexos?: AnexoIA[]
  }): Promise<T> {
    const texto = await this.chamar({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: [
        {
          role: 'user',
          parts: [...anexos.map((a) => ({ inline_data: { mime_type: a.mime, data: a.base64 } })), { text: prompt }]
        }
      ],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json', responseSchema: esquema }
    })
    try {
      return JSON.parse(texto) as T
    } catch {
      throw new Error('A IA respondeu em um formato inesperado.')
    }
  }

  private async chamar(corpo: object): Promise<string> {
    const { chave, modelo } = await this.configuracao.obter()
    if (!chave) throw new Error('Nenhuma chave do Gemini configurada.')

    let resposta: Response
    try {
      resposta = await fetch(`${ENDERECO}/${encodeURIComponent(modelo)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
        body: JSON.stringify(corpo),
        signal: AbortSignal.timeout(TEMPO_LIMITE_MS)
      })
    } catch (erro) {
      throw new Error(
        (erro as Error).name === 'TimeoutError' ? 'A IA demorou demais para responder.' : 'Sem conexão com o Gemini.'
      )
    }

    const dados = (await resposta.json().catch(() => ({}))) as RespostaGemini
    if (!resposta.ok || dados.error) throw new Error(traduzirErro(resposta.status, dados.error?.message ?? '', modelo))

    const texto = dados.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
    if (!texto.trim()) throw new Error('A IA não retornou resposta (pode ter sido bloqueada pelos filtros).')
    return texto
  }
}

function traduzirErro(status: number, mensagem: string, modelo: string): string {
  if (status === 400 && /api key/i.test(mensagem)) return 'Chave do Gemini inválida.'
  if (status === 403) return 'A chave não tem permissão para usar o Gemini.'
  if (status === 404) return `O modelo "${modelo}" não foi encontrado. Confira o nome nas configurações.`
  if (status === 429) return 'Limite de uso da IA atingido. Tente mais tarde.'
  if (status >= 500) return 'O serviço do Gemini está instável no momento.'
  return `Erro do Gemini (${status}): ${mensagem.slice(0, 160)}`
}

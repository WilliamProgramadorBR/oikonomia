import type { IProvedorIA } from '../../dominio/portas/IProvedorIA'
import type { IConfiguracaoIARepositorio } from '../../dominio/repositorios/IConfiguracaoIARepositorio'
import type { ContextoNarrativa, INarradorFinanceiro, Insight, Narrativa } from '../portas/INarradorFinanceiro'

const VALIDADE_CACHE_MS = 12 * 60 * 60 * 1000 // os números mudam pouco ao longo do dia
const TEMPO_LIMITE_MS = 20_000
const TIPOS: Insight['tipo'][] = ['critico', 'atencao', 'dica', 'positivo']

const SISTEMA = `Você escreve os textos da tela "Saúde financeira" de um app de finanças de uma família brasileira.
Recebe os números já calculados pelo app e os textos-base que o próprio app gerou.
Regras:
- Português do Brasil, tom próximo e respeitoso, frases curtas, sem jargão.
- NUNCA invente, arredonde de forma diferente ou altere valores: use exatamente os números recebidos.
- Mantenha as mesmas conclusões dos textos-base (eles seguem as regras do app); você pode deixar mais claro e mais humano.
- Não recomende produtos financeiros específicos (bancos, fundos, ações).
- No máximo 6 insights, do mais urgente ao mais tranquilo.`

const ESQUEMA = {
  type: 'OBJECT',
  properties: {
    resumo: { type: 'STRING' },
    explicacaoLimite: { type: 'STRING' },
    insights: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          tipo: { type: 'STRING', enum: TIPOS },
          titulo: { type: 'STRING' },
          texto: { type: 'STRING' }
        },
        required: ['tipo', 'titulo', 'texto']
      }
    }
  },
  required: ['resumo', 'explicacaoLimite', 'insights']
}

function comLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promessa,
    new Promise<T>((_, rejeitar) => setTimeout(() => rejeitar(new Error('tempo esgotado')), ms))
  ])
}

// Textos pela IA quando configurada; qualquer falha (sem chave, sem internet, resposta ruim)
// devolve os textos nativos, que sempre funcionam.
export class NarradorComIA implements INarradorFinanceiro {
  private readonly cache = new Map<string, { narrativa: Narrativa; expira: number }>()

  constructor(
    private readonly ia: IProvedorIA,
    private readonly configuracao: IConfiguracaoIARepositorio,
    private readonly nativo: INarradorFinanceiro
  ) {}

  async narrar(contexto: ContextoNarrativa): Promise<Narrativa> {
    const nativa = await this.nativo.narrar(contexto)
    const { chave, usarNosTextos } = await this.configuracao.obter()
    if (!chave || !usarNosTextos) return nativa

    const assinatura = JSON.stringify([contexto.sujeito, contexto.mesReferencia, contexto.entrada, contexto.avaliacao.nota])
    const guardada = this.cache.get(assinatura)
    if (guardada && guardada.expira > Date.now()) return guardada.narrativa

    try {
      const resposta = await comLimite(
        this.ia.gerarJson<Omit<Narrativa, 'fonte'>>({
          sistema: SISTEMA,
          prompt: JSON.stringify({
            sujeito: contexto.sujeito,
            mesAvaliado: contexto.mesReferencia,
            valoresEmCentavos: contexto.entrada,
            nota: contexto.avaliacao.nota,
            classificacao: contexto.avaliacao.classificacao,
            orcamentoEmCentavos: contexto.avaliacao.orcamento,
            limiteCreditoEmCentavos: contexto.avaliacao.limiteCredito.parcelaMensalMaxima,
            indicadores: contexto.avaliacao.indicadores.map(({ nome, valor, status, referencia }) => ({ nome, valor, status, referencia })),
            textosBase: { resumo: nativa.resumo, explicacaoLimite: nativa.explicacaoLimite, insights: nativa.insights }
          }),
          esquema: ESQUEMA
        }),
        TEMPO_LIMITE_MS
      )
      if (!resposta.resumo || !Array.isArray(resposta.insights)) throw new Error('resposta incompleta')

      const narrativa: Narrativa = {
        resumo: resposta.resumo,
        explicacaoLimite: resposta.explicacaoLimite || nativa.explicacaoLimite,
        insights: resposta.insights
          .filter((i) => i?.titulo && i?.texto)
          .map((i) => ({ ...i, tipo: TIPOS.includes(i.tipo) ? i.tipo : 'dica' })),
        fonte: 'ia'
      }
      this.cache.set(assinatura, { narrativa, expira: Date.now() + VALIDADE_CACHE_MS })
      return narrativa
    } catch (erro) {
      console.warn('[IA] textos nativos no lugar da IA:', (erro as Error).message)
      return nativa
    }
  }
}

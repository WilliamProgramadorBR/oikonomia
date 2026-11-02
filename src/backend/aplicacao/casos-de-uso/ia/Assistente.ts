import type {
  ConfiguracaoIADTO,
  MensagemChatDTO,
  RespostaAssistenteDTO,
  SalvarConfiguracaoIAEntrada,
  TesteIADTO
} from '@compartilhado/dtos/ia'
import type { IProvedorIA } from '../../../dominio/portas/IProvedorIA'
import type { IConfiguracaoIARepositorio } from '../../../dominio/repositorios/IConfiguracaoIARepositorio'
import { resumirParaIA, type MontadorContexto } from '../../servicos/ContextoFinanceiro'
import { responderNativamente } from '../../servicos/RespostasNativas'

const MENSAGENS_NO_HISTORICO = 12

const SISTEMA_CHAT = `Você é o assistente financeiro da família dentro do app "Projeto Financeiro".
Responda em português do Brasil, de forma direta, prática e acolhedora.
Use SOMENTE os dados do bloco DADOS (calculados pelo app, valores em reais). Se a informação não estiver lá, diga que não tem esse dado e sugira onde registrá-lo no app.
Seja realista: não prometa o que os números não sustentam; quando algo não couber, mostre o caminho (prazo maior, cortes, quitar dívidas caras antes).
Não recomende produtos financeiros específicos (fundos, ações, bancos pelo nome), exceto ao comparar taxas que estejam nos DADOS.
Formato: parágrafos curtos, listas com "- " e **negrito** para os números principais. Seja breve.`

export class ObterConfiguracaoIA {
  constructor(private readonly repositorio: IConfiguracaoIARepositorio) {}

  async executar(): Promise<ConfiguracaoIADTO> {
    const { chave, modelo, usarNosTextos } = await this.repositorio.obter()
    return {
      chaveConfigurada: chave !== null,
      modelo,
      usarNosTextos,
      criptografiaDisponivel: this.repositorio.criptografiaDisponivel()
    }
  }
}

export class SalvarConfiguracaoIA {
  constructor(
    private readonly repositorio: IConfiguracaoIARepositorio,
    private readonly obter: ObterConfiguracaoIA
  ) {}

  async executar(entrada: SalvarConfiguracaoIAEntrada): Promise<ConfiguracaoIADTO> {
    const chave = typeof entrada.chave === 'string' && !entrada.chave.trim() ? undefined : entrada.chave
    await this.repositorio.salvar({ chave, modelo: entrada.modelo, usarNosTextos: entrada.usarNosTextos })
    return this.obter.executar()
  }
}

export class TestarIA {
  constructor(private readonly ia: IProvedorIA) {}

  async executar(): Promise<TesteIADTO> {
    if (!(await this.ia.disponivel())) return { ok: false, mensagem: 'Nenhuma chave configurada.' }
    try {
      const resposta = await this.ia.gerarTexto({
        sistema: 'Responda em uma frase curta, em português.',
        mensagens: [{ papel: 'usuario', texto: 'Diga "Conexão funcionando" e mais nada.' }]
      })
      return { ok: true, mensagem: resposta.trim().slice(0, 120) }
    } catch (erro) {
      return { ok: false, mensagem: (erro as Error).message }
    }
  }
}

// Chat: Gemini com os números da família como contexto; sem IA, respostas nativas por intenção.
export class ConversarComAssistente {
  constructor(
    private readonly ia: IProvedorIA,
    private readonly montador: MontadorContexto
  ) {}

  async executar(mensagens: MensagemChatDTO[]): Promise<RespostaAssistenteDTO> {
    const pergunta = mensagens.filter((m) => m.papel === 'usuario').at(-1)?.texto ?? ''
    const contexto = await this.montador.montar()
    const nativa = (motivo: string): RespostaAssistenteDTO => ({
      texto: responderNativamente(pergunta, contexto),
      fonte: 'nativo',
      motivoFallback: motivo
    })

    if (!(await this.ia.disponivel())) return nativa('Nenhuma chave do Gemini configurada.')
    try {
      const texto = await this.ia.gerarTexto({
        sistema: `${SISTEMA_CHAT}\n\nDADOS:\n${JSON.stringify(resumirParaIA(contexto))}`,
        mensagens: mensagens.slice(-MENSAGENS_NO_HISTORICO)
      })
      return { texto, fonte: 'ia', motivoFallback: null }
    } catch (erro) {
      return nativa((erro as Error).message)
    }
  }
}

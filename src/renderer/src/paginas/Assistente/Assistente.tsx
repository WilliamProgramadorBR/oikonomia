import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Bot, KeyRound, SendHorizontal, Sparkles, Trash2 } from 'lucide-react'
import type { MensagemChatDTO, RespostaAssistenteDTO } from '@compartilhado/dtos/ia'
import { Botao } from '../../componentes/ui/Botao'
import { PropostasCarrossel } from '../../componentes/ia/PropostasCarrossel'
import { TextoFormatado } from '../../componentes/ui/TextoFormatado'
import { useConfiguracaoIA } from '../../hooks/consultas'
import { iaServico } from '../../servicos/iaServico'
import { classes } from '../../utilitarios/classes'
import estilos from './Assistente.module.css'

type Mensagem = MensagemChatDTO & Partial<Pick<RespostaAssistenteDTO, 'fonte' | 'motivoFallback' | 'propostas'>>

const SUGESTOES = [
  'Gastei 85 no mercado hoje e paguei 120 de luz ontem',
  'Aluguel 1.500 todo dia 10 para a casa',
  'Quanto posso parcelar no mês que vem?',
  'Como está o orçamento do próximo mês?',
  'Qual a melhor forma de quitar as dívidas?',
  'Meus objetivos vão dar certo?',
  'Quem gasta mais em casa?',
  'Onde dá para cortar gastos?'
]

export function Assistente() {
  const { dados: configuracao } = useConfiguracaoIA()
  const navegar = useNavigate()
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const fim = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, pensando])

  async function enviar(pergunta: string) {
    const limpa = pergunta.trim()
    if (!limpa || pensando) return
    const historico: Mensagem[] = [...mensagens, { papel: 'usuario', texto: limpa }]
    setMensagens(historico)
    setTexto('')
    setPensando(true)
    try {
      const resposta = await iaServico.conversar(historico.map(({ papel, texto: t }) => ({ papel, texto: t })))
      setMensagens([...historico, { papel: 'assistente', ...resposta }])
    } catch (erro) {
      setMensagens([
        ...historico,
        { papel: 'assistente', texto: `Não consegui responder agora: ${(erro as Error).message}`, fonte: 'nativo', motivoFallback: null }
      ])
    }
    setPensando(false)
  }

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    void enviar(texto)
  }

  const comIA = configuracao?.chaveConfigurada ?? false

  return (
    <div className={estilos.pagina}>
      <div className={estilos.status}>
        <span className={classes(estilos.ponto, comIA && estilos.pontoAtivo)} />
        {comIA ? (
          <span>
            Conversando com o <strong>Gemini</strong> ({configuracao?.modelo}). Se ele falhar, o app responde com os próprios números.
          </span>
        ) : (
          <span>
            Sem chave de IA: respostas montadas pelo próprio app, com os seus números.
          </span>
        )}
        <div className={estilos.statusAcoes}>
          {!comIA && (
            <Botao tamanho="p" variante="secundario" icone={KeyRound} onClick={() => navegar('/configuracoes')}>
              Configurar IA
            </Botao>
          )}
          {mensagens.length > 0 && (
            <Botao tamanho="p" variante="fantasma" icone={Trash2} onClick={() => setMensagens([])}>
              Limpar conversa
            </Botao>
          )}
        </div>
      </div>

      <div className={estilos.conversa}>
        {mensagens.length === 0 && (
          <div className={estilos.boasVindas}>
            <span className={estilos.iconeGrande}>
              <Sparkles size={26} />
            </span>
            <h2>Pergunte sobre as finanças da família</h2>
            <p>
              O assistente conhece o orçamento, a previsão, as dívidas, os objetivos e os gastos de cada um. Também lança
              gastos, ganhos e contas do jeito que você escreve: você revisa antes de gravar.
            </p>
            <div className={estilos.sugestoes}>
              {SUGESTOES.map((s) => (
                <button key={s} type="button" className={estilos.sugestao} onClick={() => enviar(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensagens.map((m, i) =>
          m.papel === 'usuario' ? (
            <div key={i} className={classes(estilos.linha, estilos.linhaUsuario)}>
              <div className={classes(estilos.balao, estilos.balaoUsuario)}>{m.texto}</div>
            </div>
          ) : (
            <div key={i} className={estilos.linha}>
              <span className={estilos.avatar}>
                <Bot size={16} />
              </span>
              <div className={estilos.balao}>
                <TextoFormatado texto={m.texto} />
                {m.propostas && m.propostas.propostas.length > 0 && <PropostasCarrossel interpretacao={m.propostas} />}
                <span className={classes(estilos.fonte, m.fonte === 'ia' && estilos.fonteIA)}>
                  {m.fonte === 'ia' ? (
                    <>
                      <Sparkles size={11} /> Gemini
                    </>
                  ) : (
                    'Resposta do app'
                  )}
                  {m.motivoFallback && <em> · {m.motivoFallback}</em>}
                </span>
              </div>
            </div>
          )
        )}

        {pensando && (
          <div className={estilos.linha}>
            <span className={estilos.avatar}>
              <Bot size={16} />
            </span>
            <div className={classes(estilos.balao, estilos.digitando)}>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={fim} />
      </div>

      <form className={estilos.entrada} onSubmit={aoEnviar}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Pergunte algo ou lance: “paguei 120 de luz ontem e 85 no mercado”"
          autoFocus
        />
        <Botao type="submit" icone={SendHorizontal} disabled={!texto.trim()} carregando={pensando}>
          Enviar
        </Botao>
      </form>
    </div>
  )
}

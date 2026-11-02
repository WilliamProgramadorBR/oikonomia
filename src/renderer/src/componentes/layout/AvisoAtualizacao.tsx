import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DownloadCloud, RefreshCw, Sparkles, X } from 'lucide-react'
import { useAtualizacao } from '../../hooks/useAtualizacao'
import { atualizacaoServico } from '../../servicos/atualizacaoServico'
import { Botao } from '../ui/Botao'
import estilos from './AvisoAtualizacao.module.css'

// Cartão flutuante: progresso do download e, quando pronta, o convite para reiniciar.
// "Depois" esconde o aviso; a atualização é instalada mesmo assim ao fechar o app.
export function AvisoAtualizacao() {
  const estado = useAtualizacao()
  const [dispensada, setDispensada] = useState<string | null>(null)
  const [reiniciando, setReiniciando] = useState(false)
  const cartao = useRef<HTMLDivElement>(null)

  const visivel =
    !!estado && (estado.fase === 'baixando' || estado.fase === 'pronta') && dispensada !== `${estado.fase}:${estado.versaoNova}`

  // Empurra as notificações para cima enquanto o cartão está na tela.
  useLayoutEffect(() => {
    const raiz = document.documentElement
    if (visivel && cartao.current) raiz.style.setProperty('--deslocamento-avisos', `${cartao.current.offsetHeight + 36}px`)
    else raiz.style.removeProperty('--deslocamento-avisos')
  })
  useEffect(() => () => {
    document.documentElement.style.removeProperty('--deslocamento-avisos')
  }, [])

  if (!visivel || !estado) return null
  const pronta = estado.fase === 'pronta'

  return (
    <div ref={cartao} className={estilos.cartao} role="status">
      <span className={estilos.icone}>{pronta ? <Sparkles size={18} /> : <DownloadCloud size={18} />}</span>
      <div className={estilos.texto}>
        <strong>{pronta ? `Versão ${estado.versaoNova} pronta` : `Baixando a versão ${estado.versaoNova}`}</strong>
        {pronta ? (
          <span>Reinicie para atualizar agora, ou ela será instalada quando você fechar o app.</span>
        ) : (
          <div className={estilos.barra}>
            <span style={{ width: `${estado.progresso ?? 0}%` }} />
          </div>
        )}
        {pronta && (
          <div className={estilos.acoes}>
            <Botao
              tamanho="p"
              icone={RefreshCw}
              carregando={reiniciando}
              onClick={() => {
                setReiniciando(true)
                atualizacaoServico.instalar().catch(() => setReiniciando(false))
              }}
            >
              Reiniciar agora
            </Botao>
            <Botao tamanho="p" variante="fantasma" onClick={() => setDispensada(`pronta:${estado.versaoNova}`)}>
              Depois
            </Botao>
          </div>
        )}
      </div>
      <button
        type="button"
        className={estilos.fechar}
        aria-label="Esconder aviso"
        onClick={() => setDispensada(`${estado.fase}:${estado.versaoNova}`)}
      >
        <X size={14} />
      </button>
    </div>
  )
}

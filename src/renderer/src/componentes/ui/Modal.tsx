import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import estilos from './Modal.module.css'

interface PropsModal {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  descricao?: string
  rodape?: ReactNode
  children: ReactNode
}

export function Modal({ aberto, aoFechar, titulo, descricao, rodape, children }: PropsModal) {
  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberto, aoFechar])

  if (!aberto) return null

  return createPortal(
    <div className={estilos.fundo} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={estilos.janela} role="dialog" aria-modal="true" aria-label={titulo}>
        <header className={estilos.cabecalho}>
          <div>
            <h2 className={estilos.titulo}>{titulo}</h2>
            {descricao && <p className={estilos.descricao}>{descricao}</p>}
          </div>
          <button className={estilos.fechar} onClick={aoFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className={estilos.corpo}>{children}</div>
        {rodape && <footer className={estilos.rodape}>{rodape}</footer>}
      </div>
    </div>,
    document.body
  )
}

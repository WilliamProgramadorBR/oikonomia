import type { ReactNode } from 'react'
import { classes } from '../../utilitarios/classes'
import estilos from './Cartao.module.css'

interface PropsCartao {
  titulo?: string
  subtitulo?: string
  acao?: ReactNode
  className?: string
  children: ReactNode
}

export function Cartao({ titulo, subtitulo, acao, className, children }: PropsCartao) {
  return (
    <section className={classes(estilos.cartao, className)}>
      {(titulo || acao) && (
        <header className={estilos.cabecalho}>
          <div>
            {titulo && <h2 className={estilos.titulo}>{titulo}</h2>}
            {subtitulo && <p className={estilos.subtitulo}>{subtitulo}</p>}
          </div>
          {acao}
        </header>
      )}
      {children}
    </section>
  )
}

import { Fragment, type ReactNode } from 'react'
import estilos from './TextoFormatado.module.css'

// Markdown mínimo usado pelo assistente: parágrafos, listas com "- " e **negrito**.
function negritos(linha: string): ReactNode[] {
  return linha.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith('**') && parte.endsWith('**') ? (
      <strong key={i}>{parte.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{parte}</Fragment>
    )
  )
}

export function TextoFormatado({ texto }: { texto: string }) {
  const blocos = texto.trim().split(/\n{2,}/)

  return (
    <div className={estilos.texto}>
      {blocos.map((bloco, i) => {
        const linhas = bloco.split('\n')
        if (linhas.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={i}>
              {linhas.map((l, j) => (
                <li key={j}>{negritos(l.replace(/^\s*[-*•]\s+/, ''))}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i}>
            {linhas.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {negritos(l.replace(/^#+\s*/, ''))}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}

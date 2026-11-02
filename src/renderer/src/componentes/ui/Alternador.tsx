import type { CSSProperties } from 'react'
import { classes } from '../../utilitarios/classes'
import estilos from './Alternador.module.css'

export interface OpcaoAlternador<T extends string> {
  valor: T
  rotulo: string
  cor?: string // cor do item ativo (ex.: var(--receita))
}

interface PropsAlternador<T extends string> {
  opcoes: OpcaoAlternador<T>[]
  valor: T
  aoAlterar: (valor: T) => void
  largo?: boolean
}

// Controle segmentado (tipo "pílulas"), para escolhas curtas e exclusivas.
export function Alternador<T extends string>({
  opcoes,
  valor,
  aoAlterar,
  largo
}: PropsAlternador<T>) {
  return (
    <div className={classes(estilos.alternador, largo && estilos.largo)} role="tablist">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          role="tab"
          aria-selected={opcao.valor === valor}
          className={classes(estilos.opcao, opcao.valor === valor && estilos.ativa)}
          style={opcao.cor ? ({ '--cor-ativa': opcao.cor } as CSSProperties) : undefined}
          onClick={() => aoAlterar(opcao.valor)}
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  )
}

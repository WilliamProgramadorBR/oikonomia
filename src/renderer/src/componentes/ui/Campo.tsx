import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { classes } from '../../utilitarios/classes'
import estilos from './Campo.module.css'

function Rotulo({ rotulo, children }: { rotulo?: string; children: ReactNode }) {
  if (!rotulo) return <>{children}</>
  return (
    <label className={estilos.campo}>
      <span className={estilos.rotulo}>{rotulo}</span>
      {children}
    </label>
  )
}

interface PropsCampo extends InputHTMLAttributes<HTMLInputElement> {
  rotulo?: string
  icone?: LucideIcon
}

export function Campo({ rotulo, icone: Icone, className, ...resto }: PropsCampo) {
  return (
    <Rotulo rotulo={rotulo}>
      <span className={classes(estilos.caixa, className)}>
        {Icone && <Icone size={16} className={estilos.icone} />}
        <input className={estilos.entrada} {...resto} />
      </span>
    </Rotulo>
  )
}

interface PropsCampoSelecao extends SelectHTMLAttributes<HTMLSelectElement> {
  rotulo?: string
}

export function CampoSelecao({ rotulo, className, children, ...resto }: PropsCampoSelecao) {
  return (
    <Rotulo rotulo={rotulo}>
      <span className={classes(estilos.caixa, className)}>
        <select className={estilos.entrada} {...resto}>
          {children}
        </select>
      </span>
    </Rotulo>
  )
}

interface PropsCampoMoeda {
  rotulo?: string
  centavos: number
  aoAlterar: (centavos: number) => void
  destaque?: boolean
  autoFocus?: boolean
}

// Digitação estilo "maquininha": cada dígito entra pela direita (4990 -> 49,90).
export function CampoMoeda({ rotulo, centavos, aoAlterar, destaque, autoFocus }: PropsCampoMoeda) {
  const exibido = (centavos / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  return (
    <Rotulo rotulo={rotulo}>
      <span className={classes(estilos.caixa, destaque && estilos.moedaDestaque)}>
        <span className={estilos.prefixo}>R$</span>
        <input
          className={classes(estilos.entrada, 'numero')}
          inputMode="numeric"
          value={exibido}
          autoFocus={autoFocus}
          onChange={(e) => {
            const digitos = e.target.value.replace(/\D/g, '').slice(0, 12)
            aoAlterar(Number(digitos || 0))
          }}
        />
      </span>
    </Rotulo>
  )
}

interface PropsSeletorCor {
  rotulo?: string
  cores: string[]
  valor: string
  aoAlterar: (cor: string) => void
}

export function SeletorCor({ rotulo, cores, valor, aoAlterar }: PropsSeletorCor) {
  return (
    <div className={estilos.campo}>
      {rotulo && <span className={estilos.rotulo}>{rotulo}</span>}
      <div className={estilos.cores} role="radiogroup" aria-label={rotulo}>
        {cores.map((cor) => (
          <button
            key={cor}
            type="button"
            role="radio"
            aria-checked={cor === valor}
            aria-label={cor}
            className={classes(estilos.cor, cor === valor && estilos.corAtiva)}
            style={{ background: cor, color: cor }}
            onClick={() => aoAlterar(cor)}
          />
        ))}
      </div>
    </div>
  )
}

import type { ComponentType, CSSProperties, ReactNode, SVGProps } from 'react'
import estilos from './IconesOikonomia.module.css'

export type VarianteIconeOikonomia = 'mono' | 'duotone' | 'accent'

export interface PropsIconeOikonomia extends Omit<SVGProps<SVGSVGElement>, 'children' | 'title'> {
  size?: number | string
  variant?: VarianteIconeOikonomia
  decorative?: boolean
  title?: string
  accentColor?: string
}

export type ComponenteIconeOikonomia = ComponentType<PropsIconeOikonomia>

interface PropsBase extends PropsIconeOikonomia {
  children: ReactNode
}

function IconeBase({
  children,
  size = 24,
  variant = 'duotone',
  decorative,
  title,
  accentColor,
  className,
  style,
  strokeWidth = 1.8,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
  ...resto
}: PropsBase) {
  const rotuloAcessivel = title ?? ariaLabel
  const visibilidadeExplicita = ariaHidden === true || ariaHidden === 'true'
    ? true
    : ariaHidden === false || ariaHidden === 'false'
      ? false
      : undefined
  const decorativo = decorative ?? visibilidadeExplicita ?? !rotuloAcessivel
  const estilo = accentColor
    ? ({ ...style, '--icone-acento': accentColor } as CSSProperties)
    : style

  return (
    <svg
      {...resto}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={[estilos.icone, className].filter(Boolean).join(' ')}
      data-variant={variant}
      style={estilo}
      aria-hidden={decorativo || undefined}
      aria-label={!decorativo ? rotuloAcessivel : undefined}
      role={!decorativo ? 'img' : undefined}
      focusable="false"
    >
      {!decorativo && title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

export function IconePainel(props: PropsIconeOikonomia) {
  return (
    <IconeBase {...props}>
      <path className={estilos.detalhe} d="M5 10.25 12 4.5l7 5.75v9H5z" />
      <path className={estilos.estrutura} d="M3 11 12 3.5 21 11M5 9.5v10h14v-10" />
      <path className={estilos.estrutura} d="m8 16 2.35-2.45 2.15 1.75 3.75-4" />
      <circle className={estilos.acento} cx="16.25" cy="11.3" r="1.05" />
    </IconeBase>
  )
}

export function IconeLancamentos(props: PropsIconeOikonomia) {
  return (
    <IconeBase {...props}>
      <path className={estilos.detalhe} d="M5 5.5h11a3 3 0 0 1 3 3v1H8a3 3 0 0 1-3-3z" />
      <path className={estilos.estrutura} d="M5 7.5h12.5M14.7 4.7l2.8 2.8-2.8 2.8M19 16.5H6.5M9.3 13.7l-2.8 2.8 2.8 2.8" />
      <circle className={estilos.acento} cx="4.4" cy="7.5" r="1.15" />
      <circle className={estilos.acento} cx="19.6" cy="16.5" r="1.15" />
    </IconeBase>
  )
}

export function IconeContas(props: PropsIconeOikonomia) {
  return (
    <IconeBase {...props}>
      <rect className={estilos.detalhe} x="4" y="5" width="16" height="14" rx="2.5" />
      <rect className={estilos.estrutura} x="3.25" y="3.75" width="17.5" height="16.5" rx="3" />
      <circle className={estilos.estrutura} cx="12" cy="12" r="4" />
      <path className={estilos.estrutura} d="M12 8v4l2.35 1.35M5.75 7.25h.1M18.15 16.75h.1" />
      <circle className={estilos.acento} cx="12" cy="12" r="1.05" />
    </IconeBase>
  )
}

export function IconeRecorrencias(props: PropsIconeOikonomia) {
  return (
    <IconeBase {...props}>
      <rect className={estilos.detalhe} x="4" y="5.5" width="16" height="4" rx="1" />
      <rect className={estilos.estrutura} x="3.25" y="4.25" width="17.5" height="16" rx="3" />
      <path className={estilos.estrutura} d="M7.5 2.75v3M16.5 2.75v3M3.25 8.5h17.5" />
      <path className={estilos.acento} d="M8.4 14a4 4 0 0 1 6.9-1.7l.75 1M15.6 16a4 4 0 0 1-6.9 1.7l-.75-1" />
      <path className={estilos.acento} d="M16.15 10.8v2.7h-2.7M7.85 19.2v-2.7h2.7" />
    </IconeBase>
  )
}

export function IconeCartoes(props: PropsIconeOikonomia) {
  return (
    <IconeBase {...props}>
      <rect className={estilos.detalhe} x="6" y="5" width="15" height="10" rx="2" />
      <rect className={estilos.estrutura} x="5.25" y="3.25" width="16" height="12.5" rx="2.75" />
      <path className={estilos.estrutura} d="M5.25 7.5h16M9 19.75h-4.5A2.5 2.5 0 0 1 2 17.25v-8" />
      <path className={estilos.acento} d="M16.25 11.5h2.1M15.2 12.55l4.2-2.1" />
    </IconeBase>
  )
}

export function IconePrevisao(props: PropsIconeOikonomia) {
  return (
    <IconeBase {...props}>
      <path className={estilos.detalhe} d="M4 19 9 13l3.5 2.25 3.25-4.25L20 8v11z" />
      <path className={estilos.estrutura} d="M3.25 4.25v15.5h17.5M5.5 16.75 9.5 12.5l3 2.25" />
      <path className={estilos.acento} strokeDasharray="1.2 2.2" d="m12.5 14.75 3.25-4.25 4.5-3.25" />
      <path className={estilos.acento} d="M17.4 7.25h2.85v2.85" />
    </IconeBase>
  )
}

export function IconeSaude(props: PropsIconeOikonomia) {
  return (
    <IconeBase {...props}>
      <path className={estilos.detalhe} d="M12 3.25 19 6v5.25c0 4.35-2.65 7.65-7 9.5-4.35-1.85-7-5.15-7-9.5V6z" />
      <path className={estilos.estrutura} d="M12 2.75 19.5 5.8v5.35c0 4.6-2.85 8.1-7.5 10.1-4.65-2-7.5-5.5-7.5-10.1V5.8z" />
      <path className={estilos.acento} d="M7.2 12h2.4l1.15-2.75 2.1 5.5 1.35-2.75h2.6" />
    </IconeBase>
  )
}

export function IconeObjetivos(props: PropsIconeOikonomia) {
  return (
    <IconeBase {...props}>
      <path className={estilos.detalhe} d="M4 19.5c3.2-1.25 4.4-4.5 7.4-5.75 2.6-1.1 3.5-3.65 5.2-6.25l2.5 1.25v10.75z" />
      <circle className={estilos.estrutura} cx="4" cy="19.25" r="1.25" />
      <path className={estilos.estrutura} d="M5.2 18.9c2.15-.75 2.35-3.25 4.65-4.1 2.8-1.05 3.15-3.2 5.15-5.45" />
      <path className={estilos.acento} d="M15.5 10.75V3.25M15.5 3.75h5l-1.5 2 1.5 2h-5" />
      <circle className={estilos.acento} cx="15.5" cy="10.75" r="1" />
    </IconeBase>
  )
}

export function IconeAnalises(props: PropsIconeOikonomia) {
  return (
    <IconeBase {...props}>
      <path className={estilos.detalhe} d="M4 17.5h3v-5H4zm5 0h3v-9H9zm5 0h3v-6h-3z" />
      <path className={estilos.estrutura} d="M3.25 19.75h10.5M5 17v-4M10 17V8M15 13V6" />
      <circle className={estilos.acento} cx="16" cy="15.25" r="4.25" />
      <path className={estilos.acento} d="m19.2 18.45 2.05 2.05" />
    </IconeBase>
  )
}

export function IconeDividas(props: PropsIconeOikonomia) {
  return (
    <IconeBase accentColor="var(--despesa, #fb7185)" {...props}>
      <rect className={estilos.detalhe} x="3" y="4" width="18" height="4" rx="1.5" />
      <rect className={estilos.estrutura} x="2.75" y="3.5" width="18.5" height="4.5" rx="1.5" />
      <rect className={estilos.estrutura} x="5" y="9.75" width="14" height="4.5" rx="1.5" />
      <rect className={estilos.acento} x="7.25" y="16" width="9.5" height="4.5" rx="1.5" />
    </IconeBase>
  )
}

export function IconeAperto(props: PropsIconeOikonomia) {
  return (
    <IconeBase accentColor="var(--alerta, #fbbf24)" {...props}>
      <path className={estilos.detalhe} d="M9 8h6v8H9z" />
      <circle className={estilos.estrutura} cx="4" cy="18.5" r="1.25" />
      <path className={estilos.estrutura} d="M5.2 18.1c3.05-.95 2.05-5.1 5.1-5.8 2.75-.65 2.2-4.5 5-5.15" />
      <path className={estilos.estrutura} d="M8.25 7.25v4M15.75 12.75v4" />
      <path className={estilos.acento} d="m14.8 4.85 2.6 1.85-2.1 2.35M17.4 6.7h2.85" />
      <circle className={estilos.acento} cx="20.25" cy="6.7" r="1" />
    </IconeBase>
  )
}

export function IconeAssistente(props: PropsIconeOikonomia) {
  return (
    <IconeBase {...props}>
      <path className={estilos.detalhe} d="M4 5h16v11H9l-4 3z" />
      <path className={estilos.estrutura} d="M6 3.75h12A3.25 3.25 0 0 1 21.25 7v7A3.25 3.25 0 0 1 18 17.25H10l-5.75 3v-4.2A3.25 3.25 0 0 1 2.75 13.3V7A3.25 3.25 0 0 1 6 3.75z" />
      <path className={estilos.acento} d="m8 11 2.5-3 3 4 2.5-3" />
      <circle className={estilos.acento} cx="8" cy="11" r="1" />
      <circle className={estilos.acento} cx="10.5" cy="8" r="1" />
      <circle className={estilos.acento} cx="13.5" cy="12" r="1" />
      <circle className={estilos.acento} cx="16" cy="9" r="1" />
    </IconeBase>
  )
}

export const ICONES_PRINCIPAIS_OIKONOMIA = {
  painel: IconePainel,
  lancamentos: IconeLancamentos,
  contas: IconeContas,
  recorrentes: IconeRecorrencias,
  cartoes: IconeCartoes,
  previsao: IconePrevisao,
  saude: IconeSaude,
  objetivos: IconeObjetivos,
  analises: IconeAnalises,
  dividas: IconeDividas,
  aperto: IconeAperto,
  assistente: IconeAssistente
} as const

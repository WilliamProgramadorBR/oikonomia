import { useId } from 'react'

const RAIO = 80
const COMPRIMENTO = Math.PI * RAIO
const ARCO = `M 20 100 A ${RAIO} ${RAIO} 0 0 1 180 100`

// Semicírculo de 0 a 100, do vermelho (ruim) ao verde (ótimo).
export function Medidor({ nota, largura = 220 }: { nota: number; largura?: number }) {
  const gradiente = useId()
  const preenchido = (Math.min(Math.max(nota, 0), 100) / 100) * COMPRIMENTO

  return (
    <svg viewBox="0 0 200 118" width={largura} role="img" aria-label={`Nota ${nota} de 100`}>
      <defs>
        <linearGradient id={gradiente} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="75%" stopColor="#84cc16" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <path d={ARCO} fill="none" stroke="var(--superficie-hover)" strokeWidth={16} strokeLinecap="round" />
      <path
        d={ARCO}
        fill="none"
        stroke={`url(#${gradiente})`}
        strokeWidth={16}
        strokeLinecap="round"
        strokeDasharray={`${preenchido} ${COMPRIMENTO}`}
        style={{ transition: 'stroke-dasharray 900ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      />
      <text
        x="100"
        y="88"
        textAnchor="middle"
        fill="var(--texto)"
        fontSize="40"
        fontWeight="800"
        letterSpacing="-1.5"
      >
        {nota}
      </text>
      <text x="100" y="110" textAnchor="middle" fill="var(--texto-fraco)" fontSize="12" fontWeight="600">
        de 100
      </text>
    </svg>
  )
}

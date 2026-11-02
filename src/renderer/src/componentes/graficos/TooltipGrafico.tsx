import type { TooltipContentProps } from 'recharts'
import { formatarCentavos } from '../../utilitarios/moeda'
import estilos from './Graficos.module.css'

// Tooltip com a cara do app. `cores` mapeia dataKey -> cor do marcador.
export function TooltipGrafico({
  active,
  payload,
  label,
  cores
}: TooltipContentProps & { cores?: Record<string, string> }) {
  if (!active || !payload?.length) return null

  return (
    <div className={estilos.tooltip}>
      {label !== undefined && <span className={estilos.tooltipTitulo}>{label}</span>}
      {payload.map((item) => (
        <div key={String(item.dataKey ?? item.name)} className={estilos.tooltipLinha}>
          <span
            className={estilos.ponto}
            style={{ background: cores?.[String(item.dataKey)] ?? item.payload?.cor ?? item.color }}
          />
          <span className={estilos.tooltipNome}>{item.name}</span>
          <strong className="numero">{formatarCentavos(Number(item.value))}</strong>
        </div>
      ))}
    </div>
  )
}

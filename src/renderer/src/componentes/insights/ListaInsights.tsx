import {
  CircleAlert,
  CircleCheck,
  Lightbulb,
  OctagonAlert,
  type LucideIcon
} from 'lucide-react'
import type { InsightDTO, TipoInsight } from '@compartilhado/dtos/saude'
import { classes } from '../../utilitarios/classes'
import estilos from './ListaInsights.module.css'

const ICONES: Record<TipoInsight, LucideIcon> = {
  critico: OctagonAlert,
  atencao: CircleAlert,
  dica: Lightbulb,
  positivo: CircleCheck
}

// Textos explicativos (gerados pelo app ou pela IA), do mais urgente ao mais tranquilo.
export function ListaInsights({ insights }: { insights: InsightDTO[] }) {
  return (
    <ul className={estilos.lista}>
      {insights.map((insight) => {
        const Icone = ICONES[insight.tipo]
        return (
          <li key={insight.titulo} className={classes(estilos.insight, estilos[insight.tipo])}>
            <span className={estilos.icone}>
              <Icone size={18} />
            </span>
            <div>
              <strong>{insight.titulo}</strong>
              <p>{insight.texto}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

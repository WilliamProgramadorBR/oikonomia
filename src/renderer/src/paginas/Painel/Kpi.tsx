import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { classes } from '../../utilitarios/classes'
import estilos from './Painel.module.css'

interface PropsKpi {
  rotulo: string
  valor: string
  icone: LucideIcon
  tom: 'receita' | 'despesa' | 'primaria' | 'alerta'
  destaque?: boolean
  children?: ReactNode
}

// Cartão de indicador: um número grande com contexto embaixo.
export function Kpi({ rotulo, valor, icone: Icone, tom, destaque, children }: PropsKpi) {
  return (
    <div className={classes(estilos.kpi, destaque && estilos.kpiDestaque)}>
      <div className={estilos.kpiTopo}>
        <span className={estilos.kpiRotulo}>{rotulo}</span>
        <span className={classes(estilos.kpiIcone, estilos[tom])}>
          <Icone size={17} strokeWidth={2.3} />
        </span>
      </div>
      <strong className={classes(estilos.kpiValor, 'numero')}>{valor}</strong>
      {children && <div className={estilos.kpiRodape}>{children}</div>}
    </div>
  )
}

import { CASA } from '@compartilhado/constantes/casa'
import type { CSSProperties } from 'react'
import type { FatiaGasto } from '@compartilhado/dtos/painel'
import { formatarCentavos, formatarPercentual } from '../../utilitarios/moeda'
import { Avatar } from '../ui/Elementos'
import estilos from './Graficos.module.css'

// Barras horizontais comparando quem (ou o quê) mais gastou.
export function BarrasRanking({ fatias, comAvatar }: { fatias: FatiaGasto[]; comAvatar?: boolean }) {
  const total = fatias.reduce((soma, f) => soma + f.total, 0)
  const maior = fatias[0]?.total ?? 1

  return (
    <ul className={estilos.ranking}>
      {fatias.map((fatia) => (
        <li key={fatia.id} style={{ '--cor': fatia.cor } as CSSProperties}>
          <div className={estilos.rankingTopo}>
            {comAvatar && <Avatar nome={fatia.nome} cor={fatia.cor} tamanho={24} casa={fatia.id === CASA.id} />}
            <span className={estilos.legendaNome}>{fatia.nome}</span>
            <span className={estilos.legendaPercentual}>{formatarPercentual(fatia.total / total)}</span>
            <strong className="numero">{formatarCentavos(fatia.total)}</strong>
          </div>
          <div className={estilos.trilho}>
            <div className={estilos.barra} style={{ width: `${(fatia.total / maior) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

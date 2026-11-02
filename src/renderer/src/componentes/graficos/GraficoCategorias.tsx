import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { FatiaGasto } from '@compartilhado/dtos/painel'
import { formatarCentavos, formatarPercentual } from '../../utilitarios/moeda'
import estilos from './Graficos.module.css'
import { TooltipGrafico } from './TooltipGrafico'

const MAXIMO_FATIAS = 5

// Mantém as maiores fatias e junta o resto em "Outras".
function resumir(fatias: FatiaGasto[]): FatiaGasto[] {
  if (fatias.length <= MAXIMO_FATIAS + 1) return fatias
  const resto = fatias.slice(MAXIMO_FATIAS)
  return [
    ...fatias.slice(0, MAXIMO_FATIAS),
    {
      id: 'outras',
      nome: `Outras (${resto.length})`,
      cor: '#94a3b8',
      total: resto.reduce((soma, f) => soma + f.total, 0)
    }
  ]
}

export function GraficoCategorias({ fatias }: { fatias: FatiaGasto[] }) {
  const dados = resumir(fatias)
  const total = dados.reduce((soma, f) => soma + f.total, 0)

  return (
    <div className={estilos.rosca}>
      <div className={estilos.roscaGrafico}>
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie
              data={dados}
              dataKey="total"
              nameKey="nome"
              innerRadius={64}
              outerRadius={88}
              paddingAngle={2}
              cornerRadius={5}
              stroke="none"
            >
              {dados.map((fatia) => (
                <Cell key={fatia.id} fill={fatia.cor} />
              ))}
            </Pie>
            <Tooltip content={(props) => <TooltipGrafico {...props} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className={estilos.roscaCentro}>
          <span>Total</span>
          <strong className="numero">{formatarCentavos(total)}</strong>
        </div>
      </div>

      <ul className={estilos.roscaLegenda}>
        {dados.map((fatia) => (
          <li key={fatia.id}>
            <span className={estilos.ponto} style={{ background: fatia.cor }} />
            <span className={estilos.legendaNome}>{fatia.nome}</span>
            <span className={estilos.legendaPercentual}>{formatarPercentual(fatia.total / total)}</span>
            <strong className="numero">{formatarCentavos(fatia.total)}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

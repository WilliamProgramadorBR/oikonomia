import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { PontoFluxoMensal } from '@compartilhado/dtos/painel'
import { CORES_GRAFICO } from '../../utilitarios/cores'
import { mesAbreviado } from '../../utilitarios/datas'
import { formatarCentavosCompacto } from '../../utilitarios/moeda'
import estilos from './Graficos.module.css'
import { TooltipGrafico } from './TooltipGrafico'

const EIXO = { fill: 'var(--texto-fraco)', fontSize: 12 }

const CORES_TOOLTIP = {
  receitasConfirmadas: CORES_GRAFICO.receita,
  receitasPrevistas: CORES_GRAFICO.receita,
  despesasConfirmadas: CORES_GRAFICO.despesa,
  despesasPrevistas: CORES_GRAFICO.despesa,
  saldo: CORES_GRAFICO.saldo
}

export function LegendaFluxo() {
  return (
    <div className={estilos.legenda}>
      <span>
        <i style={{ background: CORES_GRAFICO.receita }} /> Receitas
      </span>
      <span>
        <i style={{ background: CORES_GRAFICO.despesa }} /> Despesas
      </span>
      <span>
        <i className={estilos.previsto} /> Previsto
      </span>
      <span>
        <i className={estilos.traco} style={{ background: CORES_GRAFICO.saldo }} /> Saldo
      </span>
    </div>
  )
}

// Barras empilhadas: parte confirmada (cheia) + parte ainda prevista (clara).
export function GraficoFluxoMensal({ dados }: { dados: PontoFluxoMensal[] }) {
  const pontos = dados.map((p) => ({
    rotulo: mesAbreviado(p.mes),
    receitasConfirmadas: p.receitas - p.receitasPrevistas,
    receitasPrevistas: p.receitasPrevistas,
    despesasConfirmadas: p.despesas - p.despesasPrevistas,
    despesasPrevistas: p.despesasPrevistas,
    saldo: p.saldo
  }))

  return (
    <ResponsiveContainer width="100%" height={290}>
      <ComposedChart data={pontos} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barGap={4}>
        <defs>
          <linearGradient id="gradienteReceita" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CORES_GRAFICO.receita} stopOpacity={1} />
            <stop offset="100%" stopColor={CORES_GRAFICO.receita} stopOpacity={0.55} />
          </linearGradient>
          <linearGradient id="gradienteDespesa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CORES_GRAFICO.despesa} stopOpacity={1} />
            <stop offset="100%" stopColor={CORES_GRAFICO.despesa} stopOpacity={0.55} />
          </linearGradient>
        </defs>

        <CartesianGrid vertical={false} stroke="var(--borda)" strokeDasharray="4 4" />
        <XAxis dataKey="rotulo" axisLine={false} tickLine={false} tick={EIXO} dy={6} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={EIXO}
          width={76}
          tickFormatter={(v: number) => formatarCentavosCompacto(v)}
        />
        <Tooltip
          cursor={{ fill: 'var(--superficie-hover)', radius: 8 }}
          content={(props) => <TooltipGrafico {...props} cores={CORES_TOOLTIP} />}
        />

        <Bar dataKey="receitasConfirmadas" name="Receitas" stackId="r" fill="url(#gradienteReceita)" maxBarSize={26} />
        <Bar
          dataKey="receitasPrevistas"
          name="Receitas previstas"
          stackId="r"
          fill={CORES_GRAFICO.receita}
          fillOpacity={0.25}
          radius={[6, 6, 0, 0]}
          maxBarSize={26}
        />
        <Bar dataKey="despesasConfirmadas" name="Despesas" stackId="d" fill="url(#gradienteDespesa)" maxBarSize={26} />
        <Bar
          dataKey="despesasPrevistas"
          name="Despesas previstas"
          stackId="d"
          fill={CORES_GRAFICO.despesa}
          fillOpacity={0.25}
          radius={[6, 6, 0, 0]}
          maxBarSize={26}
        />
        <Line
          dataKey="saldo"
          name="Saldo"
          type="monotone"
          stroke={CORES_GRAFICO.saldo}
          strokeWidth={2.5}
          dot={{ r: 3.5, fill: 'var(--superficie)', strokeWidth: 2.5 }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

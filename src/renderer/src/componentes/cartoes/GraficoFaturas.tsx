import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { FaturaMensal } from '@compartilhado/dtos/cartao'
import { mesAbreviado } from '../../utilitarios/datas'
import { formatarCentavosCompacto } from '../../utilitarios/moeda'
import { TooltipGrafico } from '../graficos/TooltipGrafico'

const EIXO = { fill: 'var(--texto-fraco)', fontSize: 12 }

// Valor das próximas faturas; a primeira barra (mês selecionado) fica destacada.
export function GraficoFaturas({ faturas, cor }: { faturas: FaturaMensal[]; cor: string }) {
  const dados = faturas.map((f) => ({ ...f, rotulo: mesAbreviado(f.mes) }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={dados} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
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
          content={(props) => (
            <TooltipGrafico {...props} cores={{ totalCentavos: cor, previstoCentavos: cor }} />
          )}
        />
        <Bar dataKey="totalCentavos" name="Parcelas e contas" stackId="f" maxBarSize={44}>
          {dados.map((f, i) => (
            <Cell key={f.mes} fill={cor} fillOpacity={i === 0 ? 1 : 0.6} />
          ))}
        </Bar>
        <Bar
          dataKey="previstoCentavos"
          name="Contas previstas"
          stackId="f"
          fill={cor}
          fillOpacity={0.22}
          radius={[8, 8, 0, 0]}
          maxBarSize={44}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

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
import { CalendarClock, Info, Plus, TriangleAlert } from 'lucide-react'
import type { MesPrevisto } from '@compartilhado/dtos/previsao'
import { TooltipGrafico } from '../../componentes/graficos/TooltipGrafico'
import { useAcoesGlobais } from '../../componentes/layout/Layout'
import { Botao } from '../../componentes/ui/Botao'
import { Cartao } from '../../componentes/ui/Cartao'
import { EstadoVazio, Esqueleto } from '../../componentes/ui/Elementos'
import { usePrevisao } from '../../hooks/consultas'
import { classes } from '../../utilitarios/classes'
import { mesAbreviado, nomeDoMes } from '../../utilitarios/datas'
import { formatarCentavos, formatarCentavosCompacto } from '../../utilitarios/moeda'
import estilos from './Previsao.module.css'

const CORES = {
  contasRecorrentes: '#6366f1',
  parcelasCartao: '#ec4899',
  avulsos: '#f59e0b',
  guardado: '#0ea5e9',
  receitas: '#10b981'
}

const EIXO = { fill: 'var(--texto-fraco)', fontSize: 12 }

export function Previsao() {
  const { dados: previsao } = usePrevisao()
  const { novaRecorrencia } = useAcoesGlobais()

  if (!previsao) return <Esqueleto altura={480} />

  const vazio = previsao.meses.every((m) => m.receitas + m.contasRecorrentes + m.parcelasCartao === 0)
  if (vazio) {
    return (
      <Cartao>
        <EstadoVazio
          icone={CalendarClock}
          titulo="Ainda não há o que prever"
          descricao="Cadastre suas contas recorrentes e receitas. Compras parceladas no cartão também entram aqui automaticamente."
          acao={
            <Botao icone={Plus} onClick={() => novaRecorrencia()}>
              Nova conta recorrente
            </Botao>
          }
        />
      </Cartao>
    )
  }

  const [primeiro] = previsao.meses
  const compromissos = primeiro.contasRecorrentes + primeiro.parcelasCartao + primeiro.parcelasDividas
  const mesesNegativos = previsao.meses.filter((m) => m.saldoProjetado < 0)
  const dadosGrafico = previsao.meses.map((m) => ({
    rotulo: mesAbreviado(m.mes),
    contasRecorrentes: m.contasRecorrentes,
    parcelasCartao: m.parcelasCartao + m.parcelasDividas,
    avulsos: m.avulsasLancadas + m.reservaImprevistos,
    guardado: m.guardado,
    receitas: m.receitas
  }))

  return (
    <div className={estilos.pagina}>
      <div className={estilos.kpis}>
        <Kpi rotulo={`Receitas em ${mesAbreviado(primeiro.mes).toLowerCase()}`} valor={primeiro.receitas} tom="receita" />
        <Kpi rotulo="Já comprometido" valor={compromissos} detalhe="contas recorrentes + parcelas (cartão e empréstimos)" />
        <Kpi
          rotulo="Reserva para imprevistos"
          valor={primeiro.reservaImprevistos}
          detalhe={`média de ${formatarCentavos(previsao.mediaImprevistosMensal)}/mês`}
        />
        <Kpi
          rotulo="Sobra projetada"
          valor={primeiro.saldoProjetado}
          tom={primeiro.saldoProjetado >= 0 ? 'receita' : 'despesa'}
          destaque
        />
      </div>

      {mesesNegativos.length > 0 && (
        <p className={estilos.alerta}>
          <TriangleAlert size={17} />
          {mesesNegativos.length === 1
            ? `${nomeDoMes(mesesNegativos[0].mes)} fecha no vermelho pela projeção.`
            : `${mesesNegativos.length} dos próximos 6 meses fecham no vermelho pela projeção (o primeiro é ${nomeDoMes(mesesNegativos[0].mes).toLowerCase()}).`}{' '}
          Revise contas recorrentes e parcelamentos antes de assumir novos compromissos.
        </p>
      )}

      {previsao.meses.some((m) => m.avisos.length > 0) && (
        <Cartao titulo="Meses fora do normal" subtitulo="Ajustes já considerados na projeção">
          <ul className={estilos.avisos}>
            {previsao.meses
              .filter((m) => m.avisos.length > 0)
              .map((m) => (
                <li key={m.mes}>
                  <strong>{nomeDoMes(m.mes)}</strong>
                  <ul>
                    {m.avisos.map((aviso) => (
                      <li key={aviso}>{aviso}</li>
                    ))}
                  </ul>
                </li>
              ))}
          </ul>
        </Cartao>
      )}

      <Cartao
        titulo="Próximos 6 meses"
        subtitulo="Para onde a renda de cada mês já está indo"
        acao={
          <div className={estilos.legenda}>
            <Legenda cor={CORES.contasRecorrentes} rotulo="Contas recorrentes" />
            <Legenda cor={CORES.parcelasCartao} rotulo="Parcelas" />
            <Legenda cor={CORES.avulsos} rotulo="Avulsos/imprevistos" />
            <Legenda cor={CORES.guardado} rotulo="Guardar" />
            <Legenda cor={CORES.receitas} rotulo="Receitas" traco />
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={dadosGrafico} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
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
              content={(props) => <TooltipGrafico {...props} cores={CORES} />}
            />
            <Bar dataKey="contasRecorrentes" name="Contas recorrentes" stackId="gastos" fill={CORES.contasRecorrentes} maxBarSize={44} />
            <Bar dataKey="parcelasCartao" name="Parcelas" stackId="gastos" fill={CORES.parcelasCartao} maxBarSize={44} />
            <Bar dataKey="avulsos" name="Avulsos/imprevistos" stackId="gastos" fill={CORES.avulsos} fillOpacity={0.75} maxBarSize={44} />
            <Bar dataKey="guardado" name="Guardar" stackId="gastos" fill={CORES.guardado} radius={[8, 8, 0, 0]} maxBarSize={44} />
            <Line
              dataKey="receitas"
              name="Receitas"
              type="monotone"
              stroke={CORES.receitas}
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: 'var(--superficie)', strokeWidth: 2.5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Cartao>

      <Cartao titulo="Mês a mês" subtitulo="Valores estimados aparecem em itálico">
        <div className={estilos.tabelaRolagem}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Mês</th>
                <th>Receitas</th>
                <th>Contas recorrentes</th>
                <th>Parcelas</th>
                <th>Avulsos lançados</th>
                <th>Reserva imprevistos</th>
                <th>Guardar</th>
                <th>Sobra</th>
              </tr>
            </thead>
            <tbody>
              {previsao.meses.map((m) => (
                <LinhaMes key={m.mes} mes={m} />
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>

      <p className={estilos.nota}>
        <Info size={16} />
        <span>
          <strong>Como calculamos:</strong> contas recorrentes e parcelas do cartão entram pelo valor
          previsto ou confirmado. Para os gastos que não se repetem, reservamos a média dos últimos{' '}
          {previsao.mesesDeHistorico || 3} meses
          {previsao.mesesDeHistorico < 3 && ' (com pouco histórico ainda, a estimativa é aproximada)'}.
          Quanto mais você registra e confirma, mais precisa a previsão fica.
        </span>
      </p>
    </div>
  )
}

function LinhaMes({ mes: m }: { mes: MesPrevisto }) {
  return (
    <tr>
      <td className={estilos.mes}>{nomeDoMes(m.mes)}</td>
      <td className="numero">{formatarCentavos(m.receitas)}</td>
      <td className="numero">{formatarCentavos(m.contasRecorrentes)}</td>
      <td className="numero">{formatarCentavos(m.parcelasCartao + m.parcelasDividas)}</td>
      <td className="numero">{formatarCentavos(m.avulsasLancadas)}</td>
      <td className={classes('numero', estilos.estimado)}>{formatarCentavos(m.reservaImprevistos)}</td>
      <td className="numero">{formatarCentavos(m.guardado)}</td>
      <td className={classes('numero', estilos.sobra, m.saldoProjetado < 0 ? estilos.negativo : estilos.positivo)}>
        {formatarCentavos(m.saldoProjetado)}
      </td>
    </tr>
  )
}

function Kpi({
  rotulo,
  valor,
  tom,
  detalhe,
  destaque
}: {
  rotulo: string
  valor: number
  tom?: 'receita' | 'despesa'
  detalhe?: string
  destaque?: boolean
}) {
  return (
    <div className={classes(estilos.kpi, destaque && estilos.kpiDestaque)}>
      <span>{rotulo}</span>
      <strong className={classes('numero', tom && estilos[tom])}>{formatarCentavos(valor)}</strong>
      {detalhe && <small>{detalhe}</small>}
    </div>
  )
}

function Legenda({ cor, rotulo, traco }: { cor: string; rotulo: string; traco?: boolean }) {
  return (
    <span>
      <i className={traco ? estilos.traco : undefined} style={{ background: cor }} /> {rotulo}
    </span>
  )
}

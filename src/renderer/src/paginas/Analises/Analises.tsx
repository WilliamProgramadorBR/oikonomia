import { useState, type CSSProperties } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { ChartLine, Repeat, TrendingDown, TrendingUp } from 'lucide-react'
import type {
  GastoPessoaDTO,
  HabitoDTO,
  NaturezaResumoDTO,
  PontoNatureza,
  TendenciaDTO
} from '@compartilhado/dtos/analise'
import { NOMES_NATUREZAS, type NaturezaDespesa } from '@compartilhado/dtos/categoria'
import { deslocarMes, mesAtual } from '@compartilhado/utilitarios/mes'
import { TooltipGrafico } from '../../componentes/graficos/TooltipGrafico'
import { ListaInsights } from '../../componentes/insights/ListaInsights'
import { useAcoesGlobais } from '../../componentes/layout/Layout'
import { Alternador } from '../../componentes/ui/Alternador'
import { Botao } from '../../componentes/ui/Botao'
import { Cartao } from '../../componentes/ui/Cartao'
import { Avatar, EstadoVazio, Esqueleto, Etiqueta, IconeCategoria } from '../../componentes/ui/Elementos'
import { useAnalise, useCategorias } from '../../hooks/consultas'
import { classes } from '../../utilitarios/classes'
import { CORES_NATUREZA } from '../../utilitarios/cores'
import { mesAbreviado, nomeDoMes } from '../../utilitarios/datas'
import { formatarCentavos, formatarCentavosCompacto, formatarPercentual } from '../../utilitarios/moeda'
import estilos from './Analises.module.css'

const EIXO = { fill: 'var(--texto-fraco)', fontSize: 12 }
const NATUREZAS = Object.keys(NOMES_NATUREZAS) as NaturezaDespesa[]
const CORES_STATUS = { bom: 'var(--receita)', atencao: 'var(--alerta)', critico: 'var(--despesa)' }

type Janela = '3' | '6' | '12'

export function Analises() {
  const [janela, setJanela] = useState<Janela>('6')
  const { dados: analise } = useAnalise(Number(janela))

  const seletor = (
    <Alternador
      valor={janela}
      aoAlterar={setJanela}
      opcoes={[
        { valor: '3', rotulo: '3 meses' },
        { valor: '6', rotulo: '6 meses' },
        { valor: '12', rotulo: '12 meses' }
      ]}
    />
  )

  if (!analise) return <Esqueleto altura={520} />

  if (!analise.dadosSuficientes) {
    return (
      <Cartao>
        <EstadoVazio icone={ChartLine} titulo="Ainda não há o que analisar" descricao={analise.motivo} />
      </Cartao>
    )
  }

  const { periodo } = analise
  const textoPeriodo =
    periodo.meses === 1
      ? nomeDoMes(periodo.inicio)
      : `${nomeDoMes(periodo.inicio)} a ${nomeDoMes(periodo.fim).toLowerCase()}`

  return (
    <div className={estilos.pagina}>
      <div className={estilos.barra}>
        <div>
          <strong>{textoPeriodo}</strong>
          <span>
            {periodo.meses} {periodo.meses === 1 ? 'mês completo' : 'meses completos'} · média de{' '}
            {formatarCentavos(analise.mediaMensal)}/mês em despesas
            {analise.rendaMediaMensal > 0 && ` · renda média ${formatarCentavos(analise.rendaMediaMensal)}`}
          </span>
        </div>
        {seletor}
      </div>

      {analise.insights.length > 0 && (
        <Cartao titulo="O que chama atenção" subtitulo="Leitura automática do período, do mais urgente ao mais tranquilo">
          <ListaInsights insights={analise.insights} />
        </Cartao>
      )}

      {analise.porPessoa.length > 0 && (
        <section>
          <h2 className={estilos.secao}>Quem gasta o quê</h2>
          <div className={estilos.pessoas}>
            {analise.porPessoa.map((p) => (
              <CartaoPessoa key={p.pessoaId} pessoa={p} />
            ))}
          </div>
        </section>
      )}

      <div className={estilos.duasColunas}>
        <Cartao titulo="Natureza dos gastos" subtitulo="Média mensal e peso na renda, comparado à referência 50/30/20">
          <ul className={estilos.naturezas}>
            {analise.porNatureza.map((n) => (
              <LinhaNatureza key={n.natureza} natureza={n} />
            ))}
          </ul>
        </Cartao>
        <Cartao titulo="Natureza mês a mês" subtitulo="Como a composição dos gastos evolui">
          <GraficoNatureza serie={analise.serieNatureza} />
        </Cartao>
      </div>

      <Cartao
        titulo="Tendência das despesas"
        subtitulo="Regressão linear sobre os meses do período, com projeção para os próximos 3"
        acao={<ConfiancaTendencia tendencia={analise.tendenciaGeral} />}
      >
        <GraficoTendencia tendencia={analise.tendenciaGeral} />
      </Cartao>

      {analise.tendenciasCategorias.length > 0 && (
        <Cartao titulo="Categorias em movimento" subtitulo="Só tendências consistentes (a reta explica pelo menos metade da variação)">
          <ul className={estilos.tendencias}>
            {analise.tendenciasCategorias.map((t) => (
              <LinhaTendencia key={t.id} tendencia={t} />
            ))}
          </ul>
        </Cartao>
      )}

      {analise.habitos.length > 0 && <Habitos habitos={analise.habitos} />}
    </div>
  )
}

function CartaoPessoa({ pessoa: p }: { pessoa: GastoPessoaDTO }) {
  const totalNatureza = Object.values(p.porNatureza).reduce((s, v) => s + v, 0)

  return (
    <article className={estilos.pessoa} style={{ '--cor': p.cor } as CSSProperties}>
      <header className={estilos.pessoaTopo}>
        <Avatar nome={p.nome} cor={p.cor} tamanho={40} />
        <div>
          <strong>{p.nome}</strong>
          <span>{formatarCentavos(p.mediaMensal)}/mês</span>
        </div>
        <span className={estilos.participacao}>{formatarPercentual(p.participacao)}</span>
      </header>
      <div className={estilos.trilho}>
        <div style={{ width: `${p.participacao * 100}%`, background: p.cor }} />
      </div>

      <dl className={estilos.numeros}>
        <div>
          <dt>Lançamentos</dt>
          <dd>{p.lancamentos}</dd>
        </div>
        <div>
          <dt>Ticket médio</dt>
          <dd className="numero">{formatarCentavos(p.ticketMedio)}</dd>
        </div>
        <div>
          <dt>Último mês</dt>
          <dd>
            {p.variacaoUltimoMes === null ? (
              '—'
            ) : (
              <span className={p.variacaoUltimoMes > 0 ? estilos.subiu : estilos.caiu}>
                {p.variacaoUltimoMes > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {formatarPercentual(Math.abs(p.variacaoUltimoMes))}
              </span>
            )}
          </dd>
        </div>
      </dl>

      <div className={estilos.bloco}>
        <span className={estilos.rotulo}>Por natureza</span>
        <div className={estilos.barraNatureza}>
          {NATUREZAS.filter((n) => p.porNatureza[n] > 0).map((n) => (
            <span
              key={n}
              style={{ width: `${(p.porNatureza[n] / totalNatureza) * 100}%`, background: CORES_NATUREZA[n] }}
              title={`${NOMES_NATUREZAS[n]}: ${formatarCentavos(p.porNatureza[n])}`}
            />
          ))}
        </div>
      </div>

      <div className={estilos.bloco}>
        <span className={estilos.rotulo}>Onde mais gasta</span>
        <ul className={estilos.topLista}>
          {p.topCategorias.map((c) => (
            <li key={c.id}>
              <i style={{ background: c.cor }} />
              <span>{c.nome}</span>
              <strong className="numero">{formatarCentavos(c.total)}</strong>
            </li>
          ))}
        </ul>
      </div>

      {p.topEstabelecimentos.length > 0 && (
        <div className={estilos.lugares}>
          {p.topEstabelecimentos.map((e) => (
            <Etiqueta key={e.nome} cor={p.cor}>
              {e.nome} · {e.vezes}x
            </Etiqueta>
          ))}
        </div>
      )}
    </article>
  )
}

function LinhaNatureza({ natureza: n }: { natureza: NaturezaResumoDTO }) {
  return (
    <li className={estilos.natureza}>
      <i style={{ background: CORES_NATUREZA[n.natureza] }} />
      <div className={estilos.naturezaTexto}>
        <strong>{n.nome}</strong>
        <span>{n.referencia ? `Referência: ${n.referencia}` : `${formatarPercentual(n.participacaoDespesas)} das despesas`}</span>
      </div>
      <div className={estilos.naturezaValores}>
        <strong className="numero">{formatarCentavos(n.mediaMensal)}/mês</strong>
        {n.participacaoRenda !== null && <span>{formatarPercentual(n.participacaoRenda)} da renda</span>}
      </div>
      {n.status && (
        <Etiqueta cor={CORES_STATUS[n.status]}>
          {n.status === 'bom' ? 'ok' : n.status === 'atencao' ? 'atenção' : 'alto'}
        </Etiqueta>
      )}
    </li>
  )
}

function GraficoNatureza({ serie }: { serie: PontoNatureza[] }) {
  const dados = serie.map((p) => ({ ...p, rotulo: mesAbreviado(p.mes) }))
  const presentes = NATUREZAS.filter((n) => serie.some((p) => p[n] > 0))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={dados} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--borda)" strokeDasharray="4 4" />
        <XAxis dataKey="rotulo" axisLine={false} tickLine={false} tick={EIXO} dy={6} />
        <YAxis axisLine={false} tickLine={false} tick={EIXO} width={72} tickFormatter={(v: number) => formatarCentavosCompacto(v)} />
        <Tooltip
          cursor={{ fill: 'var(--superficie-hover)', radius: 8 }}
          content={(props) => <TooltipGrafico {...props} cores={CORES_NATUREZA} />}
        />
        {presentes.map((n, i) => (
          <Bar
            key={n}
            dataKey={n}
            name={NOMES_NATUREZAS[n]}
            stackId="natureza"
            fill={CORES_NATUREZA[n]}
            radius={i === presentes.length - 1 ? [6, 6, 0, 0] : undefined}
            maxBarSize={40}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

function ConfiancaTendencia({ tendencia }: { tendencia: TendenciaDTO }) {
  const sinal = tendencia.inclinacaoMensal >= 0 ? '+' : '−'
  return (
    <div className={estilos.confianca}>
      <span className="numero">
        {sinal} {formatarCentavos(Math.abs(tendencia.inclinacaoMensal))}/mês
      </span>
      <Etiqueta cor={tendencia.confiavel ? 'var(--receita)' : 'var(--texto-fraco)'}>
        {tendencia.confiavel ? 'tendência consistente' : 'oscila muito'} · R² {tendencia.r2.toFixed(2).replace('.', ',')}
      </Etiqueta>
    </div>
  )
}

function GraficoTendencia({ tendencia }: { tendencia: TendenciaDTO }) {
  const ultimo = tendencia.serie[tendencia.serie.length - 1]
  const dados = [
    ...tendencia.serie.map((p) => ({ rotulo: mesAbreviado(p.mes), valor: p.valor, ajustado: p.ajustado })),
    // A projeção começa no último ponto real para a linha tracejada ficar contínua
    ...tendencia.projecao.map((p) => ({ rotulo: mesAbreviado(p.mes), projecao: p.valor }))
  ]
  if (ultimo) Object.assign(dados[tendencia.serie.length - 1], { projecao: ultimo.ajustado })
  const cores = { valor: tendencia.cor, ajustado: '#6366f1', projecao: '#6366f1' }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={dados} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--borda)" strokeDasharray="4 4" />
        <XAxis dataKey="rotulo" axisLine={false} tickLine={false} tick={EIXO} dy={6} />
        <YAxis axisLine={false} tickLine={false} tick={EIXO} width={76} tickFormatter={(v: number) => formatarCentavosCompacto(v)} />
        <Tooltip
          cursor={{ fill: 'var(--superficie-hover)', radius: 8 }}
          content={(props) => <TooltipGrafico {...props} cores={cores} />}
        />
        <Bar dataKey="valor" name="Despesas" fill={tendencia.cor} fillOpacity={0.75} radius={[6, 6, 0, 0]} maxBarSize={40} />
        <Line dataKey="ajustado" name="Tendência" stroke="#6366f1" strokeWidth={2.5} dot={false} />
        <Line
          dataKey="projecao"
          name="Projeção"
          stroke="#6366f1"
          strokeWidth={2.5}
          strokeDasharray="6 6"
          dot={{ r: 3.5, fill: 'var(--superficie)', strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function LinhaTendencia({ tendencia: t }: { tendencia: TendenciaDTO }) {
  const subindo = t.inclinacaoMensal > 0
  return (
    <li className={estilos.tendencia}>
      <span className={classes(estilos.seta, subindo ? estilos.subiu : estilos.caiu)}>
        {subindo ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
      </span>
      <div className={estilos.tendenciaTexto}>
        <strong>{t.nome}</strong>
        <span>
          {subindo ? 'Sobe' : 'Cai'} {formatarCentavos(Math.abs(t.inclinacaoMensal))} por mês (
          {formatarPercentual(Math.abs(t.variacaoMensal))} da média)
        </span>
      </div>
      <div className={estilos.mini}>
        <ResponsiveContainer width="100%" height={40}>
          <LineChart data={t.serie}>
            <Line dataKey="valor" stroke={t.cor} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="ajustado" stroke="var(--texto-fraco)" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <strong className={classes('numero', estilos.tendenciaProjecao)}>
        {formatarCentavos(t.projecao[t.projecao.length - 1].valor)}
        <small>em {mesAbreviado(t.projecao[t.projecao.length - 1].mes).toLowerCase()}</small>
      </strong>
    </li>
  )
}

function Habitos({ habitos }: { habitos: HabitoDTO[] }) {
  const { novaRecorrencia } = useAcoesGlobais()
  const { dados: categorias } = useCategorias()

  return (
    <Cartao
      titulo="Gastos que viraram hábito"
      subtitulo="Se repetem quase todo mês com valor parecido, mas não estão cadastrados como recorrentes"
    >
      <ul className={estilos.habitos}>
        {habitos.map((h) => {
          const categoria = categorias?.find((c) => c.id === h.categoriaId)
          return (
            <li key={`${h.categoriaId}-${h.descricao}`} className={estilos.habito}>
              <IconeCategoria icone={categoria?.icone ?? 'outros'} cor={categoria?.cor ?? '#94a3b8'} />
              <div className={estilos.habitoTexto}>
                <strong>{h.descricao}</strong>
                <span>
                  {categoria?.nome} · em {h.mesesComOcorrencia} meses · por volta do dia {h.diaTipico}
                </span>
              </div>
              <div className={estilos.habitoValor}>
                <strong className="numero">{formatarCentavos(h.valorMedio)}</strong>
                <span>média/mês</span>
              </div>
              <Botao
                variante="secundario"
                tamanho="p"
                icone={Repeat}
                onClick={() =>
                  novaRecorrencia({
                    tipo: 'despesa',
                    descricao: h.descricao,
                    valorVariavel: true,
                    valorCentavos: h.valorMedio,
                    diaDoMes: h.diaTipico,
                    categoriaId: h.categoriaId,
                    pessoaId: h.pessoaId,
                    // O mês atual provavelmente já tem o lançamento manual: começa no próximo.
                    inicio: deslocarMes(mesAtual(), 1)
                  })
                }
              >
                Tornar recorrente
              </Botao>
            </li>
          )
        })}
      </ul>
    </Cartao>
  )
}

import { useState, type CSSProperties } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarClock, Check, PiggyBank, Plus, SlidersHorizontal, Target, Trash2, X } from 'lucide-react'
import type { AcaoPasso, ObjetivoDTO, PassoPlanoDTO } from '@compartilhado/dtos/objetivo'
import { TooltipGrafico } from '../../componentes/graficos/TooltipGrafico'
import { useAcoesGlobais } from '../../componentes/layout/Layout'
import { ModalAporte } from '../../componentes/objetivos/ModalAporte'
import { ModalObjetivo } from '../../componentes/objetivos/ModalObjetivo'
import { Botao } from '../../componentes/ui/Botao'
import { Cartao } from '../../componentes/ui/Cartao'
import { EstadoVazio, Esqueleto, Etiqueta } from '../../componentes/ui/Elementos'
import { useVisao } from '../../contextos/VisaoContexto'
import { useObjetivos, usePessoas } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { objetivoServico } from '../../servicos/objetivoServico'
import { classes } from '../../utilitarios/classes'
import { mesAbreviado, nomeDoMes } from '../../utilitarios/datas'
import { formatarCentavos, formatarCentavosCompacto, formatarPercentual } from '../../utilitarios/moeda'
import { ESTILOS, PRIORIDADES, PRIORIDADES_PERFIL, TIPOS_OBJETIVO, VIABILIDADES } from '../../utilitarios/objetivos'
import estilos from './Objetivos.module.css'

const EIXO = { fill: 'var(--texto-fraco)', fontSize: 12 }
const DIA_PADRAO_APORTE = 5

export function Objetivos() {
  const { dados } = useObjetivos()
  const { editarPerfil } = useAcoesGlobais()
  const [modalNovo, setModalNovo] = useState(false)
  const [aportando, setAportando] = useState<ObjetivoDTO | null>(null)
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null)

  if (!dados) return <Esqueleto altura={480} />

  const { perfil, objetivos } = dados
  const selecionado = objetivos.find((o) => o.id === selecionadoId) ?? objetivos[0]

  return (
    <div className={estilos.pagina}>
      <div className={estilos.barra}>
        <button className={estilos.perfil} onClick={editarPerfil}>
          <SlidersHorizontal size={16} />
          <span>
            Perfil <strong>{ESTILOS[perfil.estilo].nome}</strong> · {PRIORIDADES_PERFIL[perfil.prioridade].nome}
          </span>
          {!perfil.definido && <Etiqueta cor="var(--alerta)">defina o seu</Etiqueta>}
        </button>
        <div className={estilos.numeros}>
          <span>
            Folga para objetivos <strong className="numero">{formatarCentavos(dados.capacidadeMensal)}/mês</strong>
          </span>
          <span>
            Aportes programados <strong className="numero">{formatarCentavos(dados.aportesProgramados)}/mês</strong>
          </span>
        </div>
        <Botao icone={Plus} onClick={() => setModalNovo(true)}>
          Novo objetivo
        </Botao>
      </div>

      {objetivos.length === 0 ? (
        <Cartao>
          <EstadoVazio
            icone={Target}
            titulo="Qual é o próximo objetivo da família?"
            descricao="Uma reserva de emergência, uma viagem, a entrada da casa, quitar uma dívida... O app mostra se cabe, em quanto tempo e o que fazer para chegar lá."
            acao={
              <Botao icone={Plus} onClick={() => setModalNovo(true)}>
                Criar objetivo
              </Botao>
            }
          />
        </Cartao>
      ) : (
        <>
          <div className={estilos.grade}>
            {objetivos.map((o) => (
              <CartaoObjetivo
                key={o.id}
                objetivo={o}
                selecionado={o.id === selecionado?.id}
                aoSelecionar={() => setSelecionadoId(o.id)}
                aoAportar={() => setAportando(o)}
              />
            ))}
          </div>
          {selecionado && <Plano objetivo={selecionado} />}
        </>
      )}

      <ModalObjetivo aberto={modalNovo} aoFechar={() => setModalNovo(false)} sugestaoReserva={dados.sugestaoReserva} />
      <ModalAporte objetivo={aportando} aoFechar={() => setAportando(null)} />
    </div>
  )
}

interface PropsCartaoObjetivo {
  objetivo: ObjetivoDTO
  selecionado: boolean
  aoSelecionar: () => void
  aoAportar: () => void
}

function CartaoObjetivo({ objetivo: o, selecionado, aoSelecionar, aoAportar }: PropsCartaoObjetivo) {
  const tipo = TIPOS_OBJETIVO[o.tipo]
  const Icone = tipo.icone
  const viabilidade = VIABILIDADES[o.plano.viabilidade]

  return (
    <article
      className={classes(estilos.cartao, selecionado && estilos.cartaoSelecionado)}
      style={{ '--cor': tipo.cor } as CSSProperties}
      onClick={aoSelecionar}
    >
      <header className={estilos.cartaoTopo}>
        <span className={estilos.icone}>
          <Icone size={20} />
        </span>
        <div className={estilos.cartaoTitulo}>
          <strong>{o.nome}</strong>
          <span>
            Prioridade {PRIORIDADES[o.prioridade].toLowerCase()} · até {nomeDoMes(o.dataAlvo).toLowerCase()}
          </span>
        </div>
        <Etiqueta cor={viabilidade.cor}>{viabilidade.rotulo}</Etiqueta>
      </header>

      <div className={estilos.valores}>
        <strong className="numero">{formatarCentavos(o.valorAtualCentavos)}</strong>
        <span className="numero">de {formatarCentavos(o.valorAlvoCentavos)}</span>
      </div>
      <div className={estilos.trilho}>
        <div style={{ width: `${o.progresso * 100}%` }} />
      </div>
      <span className={estilos.percentual}>{formatarPercentual(o.progresso)} concluído</span>

      {o.plano.viabilidade !== 'concluido' && (
        <dl className={estilos.metricas}>
          <div>
            <dt>Precisa</dt>
            <dd className="numero">{formatarCentavos(o.plano.aporteNecessario)}/mês</dd>
          </div>
          <div>
            <dt>{o.plano.viabilidade === 'aguardando' ? 'Começa' : 'Cabe agora'}</dt>
            <dd className="numero">
              {o.plano.viabilidade === 'aguardando' && o.plano.inicioAportes
                ? mesAbreviado(o.plano.inicioAportes) + '/' + o.plano.inicioAportes.slice(2, 4)
                : `${formatarCentavos(o.plano.aporteSugerido)}/mês`}
            </dd>
          </div>
          <div>
            <dt>Chega em</dt>
            <dd>
              {o.plano.prazoRealista
                ? `${mesAbreviado(o.plano.prazoRealista)}/${o.plano.prazoRealista.slice(2, 4)}`
                : '—'}
            </dd>
          </div>
        </dl>
      )}

      <div className={estilos.acoes}>
        <Botao
          variante="secundario"
          tamanho="p"
          icone={PiggyBank}
          onClick={(e) => {
            e.stopPropagation()
            aoAportar()
          }}
        >
          Guardar
        </Botao>
      </div>
    </article>
  )
}

function Plano({ objetivo }: { objetivo: ObjetivoDTO }) {
  const executar = useAcao()
  const { pessoaId } = useVisao()
  const { dados: pessoas } = usePessoas()
  const [removendo, setRemovendo] = useState(false)
  const cor = TIPOS_OBJETIVO[objetivo.tipo].cor

  function agir(acao: AcaoPasso) {
    switch (acao.tipo) {
      case 'programar_aporte':
        return executar(
          () =>
            objetivoServico.programarAporte({
              objetivoId: objetivo.id,
              valorCentavos: acao.valorCentavos,
              diaDoMes: DIA_PADRAO_APORTE,
              pessoaId: pessoaId ?? pessoas?.[0]?.id ?? ''
            }),
          `Aporte de ${formatarCentavos(acao.valorCentavos)} programado todo dia ${DIA_PADRAO_APORTE}. Ele já aparece na previsão.`
        )
      case 'ajustar_prazo':
        return executar(
          () => objetivoServico.atualizar({ id: objetivo.id, dataAlvo: acao.mes }),
          `Prazo ajustado para ${nomeDoMes(acao.mes).toLowerCase()}`
        )
      case 'ajustar_valor':
        return executar(
          () => objetivoServico.atualizar({ id: objetivo.id, valorAlvoCentavos: acao.valorCentavos }),
          `Meta ajustada para ${formatarCentavos(acao.valorCentavos)}`
        )
    }
  }

  return (
    <div className={estilos.plano} style={{ '--cor': cor } as CSSProperties}>
      <Cartao
        titulo={`Plano: ${objetivo.nome}`}
        subtitulo="Etapas na ordem em que devem ser feitas"
        acao={
          removendo ? (
            <span className={estilos.confirmacao}>
              <Botao
                variante="perigo"
                tamanho="p"
                icone={Check}
                onClick={() => executar(() => objetivoServico.remover(objetivo.id), 'Objetivo removido')}
              >
                Remover
              </Botao>
              <Botao variante="fantasma" tamanho="p" icone={X} aria-label="Cancelar" onClick={() => setRemovendo(false)} />
            </span>
          ) : (
            <Botao variante="fantasma" tamanho="p" icone={Trash2} aria-label="Remover objetivo" onClick={() => setRemovendo(true)} />
          )
        }
      >
        <ol className={estilos.passos}>
          {objetivo.plano.passos.map((passo, i) => (
            <Passo key={passo.titulo} passo={passo} numero={i + 1} aoAgir={agir} />
          ))}
        </ol>
        {objetivo.aporteProgramadoCentavos > 0 && (
          <p className={estilos.programado}>
            <CalendarClock size={14} /> Aporte programado: {formatarCentavos(objetivo.aporteProgramadoCentavos)}/mês
          </p>
        )}
      </Cartao>

      <Cartao titulo="Projeção" subtitulo="Saldo do objetivo mês a mês com o aporte do plano">
        <GraficoProjecao objetivo={objetivo} cor={cor} />
      </Cartao>
    </div>
  )
}

const ROTULOS_ACAO: Record<AcaoPasso['tipo'], string> = {
  programar_aporte: 'Programar aporte',
  ajustar_prazo: 'Ajustar prazo',
  ajustar_valor: 'Ajustar meta'
}

function Passo({ passo, numero, aoAgir }: { passo: PassoPlanoDTO; numero: number; aoAgir: (a: AcaoPasso) => void }) {
  return (
    <li className={classes(estilos.passo, estilos[passo.tipo])}>
      <span className={estilos.numero}>{numero}</span>
      <div>
        <strong>{passo.titulo}</strong>
        <p>{passo.descricao}</p>
        {passo.acao && (
          <Botao variante="secundario" tamanho="p" onClick={() => aoAgir(passo.acao!)}>
            {ROTULOS_ACAO[passo.acao.tipo]}
          </Botao>
        )}
      </div>
    </li>
  )
}

function GraficoProjecao({ objetivo, cor }: { objetivo: ObjetivoDTO; cor: string }) {
  const dados = objetivo.plano.projecao.map((p) => ({
    rotulo: `${mesAbreviado(p.mes)}/${p.mes.slice(2, 4)}`,
    mes: p.mes,
    valor: p.valor
  }))
  const rotuloPrazo = dados.find((d) => d.mes === objetivo.dataAlvo)?.rotulo

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={dados} margin={{ top: 16, right: 12, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="gradienteObjetivo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity={0.45} />
            <stop offset="100%" stopColor={cor} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--borda)" strokeDasharray="4 4" />
        <XAxis dataKey="rotulo" axisLine={false} tickLine={false} tick={EIXO} minTickGap={24} dy={6} />
        <YAxis axisLine={false} tickLine={false} tick={EIXO} width={76} tickFormatter={(v: number) => formatarCentavosCompacto(v)} />
        <Tooltip content={(props) => <TooltipGrafico {...props} cores={{ valor: cor }} />} />
        <ReferenceLine
          y={objetivo.valorAlvoCentavos}
          stroke="var(--texto-suave)"
          strokeDasharray="6 4"
          label={{ value: 'Meta', position: 'insideTopLeft', fill: 'var(--texto-suave)', fontSize: 12 }}
        />
        {rotuloPrazo && (
          <ReferenceLine
            x={rotuloPrazo}
            stroke="var(--alerta)"
            strokeDasharray="4 4"
            label={{ value: 'Prazo', position: 'top', fill: 'var(--alerta)', fontSize: 12 }}
          />
        )}
        <Area dataKey="valor" name="Saldo do objetivo" type="monotone" stroke={cor} strokeWidth={2.5} fill="url(#gradienteObjetivo)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

import type { CSSProperties } from 'react'
import { Activity, CreditCard, Info, Sparkles } from 'lucide-react'
import type { IndicadorSaudeDTO, LimiteCreditoDTO, OrcamentoMesDTO } from '@compartilhado/dtos/saude'
import { Medidor } from '../../componentes/graficos/Medidor'
import { ListaInsights } from '../../componentes/insights/ListaInsights'
import { Cartao } from '../../componentes/ui/Cartao'
import { EstadoVazio, Esqueleto, Etiqueta } from '../../componentes/ui/Elementos'
import { useVisao } from '../../contextos/VisaoContexto'
import { usePerfil, useSaude } from '../../hooks/consultas'
import { useAcoesGlobais } from '../../componentes/layout/Layout'
import { ESTILOS } from '../../utilitarios/objetivos'
import { classes } from '../../utilitarios/classes'
import { nomeDoMes } from '../../utilitarios/datas'
import { formatarCentavos } from '../../utilitarios/moeda'
import { CORES_CLASSIFICACAO, NOMES_CLASSIFICACAO, formatarIndicador } from '../../utilitarios/saude'
import estilos from './Saude.module.css'

export function Saude() {
  const { dados: saude } = useSaude()
  const { pessoaId } = useVisao()

  const { dados: perfil } = usePerfil()
  const { editarPerfil } = useAcoesGlobais()

  if (!saude) return <Esqueleto altura={520} />

  if (!saude.dadosSuficientes) {
    return (
      <Cartao>
        <EstadoVazio icone={Activity} titulo="Ainda faltam dados" descricao={saude.motivo} />
      </Cartao>
    )
  }

  const mes = nomeDoMes(saude.mesReferencia)
  const cor = CORES_CLASSIFICACAO[saude.classificacao]

  return (
    <div className={estilos.pagina}>
      <section className={estilos.destaque} style={{ '--cor': cor } as CSSProperties}>
        <div className={estilos.medidor}>
          <Medidor nota={saude.nota} />
          <span className={estilos.classificacao}>{NOMES_CLASSIFICACAO[saude.classificacao]}</span>
        </div>
        <div className={estilos.resumo}>
          <span className={estilos.sobrescrito}>Avaliação para {mes}</span>
          <p>{saude.resumo}</p>
          <span className={estilos.fonte}>
            <Sparkles size={13} />
            {saude.fonteTextos === 'nativo'
              ? 'Texto gerado pelo próprio app a partir dos seus números'
              : 'Texto gerado pelo Assistente IA'}
            {perfil && (
              <button className={estilos.linkPerfil} onClick={editarPerfil}>
                · referências do perfil {ESTILOS[perfil.estilo].nome.toLowerCase()} (ajustar)
              </button>
            )}
          </span>
          {pessoaId && (
            <span className={estilos.avisoIndividual}>
              <Info size={14} />
              Visão individual: considera só os lançamentos desta pessoa. Como o orçamento é da casa,
              decisões de crédito devem olhar a visão Família.
            </span>
          )}
        </div>
      </section>

      <div className={estilos.duasColunas}>
        <LimiteCredito limite={saude.limiteCredito} />
        <Orcamento orcamento={saude.orcamento} />
      </div>

      <Cartao titulo="Indicadores" subtitulo="Cada um com a faixa de referência usada na nota">
        <div className={estilos.indicadores}>
          {saude.indicadores.map((indicador) => (
            <Indicador key={indicador.id} indicador={indicador} />
          ))}
        </div>
      </Cartao>

      <Cartao titulo="O que os números dizem" subtitulo="Pontos de atenção e sugestões, do mais urgente ao mais tranquilo">
        <ListaInsights insights={saude.insights} />
      </Cartao>
    </div>
  )
}

function LimiteCredito({ limite }: { limite: LimiteCreditoDTO }) {
  const temLimite = limite.parcelaMensalMaxima > 0

  return (
    <Cartao titulo={`Limite seguro de crédito em ${nomeDoMes(limite.mes).toLowerCase()}`}>
      <div className={classes(estilos.limite, !temLimite && estilos.limiteZerado)}>
        <CreditCard size={22} />
        <div>
          <span>Novas parcelas até</span>
          <strong className="numero">{formatarCentavos(limite.parcelaMensalMaxima)}</strong>
          <small>por mês</small>
        </div>
      </div>
      <p className={estilos.explicacao}>{limite.explicacao}</p>

      {temLimite && (
        <>
          <span className={estilos.rotulo}>Compra máxima no cartão, sem juros</span>
          <div className={estilos.compras}>
            {limite.comprasMaximas.map((compra) => (
              <div key={compra.parcelas} className={estilos.compra}>
                <span>{compra.parcelas === 1 ? 'À vista' : `${compra.parcelas}x`}</span>
                <strong className="numero">{formatarCentavos(compra.valorCentavos)}</strong>
                {compra.limitadaPeloCartao && <small>limite do cartão</small>}
              </div>
            ))}
          </div>
        </>
      )}
    </Cartao>
  )
}

const FATIAS_ORCAMENTO: { chave: keyof OrcamentoMesDTO; rotulo: string; cor: string }[] = [
  { chave: 'contasRecorrentes', rotulo: 'Contas recorrentes', cor: '#6366f1' },
  { chave: 'parcelas', rotulo: 'Parcelas do cartão', cor: '#ec4899' },
  { chave: 'imprevistos', rotulo: 'Avulsos e imprevistos', cor: '#f59e0b' },
  { chave: 'guardarPrevisto', rotulo: 'Guardar (programado)', cor: '#0ea5e9' },
  { chave: 'guardarSugerido', rotulo: 'Guardar (sugerido)', cor: '#38bdf8' },
  { chave: 'margemSeguranca', rotulo: 'Margem de segurança', cor: '#94a3b8' }
]

function Orcamento({ orcamento }: { orcamento: OrcamentoMesDTO }) {
  const livre = Math.max(0, orcamento.livreParaGastar)
  const fatias = [
    ...FATIAS_ORCAMENTO.map((f) => ({ ...f, valor: orcamento[f.chave] as number })),
    { chave: 'livre', rotulo: 'Livre para gastar', cor: '#10b981', valor: livre }
  ].filter((f) => f.valor > 0)
  const total = Math.max(orcamento.renda, fatias.reduce((soma, f) => soma + f.valor, 0))

  return (
    <Cartao
      titulo={`Orçamento de ${nomeDoMes(orcamento.mes).toLowerCase()}`}
      subtitulo={`Como dividir a renda de ${formatarCentavos(orcamento.renda)}`}
    >
      <div className={estilos.barraOrcamento}>
        {fatias.map((f) => (
          <span
            key={f.chave}
            style={{ width: `${(f.valor / total) * 100}%`, background: f.cor }}
            title={`${f.rotulo}: ${formatarCentavos(f.valor)}`}
          />
        ))}
      </div>
      <ul className={estilos.legendaOrcamento}>
        {fatias.map((f) => (
          <li key={f.chave} className={f.chave === 'livre' ? estilos.linhaLivre : undefined}>
            <i style={{ background: f.cor }} />
            <span>{f.rotulo}</span>
            <strong className="numero">{formatarCentavos(f.valor)}</strong>
          </li>
        ))}
        {orcamento.livreParaGastar < 0 && (
          <li className={estilos.linhaFalta}>
            <i />
            <span title="Guardar 20% da renda e manter 10% de margem passaria da renda prevista">
              Passa do ideal (guardar + margem)
            </span>
            <strong className="numero">{formatarCentavos(-orcamento.livreParaGastar)}</strong>
          </li>
        )}
      </ul>
    </Cartao>
  )
}

const CORES_STATUS = { bom: 'var(--receita)', atencao: 'var(--alerta)', critico: 'var(--despesa)' }
const NOMES_STATUS = { bom: 'Bom', atencao: 'Atenção', critico: 'Crítico' }

function Indicador({ indicador }: { indicador: IndicadorSaudeDTO }) {
  return (
    <div className={estilos.indicador} style={{ '--cor': CORES_STATUS[indicador.status] } as CSSProperties}>
      <div className={estilos.indicadorTopo}>
        <span>{indicador.nome}</span>
        <Etiqueta cor={CORES_STATUS[indicador.status]}>{NOMES_STATUS[indicador.status]}</Etiqueta>
      </div>
      <strong className="numero">{formatarIndicador(indicador)}</strong>
      <div className={estilos.pontuacao}>
        <div style={{ width: `${indicador.pontuacao}%` }} />
      </div>
      <p>{indicador.descricao}</p>
      <small>Referência: {indicador.referencia}</small>
    </div>
  )
}


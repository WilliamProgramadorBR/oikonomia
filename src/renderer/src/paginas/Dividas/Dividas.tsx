import { useState, type CSSProperties } from 'react'
import { ArrowRightLeft, Check, CreditCard, Landmark, Plus, Trash2, TriangleAlert, Trophy, X } from 'lucide-react'
import type { DividaDTO, MetodoQuitacao, PlanoDividasDTO, ResultadoQuitacaoDTO } from '@compartilhado/dtos/divida'
import { ModalDivida } from '../../componentes/dividas/ModalDivida'
import { Alternador } from '../../componentes/ui/Alternador'
import { Botao } from '../../componentes/ui/Botao'
import { CampoMoeda } from '../../componentes/ui/Campo'
import { Cartao } from '../../componentes/ui/Cartao'
import { EstadoVazio, Esqueleto, Etiqueta } from '../../componentes/ui/Elementos'
import { usePlanoDividas } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { dividaServico } from '../../servicos/dividaServico'
import { classes } from '../../utilitarios/classes'
import { nomeDoMes } from '../../utilitarios/datas'
import { TIPOS_DIVIDA, formatarTaxaCurta } from '../../utilitarios/dividas'
import { formatarCentavos } from '../../utilitarios/moeda'
import estilos from './Dividas.module.css'

const NOMES_METODO = { minimo: 'Só as parcelas', avalanche: 'Avalanche', bola_de_neve: 'Bola de neve' }
const DESCRICAO_METODO = {
  minimo: 'Paga apenas o mínimo de cada dívida',
  avalanche: 'Extra vai para a de maior juro',
  bola_de_neve: 'Extra vai para a de menor saldo'
}

export function Dividas() {
  const [extraAplicado, setExtraAplicado] = useState<number | null>(null)
  const { dados: plano } = usePlanoDividas(extraAplicado)
  const [modal, setModal] = useState(false)

  if (!plano) return <Esqueleto altura={480} />

  return (
    <div className={estilos.pagina}>
      <div className={estilos.kpis}>
        <Indicador rotulo="Total devido" valor={formatarCentavos(plano.totalDevido)} tom="despesa" />
        <Indicador rotulo="Parcelas por mês" valor={formatarCentavos(plano.parcelasMensais)} />
        <Indicador
          rotulo="Juros que ainda serão pagos"
          valor={formatarCentavos(plano.jurosRestantes)}
          detalhe="pagando só as parcelas (sem parcela fixa: 12 meses)"
          tom="despesa"
        />
        <Indicador
          rotulo="Livre das dívidas em"
          valor={plano.resultados[plano.recomendado].livreEm ? nomeDoMes(plano.resultados[plano.recomendado].livreEm!) : '—'}
          detalhe={`com a estratégia ${NOMES_METODO[plano.recomendado].toLowerCase()}`}
          tom="receita"
        />
      </div>

      <Cartao
        titulo="Dívidas em aberto"
        subtitulo="Ordenadas da taxa mais cara para a mais barata"
        acao={
          <Botao icone={Plus} onClick={() => setModal(true)}>
            Nova dívida
          </Botao>
        }
      >
        {plano.dividas.length === 0 ? (
          <EstadoVazio
            icone={Landmark}
            titulo="Nenhuma dívida cadastrada"
            descricao="Cadastre empréstimos, financiamentos, cheque especial ou rotativo. Compras parceladas com juros no cartão aparecem aqui sozinhas."
          />
        ) : (
          <ul className={estilos.lista}>
            {[...plano.dividas]
              .sort((a, b) => b.taxaMensal - a.taxaMensal)
              .map((d) => (
                <LinhaDivida key={d.id} divida={d} />
              ))}
          </ul>
        )}
      </Cartao>

      {plano.dividas.some((d) => d.saldoAtualCentavos > 0) && (
        <Estrategia plano={plano} aoAplicarExtra={setExtraAplicado} />
      )}

      {plano.trocas.length > 0 && (
        <Cartao
          titulo="Trocar dívida cara por barata"
          subtitulo="Comparação com as taxas medianas do mercado (Banco Central), no mesmo prazo"
        >
          <ul className={estilos.trocas}>
            {plano.trocas.map((t) => (
              <li key={t.dividaId + t.alternativa} className={estilos.troca}>
                <span className={estilos.trocaIcone}>
                  <ArrowRightLeft size={18} />
                </span>
                <div>
                  <strong>
                    {t.dividaNome}: {formatarTaxaCurta(t.taxaAtual)} → {t.alternativa} {formatarTaxaCurta(t.taxaAlternativa)}
                  </strong>
                  <p>{t.observacao}</p>
                </div>
                <div className={estilos.economia}>
                  <span>economia</span>
                  <strong className="numero">{formatarCentavos(t.economiaCentavos)}</strong>
                </div>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <ModalDivida aberto={modal} aoFechar={() => setModal(false)} />
    </div>
  )
}

function Indicador({ rotulo, valor, detalhe, tom }: { rotulo: string; valor: string; detalhe?: string; tom?: 'receita' | 'despesa' }) {
  return (
    <div className={estilos.indicador}>
      <span>{rotulo}</span>
      <strong className={classes('numero', tom && estilos[tom])}>{valor}</strong>
      {detalhe && <small>{detalhe}</small>}
    </div>
  )
}

function LinhaDivida({ divida: d }: { divida: DividaDTO }) {
  const executar = useAcao()
  const [removendo, setRemovendo] = useState(false)
  const info = TIPOS_DIVIDA[d.tipo]
  const Icone = d.origem === 'cartao' ? CreditCard : info.icone
  const acimaDoMercado = d.taxaMercadoMediana !== null && d.taxaMensal > d.taxaMercadoMediana * 1.1
  const progresso = d.parcelasTotais > 0 ? d.parcelasPagas / d.parcelasTotais : 0

  return (
    <li className={estilos.divida} style={{ '--cor': d.origem === 'cartao' ? '#8b5cf6' : info.cor } as CSSProperties}>
      <span className={estilos.icone}>
        <Icone size={18} />
      </span>
      <div className={estilos.dividaTexto}>
        <div className={estilos.dividaTitulo}>
          <strong>{d.nome}</strong>
          {d.parcelaCentavos === 0 && <Etiqueta cor="var(--despesa)">sem parcela fixa</Etiqueta>}
        </div>
        <span>
          {d.credor || info.nome} · {formatarTaxaCurta(d.taxaMensal)} a.m.
          {d.taxaMercadoMediana !== null && (
            <em className={acimaDoMercado ? estilos.acima : estilos.ok}>
              {' '}
              (mercado: {formatarTaxaCurta(d.taxaMercadoMediana)})
            </em>
          )}
        </span>
        {d.parcelasTotais > 0 && (
          <div className={estilos.trilho}>
            <div style={{ width: `${progresso * 100}%` }} />
          </div>
        )}
      </div>
      <div className={estilos.coluna}>
        <span>{d.parcelaCentavos > 0 ? `${d.parcelasRestantes}x de` : 'Juros/mês'}</span>
        <strong className="numero">
          {formatarCentavos(d.parcelaCentavos > 0 ? d.parcelaCentavos : Math.round(d.saldoAtualCentavos * (d.taxaMensal / 100)))}
        </strong>
      </div>
      <div className={estilos.coluna}>
        <span>Saldo</span>
        <strong className="numero">{formatarCentavos(d.saldoAtualCentavos)}</strong>
      </div>
      <div className={estilos.coluna}>
        <span>Quita em</span>
        <strong>{d.quitacaoPrevista ? nomeDoMes(d.quitacaoPrevista).replace(' de ', '/') : '—'}</strong>
      </div>
      {d.origem === 'cadastrada' ? (
        removendo ? (
          <span className={estilos.confirmacao}>
            <button className={estilos.confirmar} aria-label="Confirmar" onClick={() => executar(() => dividaServico.remover(d.id), 'Dívida removida')}>
              <Check size={15} />
            </button>
            <button className={estilos.acao} aria-label="Cancelar" onClick={() => setRemovendo(false)}>
              <X size={15} />
            </button>
          </span>
        ) : (
          <button className={estilos.acao} aria-label="Remover dívida" onClick={() => setRemovendo(true)}>
            <Trash2 size={15} />
          </button>
        )
      ) : (
        <span className={estilos.espaco} title="Gerencie na tela Cartões" />
      )}
    </li>
  )
}

function Estrategia({ plano, aoAplicarExtra }: { plano: PlanoDividasDTO; aoAplicarExtra: (v: number) => void }) {
  const [extra, setExtra] = useState(plano.extraMensal)
  const [metodo, setMetodo] = useState<MetodoQuitacao>(plano.recomendado)
  const escolhido = plano.resultados[metodo]

  return (
    <Cartao titulo="Estratégia de quitação" subtitulo="Quanto tempo e quantos juros com cada forma de pagar">
      <p className={estilos.explicacao}>{plano.explicacao}</p>

      <div className={estilos.extra}>
        <CampoMoeda rotulo="Valor extra por mês para as dívidas" centavos={extra} aoAlterar={setExtra} />
        <Botao variante="secundario" onClick={() => aoAplicarExtra(extra)}>
          Recalcular
        </Botao>
        <small>Sugestão pela folga do orçamento: {formatarCentavos(plano.folgaMensal)}/mês</small>
      </div>

      <div className={estilos.comparacao}>
        {(['minimo', 'avalanche', 'bola_de_neve'] as const).map((m) => (
          <Cenario
            key={m}
            nome={NOMES_METODO[m]}
            descricao={DESCRICAO_METODO[m]}
            resultado={plano.resultados[m]}
            recomendado={m === plano.recomendado}
          />
        ))}
      </div>

      <div className={estilos.ordem}>
        <div className={estilos.ordemTopo}>
          <strong>Ordem de quitação</strong>
          <Alternador
            valor={metodo}
            aoAlterar={setMetodo}
            opcoes={[
              { valor: 'avalanche', rotulo: 'Avalanche' },
              { valor: 'bola_de_neve', rotulo: 'Bola de neve' }
            ]}
          />
        </div>
        <ol>
          {escolhido.ordem.map((o, i) => (
            <li key={o.id}>
              <span className={estilos.posicao}>{i + 1}</span>
              <span className={estilos.ordemNome}>{o.nome}</span>
              <strong>{o.quitadaEm ? nomeDoMes(o.quitadaEm) : 'não quita'}</strong>
            </li>
          ))}
        </ol>
      </div>
    </Cartao>
  )
}

function Cenario({
  nome,
  descricao,
  resultado,
  recomendado
}: {
  nome: string
  descricao: string
  resultado: ResultadoQuitacaoDTO
  recomendado: boolean
}) {
  return (
    <div className={classes(estilos.cenario, recomendado && estilos.cenarioRecomendado)}>
      <div className={estilos.cenarioTopo}>
        <strong>{nome}</strong>
        {recomendado && (
          <Etiqueta cor="var(--receita)">
            <Trophy size={11} /> recomendado
          </Etiqueta>
        )}
      </div>
      <small>{descricao}</small>
      {resultado.meses === null ? (
        <p className={estilos.naoQuita}>
          <TriangleAlert size={15} /> Não quita: parte das dívidas cresce todo mês
        </p>
      ) : (
        <dl>
          <div>
            <dt>Livre em</dt>
            <dd>{nomeDoMes(resultado.livreEm!)}</dd>
          </div>
          <div>
            <dt>Juros totais</dt>
            <dd className="numero">{formatarCentavos(resultado.totalJuros ?? 0)}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}

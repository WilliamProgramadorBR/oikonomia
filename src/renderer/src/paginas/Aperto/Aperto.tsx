import { useEffect, useState } from 'react'
import { BookOpen, CircleCheck, Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react'
import type { AvisoOferta, OfertaAvaliadaDTO, PlanoApertoDTO } from '@compartilhado/dtos/aperto'
import { REGRAS_APERTO } from '@compartilhado/constantes/regrasAperto'
import { Botao } from '../../componentes/ui/Botao'
import { CampoMoeda } from '../../componentes/ui/Campo'
import { Cartao } from '../../componentes/ui/Cartao'
import { Esqueleto, Etiqueta } from '../../componentes/ui/Elementos'
import { usePlanoAperto } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { apertoServico } from '../../servicos/apertoServico'
import { classes } from '../../utilitarios/classes'
import { nomeDoMes } from '../../utilitarios/datas'
import { formatarCentavos } from '../../utilitarios/moeda'
import estilos from './Aperto.module.css'
import { ModalOferta, TIPOS_OFERTA } from './ModalOferta'

const SITUACAO: Record<PlanoApertoDTO['situacao'], { rotulo: string; cor: string; texto: string }> = {
  sem_aperto: { rotulo: 'Sem aperto', cor: 'var(--receita)', texto: 'As contas fecham neste mês e nos próximos.' },
  pontual: { rotulo: 'Aperto pontual', cor: 'var(--alerta)', texto: 'Os próximos meses voltam a sobrar: dá para empurrar parte das contas.' },
  estrutural: { rotulo: 'Aperto estrutural', cor: 'var(--despesa)', texto: 'A renda não cobre as contas nos próximos meses: crédito só adia.' }
}

const COR_AVISO: Record<AvisoOferta['nivel'], string> = {
  info: 'var(--texto-suave)',
  alerta: 'var(--alerta)',
  perigo: 'var(--despesa)'
}

export function Aperto() {
  const { dados: plano } = usePlanoAperto()
  const executar = useAcao()
  const [modal, setModal] = useState<{ aberto: boolean; oferta: OfertaAvaliadaDTO | null }>({ aberto: false, oferta: null })
  const [caixa, setCaixa] = useState(0)

  useEffect(() => {
    if (plano) setCaixa(plano.caixaExtraCentavos)
  }, [plano?.caixaExtraCentavos]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!plano) return <Esqueleto altura={480} />

  const situacao = SITUACAO[plano.situacao]
  const grupos = [...new Set(plano.ofertas.map((o) => o.grupo).filter((g): g is string => !!g))]
  const ofertasAtivas = plano.ofertas.filter((o) => o.situacao === 'avaliando')
  const ofertasForaDoJogo = plano.ofertas.filter((o) => o.situacao !== 'avaliando')

  return (
    <div className={estilos.pagina}>
      <div className={estilos.indicadores}>
        <div className={classes(estilos.indicador, plano.buracoCentavos > 0 && estilos.indicadorPerigo)}>
          <span>Falta neste mês</span>
          <strong className="numero">{formatarCentavos(plano.buracoCentavos)}</strong>
          <small>É isso que precisa ser coberto, não a dívida toda.</small>
        </div>
        <div className={estilos.indicador}>
          <span>Contas de {nomeDoMes(plano.mes).toLowerCase()}</span>
          <strong className="numero">{formatarCentavos(plano.contasMes)}</strong>
          <small>Entra {formatarCentavos(plano.receitasMes)} no mês.</small>
        </div>
        <div className={estilos.indicador}>
          <span>Situação</span>
          <strong style={{ color: situacao.cor }}>{situacao.rotulo}</strong>
          <small>{situacao.texto}</small>
        </div>
        <div className={classes(estilos.indicador, plano.buracoCentavos > 0 && (plano.fecha ? estilos.indicadorOk : estilos.indicadorPerigo))}>
          <span>Com o plano</span>
          <strong className="numero">{plano.buracoCentavos === 0 ? '—' : formatarCentavos(plano.sobraComPlanoCentavos)}</strong>
          <small>
            {plano.buracoCentavos === 0
              ? 'Nada a resolver.'
              : plano.fecha
                ? `Sobra no mês, a um custo de ${formatarCentavos(plano.custoTotalPlanoCentavos)}.`
                : 'Ainda falta: cadastre mais saídas.'}
          </small>
        </div>
      </div>

      <Cartao titulo="O que está acontecendo" subtitulo="Raciocínio do app, a partir da previsão e das ofertas cadastradas">
        <p className={estilos.explicacao}>{plano.explicacao}</p>
        <div className={estilos.caixa}>
          <CampoMoeda rotulo="Dinheiro que já está na conta (opcional)" centavos={caixa} aoAlterar={setCaixa} />
          <Botao
            variante="secundario"
            disabled={caixa === plano.caixaExtraCentavos}
            onClick={() => executar(() => apertoServico.definirCaixaExtra(caixa), 'Plano recalculado.')}
          >
            Usar no cálculo
          </Botao>
        </div>
      </Cartao>

      <Cartao
        titulo="Saídas possíveis"
        subtitulo="Comparadas pelo custo real (quanto você paga a mais), nunca pelo valor da parcela"
        acao={
          <Botao icone={Plus} onClick={() => setModal({ aberto: true, oferta: null })}>
            Nova oferta
          </Botao>
        }
      >
        {plano.ofertas.length === 0 ? (
          <p className={estilos.vazio}>
            Cadastre as saídas que você tem: opções de parcelamento da fatura, pagar uma conta no crédito, empréstimos oferecidos, pedir prazo ao
            credor... O app calcula qual combinação sai mais barata.
          </p>
        ) : (
          <ul className={estilos.ofertas}>
            {[...ofertasAtivas, ...ofertasForaDoJogo].map((o) => (
              <Oferta
                key={o.id}
                oferta={o}
                aoEditar={() => setModal({ aberto: true, oferta: o })}
                aoRemover={() => executar(() => apertoServico.removerOferta(o.id), 'Oferta removida.')}
              />
            ))}
          </ul>
        )}
      </Cartao>

      {(plano.passos.length > 0 || plano.dicas.length > 0) && (
        <div className={estilos.duasColunas}>
          <Cartao titulo="Plano de ação" subtitulo="Na ordem: o que custa zero primeiro, depois o mais barato">
            {plano.passos.length === 0 ? (
              <p className={estilos.vazio}>Cadastre as ofertas para o app montar os passos.</p>
            ) : (
              <ol className={estilos.passos}>
                {plano.passos.map((p) => (
                  <li key={p.chave} className={p.feito ? estilos.passoFeito : undefined}>
                    <label>
                      <input type="checkbox" checked={p.feito} onChange={(e) => executar(() => apertoServico.marcarPasso(p.chave, e.target.checked))} />
                      <span>{p.texto}</span>
                    </label>
                  </li>
                ))}
              </ol>
            )}
            {plano.planoB.length > 0 && (
              <div className={estilos.planoB}>
                <strong>Se algo der errado (plano B, do mais barato ao mais caro)</strong>
                <ol>
                  {plano.planoB.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
              </div>
            )}
          </Cartao>

          <Cartao titulo="Cuidados" subtitulo="Regras que valem para este momento">
            <ul className={estilos.dicas}>
              {plano.dicas.map((d) => (
                <li key={d.regra + d.texto} style={{ color: COR_AVISO[d.nivel] }}>
                  <Etiqueta>{d.regra}</Etiqueta> <span>{d.texto}</span>
                </li>
              ))}
            </ul>
          </Cartao>
        </div>
      )}

      <Cartao titulo="Próximos meses" subtitulo="Caixa acumulado: a sobra (ou falta) de um mês passa para o seguinte. Inclui a reserva de imprevistos nos meses futuros.">
        <div className={estilos.tabelaRolavel}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Mês</th>
                <th>Entra</th>
                <th>Sai</th>
                <th>Caixa sem plano</th>
                <th>Caixa com plano</th>
              </tr>
            </thead>
            <tbody>
              {plano.projecao.map((m) => (
                <tr key={m.mes}>
                  <td>
                    {nomeDoMes(m.mes)}
                    {m.mes === plano.mesMaisApertado && plano.buracoCentavos > 0 && <Etiqueta cor="var(--alerta)">mais apertado</Etiqueta>}
                    {m.avisos.map((a) => (
                      <small key={a} className={estilos.avisoMes}>
                        {a}
                      </small>
                    ))}
                  </td>
                  <td className="numero">{formatarCentavos(m.receitas)}</td>
                  <td className="numero">{formatarCentavos(m.despesas)}</td>
                  <td className={classes('numero', m.caixaSemPlano < 0 && estilos.negativo)}>{formatarCentavos(m.caixaSemPlano)}</td>
                  <td className={classes('numero', m.caixaComPlano < 0 ? estilos.negativo : estilos.positivo)}>{formatarCentavos(m.caixaComPlano)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>

      <details className={estilos.regras}>
        <summary>
          <BookOpen size={15} /> As 12 regras que o app usa para decidir
        </summary>
        <ul>
          {REGRAS_APERTO.map((r) => (
            <li key={r.id}>
              <strong>{r.id}</strong> {r.texto}
            </li>
          ))}
        </ul>
      </details>

      <ModalOferta aberto={modal.aberto} oferta={modal.oferta} grupos={grupos} aoFechar={() => setModal({ aberto: false, oferta: null })} />
    </div>
  )
}

function Oferta({ oferta: o, aoEditar, aoRemover }: { oferta: OfertaAvaliadaDTO; aoEditar: () => void; aoRemover: () => void }) {
  const fora = o.situacao !== 'avaliando'
  return (
    <li className={classes(estilos.oferta, o.escolhida && estilos.ofertaEscolhida, fora && estilos.ofertaFora)}>
      <div className={estilos.ofertaTopo}>
        <div className={estilos.ofertaTitulo}>
          <span className={estilos.ofertaTipo}>{TIPOS_OFERTA[o.tipo].nome}</span>
          <strong>{o.descricao}</strong>
          {o.grupo && <small>{o.grupo}</small>}
        </div>
        <div className={estilos.ofertaEtiquetas}>
          {o.escolhida && (
            <Etiqueta cor="var(--receita)">
              <CircleCheck size={11} /> no plano
            </Etiqueta>
          )}
          {o.rotulo === 'mais_barata' && <Etiqueta cor="var(--primaria)">mais barata</Etiqueta>}
          {o.rotulo === 'ultimo_recurso' && (
            <Etiqueta cor="var(--despesa)">
              <ShieldAlert size={11} /> último recurso
            </Etiqueta>
          )}
          {o.situacao === 'recusada' && <Etiqueta cor="var(--texto-fraco)">recusada</Etiqueta>}
          {o.situacao === 'indisponivel' && <Etiqueta cor="var(--texto-fraco)">indisponível</Etiqueta>}
          <button type="button" className={estilos.icone} title="Editar" onClick={aoEditar}>
            <Pencil size={14} />
          </button>
          <button type="button" className={estilos.icone} title="Remover" onClick={aoRemover}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className={estilos.ofertaNumeros}>
        <span>
          Valor <strong className="numero">{formatarCentavos(o.valorCentavos)}</strong>
        </span>
        {o.tipo !== 'custo_zero' && (
          <span>
            {o.parcelas}x de <strong className="numero">{formatarCentavos(o.parcelaCentavos)}</strong>
          </span>
        )}
        <span>
          Custo real{' '}
          <strong className={classes('numero', o.custoRealCentavos > 0 && o.custoPercentual > 0.2 && estilos.negativo)}>
            {formatarCentavos(o.custoRealCentavos)}
          </strong>
          {o.tipo !== 'custo_zero' && ` (${Math.round(o.custoPercentual * 100)}%)`}
        </span>
        <span>
          Alivia este mês <strong className="numero">{formatarCentavos(o.alivioNoMesCentavos)}</strong>
        </span>
      </div>
      {!fora && o.avisos.length > 0 && (
        <ul className={estilos.avisos}>
          {o.avisos.map((a) => (
            <li key={a.regra + a.texto} style={{ color: COR_AVISO[a.nivel] }}>
              <b>{a.regra}</b> {a.texto}
            </li>
          ))}
        </ul>
      )}
      {o.motivo && <p className={estilos.motivo}>{o.motivo}</p>}
    </li>
  )
}

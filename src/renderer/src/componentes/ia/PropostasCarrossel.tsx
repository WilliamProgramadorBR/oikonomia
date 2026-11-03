import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Check, ChevronLeft, ChevronRight, CircleCheck, Info, Sparkles, Trash2, Undo2 } from 'lucide-react'
import type { InterpretacaoLancamentosDTO, PropostaLancamentoDTO } from '@compartilhado/dtos/lancamentosTexto'
import type { TipoTransacaoDTO } from '@compartilhado/dtos/transacao'
import { useCartoes, useCategorias, usePessoas } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { iaServico } from '../../servicos/iaServico'
import { classes } from '../../utilitarios/classes'
import { formatarCentavos } from '../../utilitarios/moeda'
import { Marcador } from '../acesso/CamposAcesso'
import { Alternador } from '../ui/Alternador'
import { Botao } from '../ui/Botao'
import { Campo, CampoMoeda, CampoSelecao } from '../ui/Campo'
import estilos from './PropostasCarrossel.module.css'

const CORES_TIPO: Record<TipoTransacaoDTO, string> = {
  despesa: 'var(--despesa)',
  receita: 'var(--receita)',
  guardado: 'var(--primaria)'
}

// Revisão dos lançamentos entendidos a partir do texto: um cartão por lançamento, tudo editável.
// Nada é gravado até o usuário confirmar.
export function PropostasCarrossel({ interpretacao }: { interpretacao: InterpretacaoLancamentosDTO }) {
  const { dados: categorias } = useCategorias()
  const { dados: pessoas } = usePessoas()
  const { dados: cartoes } = useCartoes()
  const executar = useAcao()
  const [propostas, setPropostas] = useState(interpretacao.propostas)
  const [excluidas, setExcluidas] = useState<Set<string>>(new Set())
  const [atual, setAtual] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)
  const janela = useRef<HTMLDivElement>(null)

  // A janela acompanha a altura do cartão da vez (cada lançamento tem campos diferentes).
  useLayoutEffect(() => {
    const cartao = janela.current?.querySelectorAll('article')[atual]
    if (janela.current && cartao) janela.current.style.height = `${cartao.offsetHeight + 12}px`
  })

  const incluidas = propostas.filter((p) => !excluidas.has(p.chave))
  const total = (tipo: TipoTransacaoDTO) => incluidas.filter((p) => p.tipo === tipo).reduce((s, p) => s + p.valorCentavos, 0)

  const alterar = (chave: string, parcial: Partial<PropostaLancamentoDTO>) =>
    setPropostas((lista) => lista.map((p) => (p.chave === chave ? { ...p, ...parcial } : p)))

  const alternarInclusao = (chave: string) =>
    setExcluidas((atuais) => {
      const novas = new Set(atuais)
      if (novas.has(chave)) novas.delete(chave)
      else novas.add(chave)
      return novas
    })

  async function confirmar() {
    setSalvando(true)
    let mensagem = ''
    const ok = await executar(async () => {
      mensagem = (await iaServico.confirmarLancamentos(incluidas)).mensagem
    })
    setSalvando(false)
    if (ok) setResultado(mensagem)
  }

  if (resultado) {
    return (
      <div className={estilos.concluido}>
        <CircleCheck size={20} />
        <div>
          <strong>{resultado}</strong>
          <span>Já aparece em Lançamentos, Contas recorrentes e na Previsão.</span>
        </div>
      </div>
    )
  }

  return (
    <div className={estilos.carrossel}>
      <div className={estilos.topo}>
        <span className={estilos.contador}>
          {atual + 1} de {propostas.length}
        </span>
        <div className={estilos.totais}>
          {total('despesa') > 0 && <span style={{ color: CORES_TIPO.despesa }}>− {formatarCentavos(total('despesa'))}</span>}
          {total('receita') > 0 && <span style={{ color: CORES_TIPO.receita }}>+ {formatarCentavos(total('receita'))}</span>}
          {total('guardado') > 0 && <span style={{ color: CORES_TIPO.guardado }}>→ {formatarCentavos(total('guardado'))}</span>}
        </div>
      </div>

      <div ref={janela} className={estilos.janela}>
        <div className={estilos.trilho} style={{ transform: `translateX(-${atual * 100}%)` }}>
          {propostas.map((p, i) => {
            const fora = excluidas.has(p.chave)
            const categoriasDoTipo = (categorias ?? []).filter((c) => c.tipo === p.tipo)
            return (
              <article
                key={p.chave}
                className={classes(estilos.cartao, fora && estilos.fora)}
                style={{ '--cor-tipo': CORES_TIPO[p.tipo] } as CSSProperties}
                inert={i !== atual}
              >
                <div className={estilos.cabecalho}>
                  <Alternador
                    valor={p.tipo}
                    aoAlterar={(tipo) =>
                      alterar(p.chave, {
                        tipo,
                        categoriaId: (categorias ?? []).find((c) => c.tipo === tipo)?.id ?? p.categoriaId,
                        forma: tipo !== 'despesa' && p.forma === 'cartao' ? 'avulso' : p.forma
                      })
                    }
                    opcoes={[
                      { valor: 'despesa', rotulo: 'Gasto', cor: CORES_TIPO.despesa },
                      { valor: 'receita', rotulo: 'Ganho', cor: CORES_TIPO.receita },
                      { valor: 'guardado', rotulo: 'Guardar', cor: CORES_TIPO.guardado }
                    ]}
                  />
                  <button type="button" className={estilos.incluir} onClick={() => alternarInclusao(p.chave)}>
                    {fora ? (
                      <>
                        <Undo2 size={14} /> Incluir de novo
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} /> Não lançar
                      </>
                    )}
                  </button>
                </div>

                <CampoMoeda destaque centavos={p.valorCentavos} aoAlterar={(valorCentavos) => alterar(p.chave, { valorCentavos })} />
                <Campo rotulo="Descrição" value={p.descricao} onChange={(e) => alterar(p.chave, { descricao: e.target.value })} />

                <div className={estilos.linha}>
                  <CampoSelecao rotulo="Categoria" value={p.categoriaId} onChange={(e) => alterar(p.chave, { categoriaId: e.target.value })}>
                    {categoriasDoTipo.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </CampoSelecao>
                  <CampoSelecao
                    rotulo="Para quem"
                    value={p.pessoaId ?? ''}
                    onChange={(e) => alterar(p.chave, { pessoaId: e.target.value || null })}
                  >
                    <option value="">Todos (casa)</option>
                    {(pessoas ?? []).map((pessoa) => (
                      <option key={pessoa.id} value={pessoa.id}>
                        {pessoa.nome}
                      </option>
                    ))}
                  </CampoSelecao>
                </div>

                <Alternador
                  largo
                  valor={p.forma}
                  aoAlterar={(forma) =>
                    alterar(p.chave, { forma, cartaoId: forma === 'cartao' ? (p.cartaoId ?? cartoes?.[0]?.id ?? null) : null })
                  }
                  opcoes={[
                    { valor: 'avulso', rotulo: 'Uma vez' },
                    { valor: 'recorrente', rotulo: 'Todo mês' },
                    ...(p.tipo === 'despesa' && (cartoes?.length ?? 0) > 0 ? [{ valor: 'cartao' as const, rotulo: 'No cartão' }] : [])
                  ]}
                />

                {p.forma === 'recorrente' ? (
                  <div className={estilos.linha}>
                    <CampoSelecao
                      rotulo="Todo dia"
                      value={p.diaDoMes}
                      onChange={(e) => alterar(p.chave, { diaDoMes: Number(e.target.value) })}
                    >
                      {Array.from({ length: 31 }, (_, k) => k + 1).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </CampoSelecao>
                    <div className={estilos.marcadorVariavel}>
                      <Marcador marcado={p.valorVariavel} aoAlterar={(valorVariavel) => alterar(p.chave, { valorVariavel })}>
                        Valor muda todo mês
                      </Marcador>
                    </div>
                  </div>
                ) : (
                  <div className={estilos.linha}>
                    <Campo rotulo="Data" type="date" value={p.data} onChange={(e) => alterar(p.chave, { data: e.target.value })} />
                    {p.forma === 'cartao' && (
                      <CampoSelecao
                        rotulo="Cartão e parcelas"
                        value={`${p.cartaoId}|${p.parcelas}`}
                        onChange={(e) => {
                          const [cartaoId, parcelas] = e.target.value.split('|')
                          alterar(p.chave, { cartaoId, parcelas: Number(parcelas) })
                        }}
                      >
                        {(cartoes ?? []).flatMap((c) =>
                          [1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                            <option key={`${c.id}|${n}`} value={`${c.id}|${n}`}>
                              {c.apelido} · {n === 1 ? 'à vista' : `${n}x`}
                            </option>
                          ))
                        )}
                      </CampoSelecao>
                    )}
                  </div>
                )}

                {p.suposicoes.length > 0 && (
                  <ul className={estilos.suposicoes}>
                    {p.suposicoes.map((s) => (
                      <li key={s}>
                        <Info size={13} /> {s}
                      </li>
                    ))}
                  </ul>
                )}
                {p.trecho && <p className={estilos.trecho}>“{p.trecho}”</p>}
              </article>
            )
          })}
        </div>
      </div>

      <div className={estilos.navegacao}>
        <button type="button" onClick={() => setAtual(Math.max(0, atual - 1))} disabled={atual === 0} aria-label="Anterior">
          <ChevronLeft size={17} />
        </button>
        <div className={estilos.pontos}>
          {propostas.map((p, i) => (
            <button
              key={p.chave}
              type="button"
              className={classes(estilos.ponto, i === atual && estilos.pontoAtual, excluidas.has(p.chave) && estilos.pontoFora)}
              style={{ '--cor-tipo': CORES_TIPO[p.tipo] } as CSSProperties}
              onClick={() => setAtual(i)}
              aria-label={`Lançamento ${i + 1}: ${p.descricao}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAtual(Math.min(propostas.length - 1, atual + 1))}
          disabled={atual === propostas.length - 1}
          aria-label="Próximo"
        >
          <ChevronRight size={17} />
        </button>
      </div>

      {interpretacao.naoEntendido && (
        <p className={estilos.naoEntendido}>Não consegui lançar: “{interpretacao.naoEntendido}”. Escreva o valor para eu incluir.</p>
      )}

      <div className={estilos.rodape}>
        <span className={estilos.fonte}>
          {interpretacao.fonte === 'ia' ? (
            <>
              <Sparkles size={12} /> Interpretado pelo Gemini
            </>
          ) : (
            'Interpretado pelo app'
          )}
        </span>
        <Botao icone={Check} carregando={salvando} disabled={incluidas.length === 0} onClick={confirmar}>
          {incluidas.length === 0
            ? 'Nada para lançar'
            : `Confirmar ${incluidas.length === 1 ? '1 lançamento' : `${incluidas.length} lançamentos`}`}
        </Botao>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Banknote, Check, CreditCard, Palmtree, Plus, Repeat, X } from 'lucide-react'
import type { CartaoDTO } from '@compartilhado/dtos/cartao'
import type { CategoriaDTO } from '@compartilhado/dtos/categoria'
import type { ContaDTO } from '@compartilhado/dtos/conta'
import type { RecorrenciaDTO } from '@compartilhado/dtos/recorrencia'
import type { TipoTransacaoDTO } from '@compartilhado/dtos/transacao'
import { deslocarMes, mesAtual } from '@compartilhado/utilitarios/mes'
import { useAcoesGlobais } from '../../componentes/layout/Layout'
import { ModalFerias } from '../../componentes/recorrencias/ModalFerias'
import { Botao } from '../../componentes/ui/Botao'
import { Cartao } from '../../componentes/ui/Cartao'
import { EstadoVazio, Esqueleto, Etiqueta, IconeCategoria } from '../../componentes/ui/Elementos'
import { useVisao } from '../../contextos/VisaoContexto'
import { useCartoes, useCategorias, useContas, useRecorrencias } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { recorrenciaServico } from '../../servicos/recorrenciaServico'
import { classes } from '../../utilitarios/classes'
import { dataCurta, nomeDoMes } from '../../utilitarios/datas'
import { formatarCentavos, formatarPercentual } from '../../utilitarios/moeda'
import estilos from './Recorrentes.module.css'

const SECOES: { tipo: TipoTransacaoDTO; titulo: string; subtitulo: string }[] = [
  { tipo: 'despesa', titulo: 'Contas a pagar', subtitulo: 'Saem todo mês' },
  { tipo: 'receita', titulo: 'Receitas', subtitulo: 'Entram todo mês' },
  { tipo: 'guardado', titulo: 'Guardar', subtitulo: 'Aportes programados' }
]

const ativa = (r: RecorrenciaDTO) => r.fim === null || r.fim >= mesAtual()

export function Recorrentes() {
  const { pessoaId } = useVisao()
  const { dados: recorrencias } = useRecorrencias()
  const { dados: categorias } = useCategorias()
  const { dados: cartoes } = useCartoes()
  const { dados: contas } = useContas()
  const contasAtivas = (contas ?? []).filter((c) => c.ativa)
  const { novaRecorrencia } = useAcoesGlobais()

  if (!recorrencias || !categorias || !cartoes) return <Esqueleto altura={400} />

  const visiveis = recorrencias.filter((r) => !pessoaId || r.pessoaId === pessoaId)
  if (visiveis.length === 0) {
    return (
      <Cartao>
        <EstadoVazio
          icone={Repeat}
          titulo="Nenhuma conta recorrente"
          descricao="Cadastre aluguel, luz, internet, salário... O app cria a previsão de cada mês e os próximos meses passam a ter uma provisão automática."
          acao={
            <Botao icone={Plus} onClick={() => novaRecorrencia()}>
              Nova conta recorrente
            </Botao>
          }
        />
      </Cartao>
    )
  }

  const ativas = visiveis.filter(ativa)
  const somar = (filtro: (r: RecorrenciaDTO) => boolean) =>
    ativas.filter(filtro).reduce((total, r) => total + r.estimativaCentavos, 0)
  const receitas = somar((r) => r.tipo === 'receita')
  const fixas = somar((r) => r.tipo === 'despesa' && !r.valorVariavel)
  const variaveis = somar((r) => r.tipo === 'despesa' && r.valorVariavel)
  const comprometimento = receitas > 0 ? (fixas + variaveis) / receitas : null

  return (
    <div className={estilos.pagina}>
      <div className={estilos.resumo}>
        <Indicador rotulo="Receitas recorrentes" valor={formatarCentavos(receitas)} tom="receita" />
        <Indicador rotulo="Contas de valor fixo" valor={formatarCentavos(fixas)} />
        <Indicador rotulo="Contas variáveis (estimado)" valor={formatarCentavos(variaveis)} />
        <Indicador
          rotulo="Renda já comprometida"
          valor={comprometimento === null ? '—' : formatarPercentual(comprometimento)}
          tom={comprometimento !== null && comprometimento > 0.6 ? 'despesa' : 'primaria'}
          detalhe="contas recorrentes ÷ receitas recorrentes"
        />
      </div>

      {SECOES.map(({ tipo, titulo, subtitulo }) => {
        const doTipo = visiveis.filter((r) => r.tipo === tipo)
        if (doTipo.length === 0) return null
        return (
          <Cartao
            key={tipo}
            titulo={titulo}
            subtitulo={subtitulo}
            acao={
              tipo === 'despesa' && (
                <Botao variante="secundario" tamanho="p" icone={Plus} onClick={() => novaRecorrencia()}>
                  Nova
                </Botao>
              )
            }
          >
            <ul className={estilos.lista}>
              {doTipo.map((r) => (
                <LinhaRecorrencia
                  key={r.id}
                  recorrencia={r}
                  categoria={categorias.find((c) => c.id === r.categoriaId)}
                  cartao={cartoes.find((c) => c.id === r.cartaoId)}
                  contas={contasAtivas}
                />
              ))}
            </ul>
          </Cartao>
        )
      })}
    </div>
  )
}

function Indicador({
  rotulo,
  valor,
  tom,
  detalhe
}: {
  rotulo: string
  valor: string
  tom?: 'receita' | 'despesa' | 'primaria'
  detalhe?: string
}) {
  return (
    <div className={estilos.indicador}>
      <span>{rotulo}</span>
      <strong className={classes('numero', tom && estilos[tom])}>{valor}</strong>
      {detalhe && <small>{detalhe}</small>}
    </div>
  )
}

interface PropsLinha {
  recorrencia: RecorrenciaDTO
  categoria?: CategoriaDTO
  cartao?: CartaoDTO
  contas: ContaDTO[]
}

function LinhaRecorrencia({ recorrencia: r, categoria, cartao, contas }: PropsLinha) {
  const executar = useAcao()
  const [encerrando, setEncerrando] = useState(false)
  const [ferias, setFerias] = useState(false)
  const encerrada = !ativa(r)
  const proximoMes = deslocarMes(mesAtual(), 1)

  return (
    <li className={classes(estilos.item, encerrada && estilos.encerrada)}>
      <IconeCategoria icone={categoria?.icone ?? 'outros'} cor={categoria?.cor ?? '#94a3b8'} />
      <div className={estilos.texto}>
        <div className={estilos.titulo}>
          <strong>{r.descricao}</strong>
          {r.valorVariavel && <Etiqueta cor="var(--alerta)">variável</Etiqueta>}
          {encerrada && <Etiqueta cor="var(--texto-fraco)">encerrada</Etiqueta>}
        </div>
        <span className={estilos.detalhes}>
          Todo dia {r.diaDoMes} ·{' '}
          {cartao ? (
            <>
              <CreditCard size={12} /> {cartao.apelido}
            </>
          ) : r.tipo === 'despesa' ? (
            <>
              <Banknote size={12} /> Boleto/débito
            </>
          ) : (
            categoria?.nome
          )}
          {r.valorVariavel && r.historicoCentavos.length > 0 && (
            <> · últimos: {r.historicoCentavos.slice(0, 3).map(formatarCentavos).join(', ')}</>
          )}
          {encerrada && r.fim && <> · até {nomeDoMes(r.fim).toLowerCase()}</>}
        </span>
        {!cartao && !encerrada && contas.length > 0 && (
          <label className={estilos.contaDaRecorrente}>
            {r.tipo === 'receita' ? 'Entra em' : 'Sai de'}
            <select
              value={r.contaId ?? ''}
              onChange={(e) =>
                executar(
                  () => recorrenciaServico.definirConta({ id: r.id, contaId: e.target.value || null }),
                  e.target.value ? `"${r.descricao}" ligada à conta` : `"${r.descricao}" sem conta`
                )
              }
            >
              <option value="">conta não informada</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {r.proxima && !encerrada && (
        <div className={estilos.proxima}>
          <span>Próxima</span>
          <strong>{dataCurta(r.proxima.data)}</strong>
        </div>
      )}

      <div className={estilos.valor}>
        <strong className="numero">{formatarCentavos(r.estimativaCentavos)}</strong>
        <span>{r.valorVariavel ? 'estimativa/mês' : 'por mês'}</span>
      </div>

      {!encerrada && r.tipo === 'receita' && (
        <button className={estilos.acao} title="Férias (CLT): ajustar o pagamento e os próximos salários" onClick={() => setFerias(true)}>
          <Palmtree size={15} />
        </button>
      )}
      {ferias && <ModalFerias recorrencia={r} aoFechar={() => setFerias(false)} />}
      {!encerrada &&
        (encerrando ? (
          <span className={estilos.confirmacao}>
            <button
              className={estilos.confirmar}
              title={`Encerrar a partir de ${nomeDoMes(proximoMes).toLowerCase()}`}
              onClick={() =>
                executar(
                  () => recorrenciaServico.encerrar({ id: r.id, aPartirDe: proximoMes }),
                  `"${r.descricao}" encerrada a partir de ${nomeDoMes(proximoMes).toLowerCase()}`
                )
              }
            >
              <Check size={15} />
            </button>
            <button className={estilos.acao} aria-label="Cancelar" onClick={() => setEncerrando(false)}>
              <X size={15} />
            </button>
          </span>
        ) : (
          <button className={estilos.acao} title="Encerrar esta conta" onClick={() => setEncerrando(true)}>
            <X size={15} />
          </button>
        ))}
    </li>
  )
}

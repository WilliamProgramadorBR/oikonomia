import { useState } from 'react'
import { Check, CreditCard, Repeat, Trash2, X } from 'lucide-react'
import type { CategoriaDTO } from '@compartilhado/dtos/categoria'
import { CASA } from '@compartilhado/constantes/casa'
import type { PessoaDTO } from '@compartilhado/dtos/pessoa'
import type { TransacaoDTO } from '@compartilhado/dtos/transacao'
import { useAcao } from '../../hooks/useAcao'
import { transacaoServico } from '../../servicos/transacaoServico'
import { classes } from '../../utilitarios/classes'
import { dataCurta, rotuloDoDia } from '../../utilitarios/datas'
import { formatarCentavos } from '../../utilitarios/moeda'
import { useAcoesGlobais } from '../layout/Layout'
import { Botao } from '../ui/Botao'
import { Avatar, IconeCategoria } from '../ui/Elementos'
import estilos from './Transacoes.module.css'

const SINAL = { receita: '+ ', despesa: '− ', guardado: '→ ' }

interface PropsListaTransacoes {
  transacoes: TransacaoDTO[]
  pessoas: PessoaDTO[]
  categorias: CategoriaDTO[]
  agruparPorDia?: boolean
  permitirRemover?: boolean
}

export function ListaTransacoes({
  transacoes,
  pessoas,
  categorias,
  agruparPorDia = false,
  permitirRemover = false
}: PropsListaTransacoes) {
  const pessoaPorId = new Map(pessoas.map((p) => [p.id, p]))
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]))
  const mostrarPessoa = pessoas.length > 1

  const linha = (t: TransacaoDTO) => (
    <LinhaTransacao
      key={t.id}
      transacao={t}
      pessoa={t.pessoaId ? pessoaPorId.get(t.pessoaId) : undefined}
      daCasa={t.pessoaId === null}
      categoria={categoriaPorId.get(t.categoriaId)}
      mostrarData={!agruparPorDia}
      mostrarPessoa={mostrarPessoa}
      permitirRemover={permitirRemover}
    />
  )

  if (!agruparPorDia) return <ul className={estilos.lista}>{transacoes.map(linha)}</ul>

  const porDia = new Map<string, TransacaoDTO[]>()
  for (const t of transacoes) porDia.set(t.data, [...(porDia.get(t.data) ?? []), t])

  return (
    <div className={estilos.grupos}>
      {[...porDia].map(([dia, doDia]) => {
        const saldoDoDia = doDia.reduce(
          (total, t) => total + (t.tipo === 'receita' ? t.valorCentavos : -t.valorCentavos),
          0
        )
        return (
          <section key={dia}>
            <header className={estilos.cabecalhoDia}>
              <span>{rotuloDoDia(dia)}</span>
              <span className="numero">{formatarCentavos(saldoDoDia)}</span>
            </header>
            <ul className={estilos.lista}>{doDia.map(linha)}</ul>
          </section>
        )
      })}
    </div>
  )
}

interface PropsLinha {
  transacao: TransacaoDTO
  pessoa?: PessoaDTO
  daCasa: boolean
  categoria?: CategoriaDTO
  mostrarData: boolean
  mostrarPessoa: boolean
  permitirRemover: boolean
}

function LinhaTransacao({
  transacao: t,
  pessoa,
  daCasa,
  categoria,
  mostrarData,
  mostrarPessoa,
  permitirRemover
}: PropsLinha) {
  const executar = useAcao()
  const { confirmar } = useAcoesGlobais()
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false)
  const prevista = t.status === 'prevista'

  const detalhes = [categoria?.nome, t.estabelecimento, mostrarData && dataCurta(t.data)].filter(
    Boolean
  )
  const rotuloRemover = t.recorrenciaId ? 'Pular este mês' : 'Remover lançamento'

  return (
    <li className={classes(estilos.item, prevista && estilos.itemPrevisto)}>
      <IconeCategoria icone={categoria?.icone ?? 'outros'} cor={categoria?.cor ?? '#94a3b8'} />
      <div className={estilos.itemTexto}>
        <div className={estilos.itemTitulo}>
          <strong>{t.descricao}</strong>
          {t.parcela && (
            <span className={estilos.seloParcela} title="Parcela de compra no cartão">
              <CreditCard size={11} />
              {t.parcela.numero}/{t.parcela.total}
            </span>
          )}
          {t.recorrenciaId && (
            <span
              className={classes(estilos.seloParcela, prevista && estilos.seloPrevisto)}
              title={prevista ? 'Valor estimado, aguardando confirmação' : 'Conta recorrente'}
            >
              <Repeat size={11} />
              {prevista ? 'previsto' : 'recorrente'}
            </span>
          )}
          {t.cartaoId && !t.parcela && (
            <span className={estilos.seloParcela} title="Cobrada no cartão de crédito">
              <CreditCard size={11} />
            </span>
          )}
        </div>
        <span>{detalhes.join(' · ')}</span>
      </div>
      {mostrarPessoa && pessoa && <Avatar nome={pessoa.nome} cor={pessoa.cor} tamanho={26} />}
      {mostrarPessoa && daCasa && <Avatar nome={CASA.nome} cor={CASA.cor} tamanho={26} casa />}
      {prevista && (
        <Botao variante="secundario" tamanho="p" onClick={() => confirmar(t)}>
          Confirmar
        </Botao>
      )}
      <span className={classes(estilos.valor, 'numero', estilos[t.tipo])}>
        {SINAL[t.tipo]}
        {formatarCentavos(t.valorCentavos)}
      </span>

      {/* Parcelas são removidas pela compra (tela Cartões); o espaço mantém as colunas alinhadas */}
      {permitirRemover && t.parcela && <span className={estilos.espacoAcao} />}
      {permitirRemover &&
        !t.parcela &&
        (confirmandoRemocao ? (
          <span className={estilos.confirmacao}>
            <button
              className={estilos.confirmar}
              aria-label={`Confirmar: ${rotuloRemover}`}
              onClick={() =>
                executar(
                  () => transacaoServico.remover(t.id),
                  t.recorrenciaId ? 'Ocorrência pulada' : 'Lançamento removido'
                )
              }
            >
              <Check size={15} />
            </button>
            <button
              className={estilos.acaoLinha}
              aria-label="Cancelar"
              onClick={() => setConfirmandoRemocao(false)}
            >
              <X size={15} />
            </button>
          </span>
        ) : (
          <button
            className={estilos.acaoLinha}
            aria-label={rotuloRemover}
            title={rotuloRemover}
            onClick={() => setConfirmandoRemocao(true)}
          >
            <Trash2 size={15} />
          </button>
        ))}
    </li>
  )
}

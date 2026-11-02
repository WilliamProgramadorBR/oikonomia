import { useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Plus,
  ReceiptText,
  Search,
  Wallet
} from 'lucide-react'
import { useNovoLancamento } from '../../componentes/layout/Layout'
import { ListaTransacoes } from '../../componentes/transacoes/ListaTransacoes'
import { Alternador } from '../../componentes/ui/Alternador'
import { Botao } from '../../componentes/ui/Botao'
import { Campo } from '../../componentes/ui/Campo'
import { Cartao } from '../../componentes/ui/Cartao'
import { EstadoVazio, Esqueleto } from '../../componentes/ui/Elementos'
import { useVisao } from '../../contextos/VisaoContexto'
import { useCategorias, usePessoas, useTransacoes } from '../../hooks/consultas'
import { classes } from '../../utilitarios/classes'
import { formatarCentavos } from '../../utilitarios/moeda'
import estilos from './Lancamentos.module.css'

type FiltroTipo = 'todos' | 'receita' | 'despesa' | 'guardado'

export function Lancamentos() {
  const { pessoaId, mes } = useVisao()
  const { dados: transacoes } = useTransacoes({ pessoaId, mes })
  const { dados: pessoas } = usePessoas()
  const { dados: categorias } = useCategorias()
  const abrirNovoLancamento = useNovoLancamento()

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [busca, setBusca] = useState('')

  const categoriaPorId = new Map((categorias ?? []).map((c) => [c.id, c]))
  const termo = busca.trim().toLowerCase()

  const visiveis = (transacoes ?? []).filter(
    (t) =>
      (filtroTipo === 'todos' || t.tipo === filtroTipo) &&
      (!termo ||
        [t.descricao, t.estabelecimento, categoriaPorId.get(t.categoriaId)?.nome].some((texto) =>
          texto?.toLowerCase().includes(termo)
        ))
  )

  const somar = (tipo: 'receita' | 'despesa' | 'guardado') =>
    (transacoes ?? []).filter((t) => t.tipo === tipo).reduce((s, t) => s + t.valorCentavos, 0)
  const receitas = somar('receita')
  const despesas = somar('despesa')
  const guardado = somar('guardado')

  return (
    <div className={estilos.pagina}>
      <div className={estilos.resumo}>
        <Resumo rotulo="Entradas" valor={receitas} icone={<ArrowUpRight size={16} />} tom="receita" />
        <Resumo rotulo="Saídas" valor={despesas} icone={<ArrowDownRight size={16} />} tom="despesa" />
        <Resumo rotulo="Guardado" valor={guardado} icone={<PiggyBank size={16} />} tom="guardado" />
        <Resumo
          rotulo="Saldo livre"
          valor={receitas - despesas - guardado}
          icone={<Wallet size={16} />}
          tom="primaria"
        />
      </div>

      <Cartao
        titulo={`${visiveis.length} lançamento${visiveis.length === 1 ? '' : 's'}`}
        acao={
          <div className={estilos.ferramentas}>
            <Campo
              icone={Search}
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={estilos.busca}
            />
            <Alternador
              valor={filtroTipo}
              aoAlterar={setFiltroTipo}
              opcoes={[
                { valor: 'todos', rotulo: 'Todos' },
                { valor: 'receita', rotulo: 'Receitas', cor: 'var(--receita)' },
                { valor: 'despesa', rotulo: 'Despesas', cor: 'var(--despesa)' },
                { valor: 'guardado', rotulo: 'Guardado', cor: 'var(--primaria)' }
              ]}
            />
          </div>
        }
      >
        {!transacoes || !pessoas || !categorias ? (
          <div className={estilos.carregando}>
            {[1, 2, 3, 4].map((n) => (
              <Esqueleto key={n} altura={48} />
            ))}
          </div>
        ) : visiveis.length === 0 ? (
          <EstadoVazio
            icone={ReceiptText}
            titulo={transacoes.length === 0 ? 'Nenhum lançamento neste mês' : 'Nada encontrado'}
            descricao={
              transacoes.length === 0
                ? 'Registre receitas e despesas para acompanhar para onde vai o dinheiro.'
                : 'Tente outro termo de busca ou filtro.'
            }
            acao={
              transacoes.length === 0 && (
                <Botao icone={Plus} onClick={abrirNovoLancamento}>
                  Novo lançamento
                </Botao>
              )
            }
          />
        ) : (
          <ListaTransacoes
            transacoes={visiveis}
            pessoas={pessoas}
            categorias={categorias}
            agruparPorDia
            permitirRemover
          />
        )}
      </Cartao>
    </div>
  )
}

interface PropsResumo {
  rotulo: string
  valor: number
  icone: React.ReactNode
  tom: 'receita' | 'despesa' | 'primaria' | 'guardado'
}

function Resumo({ rotulo, valor, icone, tom }: PropsResumo) {
  return (
    <div className={estilos.resumoItem}>
      <span className={classes(estilos.resumoIcone, estilos[tom])}>{icone}</span>
      <div>
        <span className={estilos.resumoRotulo}>{rotulo}</span>
        <strong className="numero">{formatarCentavos(valor)}</strong>
      </div>
    </div>
  )
}

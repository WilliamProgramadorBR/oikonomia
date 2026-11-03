import { useNavigate } from 'react-router'
import {
  ArrowDownRight,
  ArrowUpRight,
  LifeBuoy,
  PiggyBank,
  Plus,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet
} from 'lucide-react'
import type { PainelDTO } from '@compartilhado/dtos/painel'
import { BarrasRanking } from '../../componentes/graficos/BarrasRanking'
import { GraficoCategorias } from '../../componentes/graficos/GraficoCategorias'
import { GraficoFluxoMensal, LegendaFluxo } from '../../componentes/graficos/GraficoFluxoMensal'
import { useNovoLancamento } from '../../componentes/layout/Layout'
import { ListaTransacoes } from '../../componentes/transacoes/ListaTransacoes'
import { Botao } from '../../componentes/ui/Botao'
import { Cartao } from '../../componentes/ui/Cartao'
import { EstadoVazio, Esqueleto, Etiqueta } from '../../componentes/ui/Elementos'
import { useVisao } from '../../contextos/VisaoContexto'
import { useCategorias, usePainel, usePessoas, usePlanoAperto } from '../../hooks/consultas'
import { classes } from '../../utilitarios/classes'
import { formatarCentavos, formatarPercentual } from '../../utilitarios/moeda'
import { Kpi } from './Kpi'
import estilos from './Painel.module.css'
import { ResumoSaude } from './ResumoSaude'

const META_POUPANCA = 0.2

export function Painel() {
  const { pessoaId } = useVisao()
  const { dados: painel } = usePainel()
  const { dados: pessoas } = usePessoas()
  const { dados: categorias } = useCategorias()
  const abrirNovoLancamento = useNovoLancamento()
  const navegar = useNavigate()
  const { dados: aperto } = usePlanoAperto()

  if (pessoas?.length === 0) {
    return (
      <Cartao>
        <EstadoVazio
          icone={Users}
          titulo="Bem-vindo! Vamos começar pela família"
          descricao="Cadastre quem participa do orçamento. Depois é só registrar as receitas e despesas para o painel ganhar vida."
          acao={<Botao onClick={() => navegar('/familia')}>Cadastrar família</Botao>}
        />
      </Cartao>
    )
  }

  if (!painel || !pessoas || !categorias) return <PainelCarregando />

  const semMovimento = painel.ultimasTransacoes.length === 0

  return (
    <div className={estilos.painel}>
      {aperto && aperto.buracoCentavos > 0 && (
        <button type="button" className={estilos.avisoAperto} onClick={() => navegar('/aperto')}>
          <LifeBuoy size={18} />
          <span>
            <strong>Faltam {formatarCentavos(aperto.buracoCentavos)} este mês.</strong> Veja o plano de aperto: o que está acontecendo e a saída mais
            barata.
          </span>
        </button>
      )}
      <Indicadores painel={painel} />

      <ResumoSaude />

      {painel.aConfirmar.length > 0 && (
        <Cartao
          titulo="Contas a confirmar"
          subtitulo="Vencidas ou vencendo nos próximos 7 dias. Confirme o valor real para o app aprender."
          acao={<Etiqueta cor="var(--alerta)">{painel.aConfirmar.length} pendente(s)</Etiqueta>}
        >
          <ListaTransacoes transacoes={painel.aConfirmar} pessoas={pessoas} categorias={categorias} />
        </Cartao>
      )}

      <div className={estilos.linhaGraficos}>
        <Cartao
          titulo="Fluxo dos últimos 6 meses"
          subtitulo="Receitas, despesas e o saldo de cada mês"
          acao={<LegendaFluxo />}
        >
          <GraficoFluxoMensal dados={painel.fluxoMensal} />
        </Cartao>

        <Cartao titulo="Para onde foi o dinheiro" subtitulo="Despesas do mês por categoria">
          {painel.despesasPorCategoria.length > 0 ? (
            <GraficoCategorias fatias={painel.despesasPorCategoria} />
          ) : (
            <EstadoVazio icone={PiggyBank} titulo="Nenhuma despesa no mês" />
          )}
        </Cartao>
      </div>

      <div className={classes(estilos.linhaGraficos, pessoaId && estilos.linhaUnica)}>
        <Cartao
          titulo="Últimos lançamentos"
          subtitulo="O que aconteceu de mais recente no mês"
          acao={
            <Botao variante="secundario" tamanho="p" onClick={() => navegar('/lancamentos')}>
              Ver todos
            </Botao>
          }
        >
          {semMovimento ? (
            <EstadoVazio
              icone={ReceiptText}
              titulo="Nada registrado neste mês"
              descricao="Registre a primeira receita ou despesa para acompanhar o mês."
              acao={
                <Botao icone={Plus} onClick={abrirNovoLancamento}>
                  Novo lançamento
                </Botao>
              }
            />
          ) : (
            <ListaTransacoes
              transacoes={painel.ultimasTransacoes}
              pessoas={pessoas}
              categorias={categorias}
            />
          )}
        </Cartao>

        {!pessoaId && (
          <Cartao titulo="Gastos por pessoa" subtitulo="Quem mais gastou neste mês">
            {painel.despesasPorPessoa.length > 0 ? (
              <BarrasRanking fatias={painel.despesasPorPessoa} comAvatar />
            ) : (
              <EstadoVazio icone={Users} titulo="Sem gastos no mês" />
            )}
          </Cartao>
        )}
      </div>
    </div>
  )
}

function Indicadores({ painel }: { painel: PainelDTO }) {
  const { saldo, receitas, despesas, guardado, taxaPoupanca, variacaoDespesas } = painel
  const tomPoupanca =
    taxaPoupanca === null || taxaPoupanca < 0
      ? 'despesa'
      : taxaPoupanca >= META_POUPANCA
        ? 'receita'
        : 'alerta'

  return (
    <div className={estilos.kpis}>
      <Kpi rotulo="Saldo do mês" valor={formatarCentavos(saldo)} icone={Wallet} tom="primaria" destaque>
        {saldo >= 0 ? 'Livre depois de gastar e guardar' : 'Os gastos passaram da renda'}
      </Kpi>

      <Kpi rotulo="Receitas" valor={formatarCentavos(receitas)} icone={ArrowUpRight} tom="receita">
        {painel.receitasPrevistas > 0
          ? `${formatarCentavos(painel.receitasPrevistas)} ainda previstos`
          : 'Tudo o que entrou no mês'}
      </Kpi>

      <Kpi rotulo="Despesas" valor={formatarCentavos(despesas)} icone={ArrowDownRight} tom="despesa">
        {painel.despesasPrevistas > 0 ? (
          `${formatarCentavos(painel.despesasPrevistas)} ainda previstos`
        ) : variacaoDespesas === null ? (
          'Sem base no mês anterior'
        ) : (
          <span
            className={classes(
              estilos.variacao,
              variacaoDespesas > 0 ? estilos.variacaoRuim : estilos.variacaoBoa
            )}
          >
            {variacaoDespesas > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {formatarPercentual(Math.abs(variacaoDespesas))}
            <em>vs. mês anterior</em>
          </span>
        )}
      </Kpi>

      <Kpi rotulo="Guardado" valor={formatarCentavos(guardado)} icone={PiggyBank} tom={tomPoupanca}>
        <div className={estilos.meta}>
          <div className={estilos.metaTrilho}>
            <div
              className={classes(estilos.metaBarra, estilos[tomPoupanca])}
              style={{ width: `${Math.min(Math.max((taxaPoupanca ?? 0) / META_POUPANCA, 0), 1) * 100}%` }}
            />
          </div>
          <span>
            Poupança {taxaPoupanca === null ? '—' : formatarPercentual(taxaPoupanca)} da renda · meta{' '}
            {formatarPercentual(META_POUPANCA)}
          </span>
        </div>
      </Kpi>
    </div>
  )
}

function PainelCarregando() {
  return (
    <div className={estilos.painel}>
      <div className={estilos.kpis}>
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className={estilos.kpi}>
            <Esqueleto largura="40%" />
            <Esqueleto altura={30} largura="70%" />
            <Esqueleto altura={12} largura="55%" />
          </div>
        ))}
      </div>
      <div className={estilos.linhaGraficos}>
        <Cartao>
          <Esqueleto altura={300} />
        </Cartao>
        <Cartao>
          <Esqueleto altura={300} />
        </Cartao>
      </div>
    </div>
  )
}

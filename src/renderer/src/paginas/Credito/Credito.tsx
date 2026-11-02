import { useState, type FormEvent } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Calculator, CircleCheck, CircleX, Hash, Search } from 'lucide-react'
import type { OfertaCreditoDTO, SimulacaoCreditoDTO } from '@compartilhado/dtos/divida'
import { NOMES_MODALIDADES, type ModalidadeCredito } from '@compartilhado/dtos/taxa'
import { simularFinanciamento, type SistemaAmortizacao } from '@compartilhado/financeiro/credito'
import { TooltipGrafico } from '../../componentes/graficos/TooltipGrafico'
import { Alternador } from '../../componentes/ui/Alternador'
import { Botao } from '../../componentes/ui/Botao'
import { Campo, CampoMoeda, CampoSelecao } from '../../componentes/ui/Campo'
import { Cartao } from '../../componentes/ui/Cartao'
import { EstadoVazio, Etiqueta } from '../../componentes/ui/Elementos'
import { useNotificar } from '../../contextos/NotificacaoContexto'
import { dividaServico } from '../../servicos/dividaServico'
import { classes } from '../../utilitarios/classes'
import { formatarTaxaCurta } from '../../utilitarios/dividas'
import { nomeInstituicao } from '../../utilitarios/instituicoes'
import { formatarCentavos, formatarCentavosCompacto } from '../../utilitarios/moeda'
import estilos from './Credito.module.css'

const MODALIDADES: ModalidadeCredito[] = [
  'imobiliario_tr',
  'imobiliario_prefixado',
  'veiculos',
  'credito_pessoal',
  'consignado_privado',
  'consignado_publico',
  'consignado_inss'
]
const EIXO = { fill: 'var(--texto-fraco)', fontSize: 12 }
const ehImovel = (m: ModalidadeCredito) => m.startsWith('imobiliario')

export function Credito() {
  const notificar = useNotificar()
  const [modalidade, setModalidade] = useState<ModalidadeCredito>('veiculos')
  const [valor, setValor] = useState(0)
  const [meses, setMeses] = useState('12')
  const [sistema, setSistema] = useState<SistemaAmortizacao>('price')
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState<{ simulacao: SimulacaoCreditoDTO; valor: number; meses: number; sistema: SistemaAmortizacao } | null>(null)
  const [selecionado, setSelecionado] = useState<string | null>(null)

  function trocarModalidade(nova: ModalidadeCredito) {
    setModalidade(nova)
    setSistema(ehImovel(nova) ? 'sac' : 'price')
    if (ehImovel(nova) && Number(meses) < 60) setMeses('360')
  }

  async function simular(evento: FormEvent) {
    evento.preventDefault()
    setCarregando(true)
    try {
      const simulacao = await dividaServico.simularCredito({ modalidade, valorCentavos: valor, meses: Number(meses), sistema })
      setResultado({ simulacao, valor, meses: Number(meses), sistema })
      setSelecionado(simulacao.ofertas[0]?.cnpj8 ?? null)
    } catch (erro) {
      notificar('erro', (erro as Error).message)
    } finally {
      setCarregando(false)
    }
  }

  const ofertas = resultado?.simulacao.ofertas ?? []
  const oferta = ofertas.find((o) => o.cnpj8 === selecionado)
  const melhor = ofertas[0]
  const pior = ofertas[ofertas.length - 1]

  return (
    <div className={estilos.pagina}>
      <Cartao titulo="O que você quer financiar?" subtitulo="Comparamos todos os bancos com as taxas médias publicadas pelo Banco Central">
        <form className={estilos.formulario} onSubmit={simular}>
          <CampoSelecao rotulo="Tipo de crédito" value={modalidade} onChange={(e) => trocarModalidade(e.target.value as ModalidadeCredito)}>
            {MODALIDADES.map((m) => (
              <option key={m} value={m}>
                {NOMES_MODALIDADES[m]}
              </option>
            ))}
          </CampoSelecao>
          <CampoMoeda rotulo="Valor" centavos={valor} aoAlterar={setValor} />
          <Campo rotulo="Prazo (meses)" icone={Hash} type="number" min={1} max={420} value={meses} onChange={(e) => setMeses(e.target.value)} />
          <div className={estilos.sistema}>
            <span>Sistema</span>
            <Alternador
              largo
              valor={sistema}
              aoAlterar={setSistema}
              opcoes={[
                { valor: 'price', rotulo: 'Price' },
                { valor: 'sac', rotulo: 'SAC' }
              ]}
            />
          </div>
          <Botao type="submit" icone={Search} carregando={carregando}>
            Comparar bancos
          </Botao>
        </form>
        <p className={estilos.dica}>
          <strong>Price:</strong> parcelas iguais do começo ao fim. <strong>SAC:</strong> parcelas começam
          maiores e vão diminuindo; no total, paga menos juros.
        </p>
        {ehImovel(modalidade) && (
          <p className={estilos.dica}>
            {modalidade === 'imobiliario_tr'
              ? 'Taxa + TR: a TR (Taxa Referencial) é somada à taxa do banco e costuma ser pequena; a simulação usa só a taxa do banco.'
              : 'Prefixado: a taxa não muda durante o contrato. Poucos bancos oferecem.'}{' '}
            O custo efetivo total (CET) inclui seguros e tarifas e é maior que a taxa de juros.
          </p>
        )}
      </Cartao>

      {!resultado ? (
        <Cartao>
          <EstadoVazio
            icone={Calculator}
            titulo="Simule antes de assinar"
            descricao='Ex.: "quero financiar R$ 40 mil de um carro em 12 meses: qual banco sai mais barato e quanto pago de juros?"'
          />
        </Cartao>
      ) : ofertas.length === 0 ? (
        <Cartao>
          <EstadoVazio icone={Calculator} titulo="Sem taxas para esta modalidade" descricao="Atualize as taxas na tela Taxas de juros e tente de novo." />
        </Cartao>
      ) : (
        <>
          <div className={estilos.resumo}>
            <div className={estilos.destaque}>
              <span>Melhor opção</span>
              <strong>{nomeInstituicao(melhor.instituicao)}</strong>
              <small>
                {formatarTaxaCurta(melhor.taxaMensal)} a.m. · total {formatarCentavos(melhor.totalPago)}
              </small>
            </div>
            <div className={estilos.destaque}>
              <span>Diferença para a mais cara</span>
              <strong className={estilos.economia}>{formatarCentavos(pior.totalPago - melhor.totalPago)}</strong>
              <small>escolhendo bem o banco</small>
            </div>
            <div className={estilos.destaque}>
              <span>Seu limite seguro de novas parcelas</span>
              <strong>{resultado.simulacao.limiteSeguroMensal === null ? '—' : formatarCentavos(resultado.simulacao.limiteSeguroMensal)}</strong>
              <small>
                {resultado.simulacao.limiteSeguroMensal !== null && melhor.primeiraParcela > resultado.simulacao.limiteSeguroMensal
                  ? 'a parcela passa do que cabe hoje: considere prazo maior ou valor menor'
                  : 'pela saúde financeira da família'}
              </small>
            </div>
          </div>

          <div className={estilos.colunas}>
            <Cartao titulo={`${ofertas.length} bancos, do mais barato ao mais caro`} subtitulo="Clique em um banco para ver a evolução das parcelas">
              <div className={estilos.tabelaRolagem}>
                <table className={estilos.tabela}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Banco</th>
                      <th>Taxa</th>
                      <th>{resultado.sistema === 'price' ? 'Parcela' : '1ª → última'}</th>
                      <th>Juros</th>
                      <th>Total</th>
                      <th>Cabe?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ofertas.map((o, i) => (
                      <LinhaOferta key={o.cnpj8} oferta={o} posicao={i + 1} sistema={resultado.sistema} ativa={o.cnpj8 === selecionado} aoClicar={() => setSelecionado(o.cnpj8)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </Cartao>

            {oferta && (
              <Cartao titulo={nomeInstituicao(oferta.instituicao)} subtitulo="Quanto de cada parcela é juro e quanto abate a dívida">
                <GraficoAmortizacao valor={resultado.valor} taxa={oferta.taxaMensal} meses={resultado.meses} sistema={resultado.sistema} />
                <dl className={estilos.detalhes}>
                  <div>
                    <dt>Taxa anual</dt>
                    <dd>{formatarTaxaCurta(oferta.taxaAnual)}</dd>
                  </div>
                  <div>
                    <dt>Juros totais</dt>
                    <dd className={classes('numero', estilos.juros)}>{formatarCentavos(oferta.totalJuros)}</dd>
                  </div>
                  <div>
                    <dt>Juros sobre o valor</dt>
                    <dd>{Math.round((oferta.totalJuros / resultado.valor) * 100)}%</dd>
                  </div>
                </dl>
              </Cartao>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function LinhaOferta({
  oferta: o,
  posicao,
  sistema,
  ativa,
  aoClicar
}: {
  oferta: OfertaCreditoDTO
  posicao: number
  sistema: SistemaAmortizacao
  ativa: boolean
  aoClicar: () => void
}) {
  return (
    <tr className={classes(ativa && estilos.ativa)} onClick={aoClicar}>
      <td>{posicao}</td>
      <td className={estilos.banco} title={o.instituicao}>
        {nomeInstituicao(o.instituicao)}
      </td>
      <td>{formatarTaxaCurta(o.taxaMensal)}</td>
      <td className="numero">
        {sistema === 'price'
          ? formatarCentavos(o.primeiraParcela)
          : `${formatarCentavosCompacto(o.primeiraParcela)} → ${formatarCentavosCompacto(o.ultimaParcela)}`}
      </td>
      <td className="numero">{formatarCentavos(o.totalJuros)}</td>
      <td className="numero">
        <strong>{formatarCentavos(o.totalPago)}</strong>
      </td>
      <td>
        {o.cabeNoOrcamento === null ? (
          '—'
        ) : o.cabeNoOrcamento ? (
          <Etiqueta cor="var(--receita)">
            <CircleCheck size={11} /> cabe
          </Etiqueta>
        ) : (
          <Etiqueta cor="var(--despesa)">
            <CircleX size={11} /> não cabe
          </Etiqueta>
        )}
      </td>
    </tr>
  )
}

// Contratos longos são agrupados por ano para o gráfico continuar legível.
function GraficoAmortizacao({ valor, taxa, meses, sistema }: { valor: number; taxa: number; meses: number; sistema: SistemaAmortizacao }) {
  const { linhas } = simularFinanciamento(valor, taxa, meses, sistema)
  const porAno = meses > 36
  const dados = porAno
    ? Array.from({ length: Math.ceil(meses / 12) }, (_, ano) => {
        const doAno = linhas.slice(ano * 12, ano * 12 + 12)
        return {
          rotulo: `Ano ${ano + 1}`,
          amortizacao: doAno.reduce((s, l) => s + l.amortizacao, 0),
          juros: doAno.reduce((s, l) => s + l.juros, 0)
        }
      })
    : linhas.map((l) => ({ rotulo: `${l.numero}ª`, amortizacao: l.amortizacao, juros: l.juros }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={dados} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--borda)" strokeDasharray="4 4" />
        <XAxis dataKey="rotulo" axisLine={false} tickLine={false} tick={EIXO} minTickGap={12} dy={6} />
        <YAxis axisLine={false} tickLine={false} tick={EIXO} width={72} tickFormatter={(v: number) => formatarCentavosCompacto(v)} />
        <Tooltip
          cursor={{ fill: 'var(--superficie-hover)' }}
          content={(props) => <TooltipGrafico {...props} cores={{ amortizacao: '#10b981', juros: '#f43f5e' }} />}
        />
        <Bar dataKey="amortizacao" name={porAno ? 'Amortização no ano' : 'Amortização'} stackId="p" fill="#10b981" maxBarSize={36} />
        <Bar dataKey="juros" name={porAno ? 'Juros no ano' : 'Juros'} stackId="p" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  )
}

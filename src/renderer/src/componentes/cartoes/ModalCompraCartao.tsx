import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { CreditCard, Hash, Percent, Store, TriangleAlert } from 'lucide-react'
import {
  calcularParcelamento,
  dataDeVencimento,
  mesDaPrimeiraFatura,
  taxaImplicita
} from '@compartilhado/financeiro/parcelamento'
import { deslocarMes, hojeISO } from '@compartilhado/utilitarios/mes'
import { useCategorias, usePessoas, useResumoCartoes } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { cartaoServico } from '../../servicos/cartaoServico'
import { classes } from '../../utilitarios/classes'
import { dataCurta, nomeDoMes } from '../../utilitarios/datas'
import { formatarCentavos, formatarTaxa } from '../../utilitarios/moeda'
import { SeletorCategoria, SeletorDestino } from '../transacoes/Seletores'
import { Alternador } from '../ui/Alternador'
import { Botao } from '../ui/Botao'
import { Campo, CampoMoeda, CampoSelecao } from '../ui/Campo'
import { EstadoVazio } from '../ui/Elementos'
import { Modal } from '../ui/Modal'
import estilos from './Cartoes.module.css'

const OPCOES_PARCELAS = Array.from({ length: 24 }, (_, i) => i + 1)
const paraNumero = (texto: string) => Number(texto.replace(',', '.'))

// nova = compra feita agora; andamento = compra antiga com parcelas a vencer; fatura = fatura parcelada no banco.
type Modo = 'nova' | 'andamento' | 'fatura'
// Categoria sugerida para a fatura parcelada, em ordem de preferência.
const CATEGORIAS_DIVIDA = [/juro|tarifa|encargo/i, /cart[aã]o/i, /d[ií]vida|empr[eé]stimo/i]

interface PropsModalCompraCartao {
  aberto: boolean
  aoFechar: () => void
  cartaoInicial?: string
}

export function ModalCompraCartao({ aberto, aoFechar, cartaoInicial }: PropsModalCompraCartao) {
  const { dados: resumos } = useResumoCartoes()
  const { dados: pessoas } = usePessoas()
  const { dados: categorias } = useCategorias()
  const executar = useAcao()
  const navegar = useNavigate()

  const [cartaoId, setCartaoId] = useState('')
  const [valorCentavos, setValorCentavos] = useState(0)
  const [descricao, setDescricao] = useState('')
  const [parcelas, setParcelas] = useState(1)
  const [comJuros, setComJuros] = useState(false)
  const [taxaTexto, setTaxaTexto] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [pessoaEscolhida, setPessoaEscolhida] = useState<string | null | undefined>(undefined)
  const [dataCompra, setDataCompra] = useState(hojeISO())
  const [estabelecimento, setEstabelecimento] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [modo, setModo] = useState<Modo>('nova')
  const [totalParcelas, setTotalParcelas] = useState('')
  const [restantes, setRestantes] = useState('')
  const [valorParcela, setValorParcela] = useState(0)
  const [proximaFatura, setProximaFatura] = useState('')

  useEffect(() => {
    if (!aberto) return
    setCartaoId(cartaoInicial ?? '')
    setValorCentavos(0)
    setDescricao('')
    setParcelas(1)
    setComJuros(false)
    setTaxaTexto('')
    setCategoriaId('')
    setPessoaEscolhida(undefined)
    setDataCompra(hojeISO())
    setEstabelecimento('')
    setModo('nova')
    setTotalParcelas('')
    setRestantes('')
    setValorParcela(0)
    setProximaFatura('')
  }, [aberto, cartaoInicial])

  const resumo = resumos?.find((r) => r.cartao.id === cartaoId) ?? resumos?.[0]
  const cartao = resumo?.cartao
  const taxaSugerida = cartao?.taxaContratoMensal ?? cartao?.taxaParceladoMercado ?? null
  // Padrão: o titular do cartão; pode ser trocado por outra pessoa ou por "todos".
  const pessoaId = pessoaEscolhida !== undefined ? pessoaEscolhida : (cartao?.pessoaId ?? null)

  // Prévia: mesma matemática que o backend usa para gerar as parcelas.
  const taxa = comJuros && parcelas > 1 ? paraNumero(taxaTexto || String(taxaSugerida ?? 0)) : 0
  const previa =
    valorCentavos > 0 && Number.isFinite(taxa)
      ? calcularParcelamento(valorCentavos, parcelas, taxa)
      : null
  const primeiraFatura = cartao
    ? mesDaPrimeiraFatura(dataCompra, cartao.diaFechamento, cartao.diaVencimento)
    : null
  const disponivelDepois = resumo && previa ? resumo.limiteDisponivelCentavos - previa.totalCentavos : null

  // Compra em andamento / fatura parcelada: só o que falta pagar entra nas faturas.
  const emAndamento = modo !== 'nova'
  const proximaFaturaPadrao = cartao ? mesDaPrimeiraFatura(hojeISO(), cartao.diaFechamento, cartao.diaVencimento) : ''
  const mesesFatura = proximaFaturaPadrao ? [-1, 0, 1, 2].map((d) => deslocarMes(proximaFaturaPadrao, d)) : []
  const faturaEscolhida = proximaFatura || proximaFaturaPadrao
  const nTotal = Number(totalParcelas)
  const nRestantes = Number(restantes)
  const andamentoValido = nTotal >= 1 && nRestantes >= 1 && nRestantes <= nTotal && valorParcela > 0
  const taxaAndamento = andamentoValido && valorCentavos > 0 ? taxaImplicita(valorCentavos, valorParcela, nTotal) : 0
  const jurosAndamento = andamentoValido && valorCentavos > 0 ? valorParcela * nTotal - valorCentavos : 0

  function trocarModo(novo: Modo) {
    setModo(novo)
    if (novo === 'fatura') {
      if (!descricao) setDescricao(`Parcelamento da fatura${cartao ? ` ${cartao.apelido}` : ''}`)
      const despesas = (categorias ?? []).filter((c) => c.tipo === 'despesa')
      const sugerida = CATEGORIAS_DIVIDA.map((padrao) => despesas.find((c) => padrao.test(c.nome))).find(Boolean)
      if (!categoriaId && sugerida) setCategoriaId(sugerida.id)
    }
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    if (!cartao) return
    setSalvando(true)
    const ok = await executar(
      () =>
        cartaoServico.criarCompra({
          cartaoId: cartao.id,
          descricao,
          valorCentavos,
          quantidadeParcelas: emAndamento ? nTotal : parcelas,
          taxaMensal: emAndamento ? 0 : taxa,
          dataCompra: emAndamento ? '' : dataCompra,
          categoriaId,
          pessoaId,
          estabelecimento,
          natureza: modo === 'fatura' ? 'parcelamento_fatura' : 'compra',
          emAndamento: emAndamento
            ? { parcelasRestantes: nRestantes, valorParcelaCentavos: valorParcela, proximaFatura: faturaEscolhida }
            : null
        }),
      modo === 'fatura'
        ? 'Parcelamento da fatura registrado. Ele aparece também em Dívidas.'
        : modo === 'andamento'
          ? `Compra registrada: ${nRestantes} parcela(s) a vencer.`
          : parcelas > 1
            ? `Compra em ${parcelas}x registrada`
            : 'Compra registrada'
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  if (resumos && resumos.length === 0) {
    return (
      <Modal aberto={aberto} aoFechar={aoFechar} titulo="Compra no cartão">
        <EstadoVazio
          icone={CreditCard}
          titulo="Nenhum cartão cadastrado"
          descricao="Cadastre seu cartão com limite, fechamento e vencimento para registrar compras parceladas."
          acao={
            <Botao
              onClick={() => {
                aoFechar()
                navegar('/cartoes')
              }}
            >
              Cadastrar cartão
            </Botao>
          }
        />
      </Modal>
    )
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Compra no cartão"
      descricao={
        modo === 'nova'
          ? 'As parcelas entram automaticamente nas faturas dos próximos meses.'
          : 'Para o que você já tinha antes de usar o app: só as parcelas que faltam entram nas próximas faturas.'
      }
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-compra" carregando={salvando}>
            {modo === 'fatura' ? 'Registrar parcelamento' : 'Registrar compra'}
          </Botao>
        </>
      }
    >
      <form id="formulario-compra" className={estilos.formulario} onSubmit={salvar}>
        <Alternador
          largo
          valor={modo}
          aoAlterar={trocarModo}
          opcoes={[
            { valor: 'nova', rotulo: 'Compra nova' },
            { valor: 'andamento', rotulo: 'Já em andamento' },
            { valor: 'fatura', rotulo: 'Fatura parcelada' }
          ]}
        />

        <div className={estilos.escolhaCartoes}>
          {resumos?.map(({ cartao: c }) => (
            <button
              key={c.id}
              type="button"
              className={classes(estilos.escolhaCartao, c.id === cartao?.id && estilos.escolhaAtiva)}
              style={{ '--cor': c.cor } as CSSProperties}
              onClick={() => setCartaoId(c.id)}
            >
              <span className={estilos.miniCartao} />
              {c.apelido}
            </button>
          ))}
        </div>

        {emAndamento ? (
          <div>
            <CampoMoeda
              rotulo={modo === 'fatura' ? 'Valor da fatura que foi parcelada' : 'Valor original da compra (opcional)'}
              centavos={valorCentavos}
              aoAlterar={setValorCentavos}
            />
            <p className={estilos.dica}>
              {modo === 'fatura'
                ? 'Com o valor da fatura e as parcelas, o app calcula os juros do parcelamento.'
                : 'Se a compra teve juros, informe o valor à vista: o app calcula a taxa. Em branco, considera sem juros.'}
            </p>
          </div>
        ) : (
          <CampoMoeda destaque autoFocus centavos={valorCentavos} aoAlterar={setValorCentavos} />
        )}

        <Campo
          rotulo="Descrição"
          placeholder="Ex.: Notebook"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        {emAndamento && (
          <>
            <div className={estilos.linha}>
              <Campo rotulo="Total de parcelas" icone={Hash} type="number" min={1} max={48} placeholder="Ex.: 10" value={totalParcelas} onChange={(e) => setTotalParcelas(e.target.value)} />
              <Campo rotulo="Parcelas que faltam" icone={Hash} type="number" min={1} max={48} placeholder="Ex.: 6" value={restantes} onChange={(e) => setRestantes(e.target.value)} />
            </div>
            <div className={estilos.linha}>
              <CampoMoeda rotulo="Valor da parcela" centavos={valorParcela} aoAlterar={setValorParcela} />
              <CampoSelecao rotulo="Próxima parcela na fatura de" value={faturaEscolhida} onChange={(e) => setProximaFatura(e.target.value)}>
                {mesesFatura.map((m) => (
                  <option key={m} value={m}>
                    {nomeDoMes(m)}
                  </option>
                ))}
              </CampoSelecao>
            </div>
            {andamentoValido && (
              <div className={classes(estilos.previa, jurosAndamento > 0 && estilos.previaJuros)}>
                <div className={estilos.previaPrincipal}>
                  <span>
                    Faltam {nRestantes}x de <strong className="numero">{formatarCentavos(valorParcela)}</strong>
                  </span>
                  <small>
                    Da fatura de {nomeDoMes(faturaEscolhida).toLowerCase()} até a de{' '}
                    {nomeDoMes(deslocarMes(faturaEscolhida, nRestantes - 1)).toLowerCase()}
                  </small>
                </div>
                <dl className={estilos.previaDetalhes}>
                  <div>
                    <dt>Falta pagar</dt>
                    <dd className="numero">{formatarCentavos(valorParcela * nRestantes)}</dd>
                  </div>
                  {valorCentavos > 0 && (
                    <div>
                      <dt>Juros no total</dt>
                      <dd className={classes('numero', jurosAndamento > 0 && estilos.textoDespesa)}>
                        {formatarCentavos(Math.max(0, jurosAndamento))}
                        {taxaAndamento > 0 && ` (${formatarTaxa(taxaAndamento)})`}
                      </dd>
                    </div>
                  )}
                </dl>
                {valorCentavos > valorParcela * nTotal && (
                  <p className={estilos.alerta}>
                    <TriangleAlert size={15} /> O valor original é maior que a soma das parcelas: confira os números.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {!emAndamento && (
          <>
        <div className={estilos.linha}>
          <CampoSelecao
            rotulo="Parcelas"
            value={parcelas}
            onChange={(e) => setParcelas(Number(e.target.value))}
          >
            {OPCOES_PARCELAS.map((n) => (
              <option key={n} value={n}>
                {n === 1 ? 'À vista (1x)' : `${n}x`}
              </option>
            ))}
          </CampoSelecao>
          {parcelas > 1 && (
            <div className={estilos.campoJuros}>
              <span className={estilos.rotulo}>Juros</span>
              <Alternador
                largo
                valor={comJuros ? 'com' : 'sem'}
                aoAlterar={(v) => setComJuros(v === 'com')}
                opcoes={[
                  { valor: 'sem', rotulo: 'Sem juros', cor: 'var(--receita)' },
                  { valor: 'com', rotulo: 'Com juros', cor: 'var(--despesa)' }
                ]}
              />
            </div>
          )}
        </div>

        {comJuros && parcelas > 1 && (
          <div>
            <Campo
              rotulo="Taxa de juros (% ao mês)"
              icone={Percent}
              inputMode="decimal"
              placeholder={taxaSugerida ? String(taxaSugerida).replace('.', ',') : 'Ex.: 8,9'}
              value={taxaTexto}
              onChange={(e) => setTaxaTexto(e.target.value)}
            />
            <p className={estilos.dica}>
              {cartao?.taxaContratoMensal
                ? `Usando a taxa do seu contrato: ${formatarTaxa(cartao.taxaContratoMensal)}.`
                : cartao?.taxaParceladoMercado
                  ? `Sugestão: média do banco no Banco Central (${formatarTaxa(cartao.taxaParceladoMercado)}). Ajuste se a sua for diferente.`
                  : 'Informe a taxa mostrada na hora da compra.'}
            </p>
          </div>
        )}

        {previa && primeiraFatura && cartao && (
          <div className={classes(estilos.previa, previa.jurosCentavos > 0 && estilos.previaJuros)}>
            <div className={estilos.previaPrincipal}>
              <span>
                {parcelas}x de{' '}
                <strong className="numero">
                  {formatarCentavos(previa.parcelas[previa.parcelas.length - 1])}
                </strong>
              </span>
              <small>
                1ª parcela na fatura de {nomeDoMes(primeiraFatura).toLowerCase()} (vence{' '}
                {dataCurta(dataDeVencimento(primeiraFatura, cartao.diaVencimento))})
              </small>
            </div>
            <dl className={estilos.previaDetalhes}>
              <div>
                <dt>Total</dt>
                <dd className="numero">{formatarCentavos(previa.totalCentavos)}</dd>
              </div>
              <div>
                <dt>Juros</dt>
                <dd className={classes('numero', previa.jurosCentavos > 0 && estilos.textoDespesa)}>
                  {formatarCentavos(previa.jurosCentavos)}
                  {previa.jurosCentavos > 0 &&
                    ` (+${Math.round((previa.jurosCentavos / valorCentavos) * 100)}%)`}
                </dd>
              </div>
              {disponivelDepois !== null && (
                <div>
                  <dt>Limite após a compra</dt>
                  <dd className={classes('numero', disponivelDepois < 0 && estilos.textoDespesa)}>
                    {formatarCentavos(disponivelDepois)}
                  </dd>
                </div>
              )}
            </dl>
            {disponivelDepois !== null && disponivelDepois < 0 && (
              <p className={estilos.alerta}>
                <TriangleAlert size={15} /> Esta compra passa do limite disponível do cartão.
              </p>
            )}
          </div>
        )}

          </>
        )}

        <SeletorCategoria
          categorias={(categorias ?? []).filter((c) => c.tipo === 'despesa')}
          valor={categoriaId}
          aoAlterar={setCategoriaId}
        />

        <SeletorDestino pessoas={pessoas ?? []} valor={pessoaId} aoAlterar={setPessoaEscolhida} />

        <div className={estilos.linha}>
          {!emAndamento && (
            <Campo
              rotulo="Data da compra"
              type="date"
              value={dataCompra}
              onChange={(e) => setDataCompra(e.target.value)}
            />
          )}
          <Campo
            rotulo="Onde (opcional)"
            icone={Store}
            placeholder="Ex.: Loja"
            value={estabelecimento}
            onChange={(e) => setEstabelecimento(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  )
}

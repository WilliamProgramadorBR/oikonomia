import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { CreditCard, Percent, Store, TriangleAlert } from 'lucide-react'
import {
  calcularParcelamento,
  dataDeVencimento,
  mesDaPrimeiraFatura
} from '@compartilhado/financeiro/parcelamento'
import { hojeISO } from '@compartilhado/utilitarios/mes'
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
          quantidadeParcelas: parcelas,
          taxaMensal: taxa,
          dataCompra,
          categoriaId,
          pessoaId,
          estabelecimento
        }),
      parcelas > 1 ? `Compra em ${parcelas}x registrada` : 'Compra registrada'
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
      descricao="As parcelas entram automaticamente nas faturas dos próximos meses."
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-compra" carregando={salvando}>
            Registrar compra
          </Botao>
        </>
      }
    >
      <form id="formulario-compra" className={estilos.formulario} onSubmit={salvar}>
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

        <CampoMoeda destaque autoFocus centavos={valorCentavos} aoAlterar={setValorCentavos} />

        <Campo
          rotulo="Descrição"
          placeholder="Ex.: Notebook"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

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

        <SeletorCategoria
          categorias={(categorias ?? []).filter((c) => c.tipo === 'despesa')}
          valor={categoriaId}
          aoAlterar={setCategoriaId}
        />

        <SeletorDestino pessoas={pessoas ?? []} valor={pessoaId} aoAlterar={setPessoaEscolhida} />

        <div className={estilos.linha}>
          <Campo
            rotulo="Data da compra"
            type="date"
            value={dataCompra}
            onChange={(e) => setDataCompra(e.target.value)}
          />
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

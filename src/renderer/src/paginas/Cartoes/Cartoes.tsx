import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { Check, CreditCard, Plus, ShoppingBag, Trash2, TriangleAlert, X } from 'lucide-react'
import type { CompraCartaoDTO, ResumoCartaoDTO } from '@compartilhado/dtos/cartao'
import type { CategoriaDTO } from '@compartilhado/dtos/categoria'
import { CartaoVisual } from '../../componentes/cartoes/CartaoVisual'
import { GraficoFaturas } from '../../componentes/cartoes/GraficoFaturas'
import { useAcoesGlobais } from '../../componentes/layout/Layout'
import { Botao } from '../../componentes/ui/Botao'
import { Cartao } from '../../componentes/ui/Cartao'
import { EstadoVazio, Esqueleto, Etiqueta, IconeCategoria } from '../../componentes/ui/Elementos'
import { useVisao } from '../../contextos/VisaoContexto'
import { useCategorias, usePessoas, useResumoCartoes } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { cartaoServico } from '../../servicos/cartaoServico'
import { classes } from '../../utilitarios/classes'
import { mesAbreviado, nomeDoMes } from '../../utilitarios/datas'
import { nomeInstituicao } from '../../utilitarios/instituicoes'
import { formatarCentavos, formatarTaxa } from '../../utilitarios/moeda'
import estilos from './Cartoes.module.css'

export function Cartoes() {
  const { mes } = useVisao()
  const { dados: resumos } = useResumoCartoes()
  const { dados: pessoas } = usePessoas()
  const { dados: categorias } = useCategorias()
  const { novoCartao, novaCompra } = useAcoesGlobais()
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null)

  if (!resumos || !pessoas || !categorias) {
    return (
      <div className={estilos.grade}>
        {[1, 2, 3].map((n) => (
          <Esqueleto key={n} altura={190} />
        ))}
      </div>
    )
  }

  if (resumos.length === 0) {
    return (
      <Cartao>
        <EstadoVazio
          icone={CreditCard}
          titulo="Nenhum cartão cadastrado"
          descricao="Cadastre seus cartões para acompanhar faturas, parcelas futuras e quanto do limite já está comprometido."
          acao={
            <Botao icone={Plus} onClick={novoCartao}>
              Cadastrar cartão
            </Botao>
          }
        />
      </Cartao>
    )
  }

  const selecionado = resumos.find((r) => r.cartao.id === selecionadoId) ?? resumos[0]
  const nomeDe = (id: string) => pessoas.find((p) => p.id === id)?.nome.split(' ')[0]
  const total = (campo: 'faturaDoMesCentavos' | 'limiteUsadoCentavos' | 'limiteDisponivelCentavos') =>
    resumos.reduce((soma, r) => soma + r[campo], 0)
  const limiteTotal = resumos.reduce((soma, r) => soma + r.cartao.limiteCentavos, 0)

  return (
    <div className={estilos.pagina}>
      <div className={estilos.resumo}>
        <Indicador rotulo={`Faturas de ${mesAbreviado(mes).toLowerCase()}`} valor={total('faturaDoMesCentavos')} />
        <Indicador rotulo="Limite total" valor={limiteTotal} />
        <Indicador rotulo="Limite comprometido" valor={total('limiteUsadoCentavos')}>
          <div className={estilos.trilho}>
            <div
              className={estilos.barra}
              style={{ width: `${Math.min(total('limiteUsadoCentavos') / limiteTotal, 1) * 100}%` }}
            />
          </div>
        </Indicador>
        <Indicador rotulo="Disponível" valor={total('limiteDisponivelCentavos')} destaque />
      </div>

      <div className={estilos.grade}>
        {resumos.map((r) => (
          <CartaoVisual
            cnpj8={r.cartao.cnpj8}
            key={r.cartao.id}
            apelido={r.cartao.apelido}
            instituicao={r.cartao.instituicao}
            cor={r.cartao.cor}
            titular={nomeDe(r.cartao.pessoaId)}
            rotuloValor={`Fatura de ${mesAbreviado(mes).toLowerCase()}`}
            valor={formatarCentavos(r.faturaDoMesCentavos)}
            usoLimite={r.limiteUsadoCentavos / r.cartao.limiteCentavos}
            selecionado={r.cartao.id === selecionado.cartao.id}
            aoClicar={() => setSelecionadoId(r.cartao.id)}
          />
        ))}
        <button className={estilos.adicionar} onClick={novoCartao}>
          <Plus size={22} />
          <strong>Novo cartão</strong>
        </button>
      </div>

      <Detalhe
        resumo={selecionado}
        categorias={categorias}
        aoNovaCompra={() => novaCompra(selecionado.cartao.id)}
      />
    </div>
  )
}

function Indicador({
  rotulo,
  valor,
  destaque,
  children
}: {
  rotulo: string
  valor: number
  destaque?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className={classes(estilos.indicador, destaque && estilos.indicadorDestaque)}>
      <span>{rotulo}</span>
      <strong className="numero">{formatarCentavos(valor)}</strong>
      {children}
    </div>
  )
}

interface PropsDetalhe {
  resumo: ResumoCartaoDTO
  categorias: CategoriaDTO[]
  aoNovaCompra: () => void
}

function Detalhe({ resumo, categorias, aoNovaCompra }: PropsDetalhe) {
  const { cartao, comprasAtivas, limiteDisponivelCentavos } = resumo
  const executar = useAcao()
  const navegar = useNavigate()
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]))
  const taxaParcelado = cartao.taxaContratoMensal ?? cartao.taxaParceladoMercado

  return (
    <div className={estilos.detalhe} style={{ '--cor': cartao.cor } as CSSProperties}>
      <div className={estilos.faixaInfo}>
        <div className={estilos.infos}>
          <span>
            Fecha dia <strong>{cartao.diaFechamento}</strong>
          </span>
          <span>
            Vence dia <strong>{cartao.diaVencimento}</strong>
          </span>
          <span>
            Limite <strong className="numero">{formatarCentavos(cartao.limiteCentavos)}</strong>
          </span>
          {taxaParcelado !== null && (
            <button className={estilos.infoTaxa} onClick={() => navegar('/taxas')}>
              Parcelado <strong>{formatarTaxa(taxaParcelado)}</strong>
              <small>{cartao.taxaContratoMensal ? 'seu contrato' : 'média do banco'}</small>
            </button>
          )}
          {cartao.taxaRotativoMercado !== null && (
            <button className={estilos.infoTaxa} onClick={() => navegar('/taxas')}>
              Rotativo <strong className={estilos.textoDespesa}>{formatarTaxa(cartao.taxaRotativoMercado)}</strong>
              <small>evite atrasar a fatura</small>
            </button>
          )}
        </div>
        <Botao
          variante="fantasma"
          tamanho="p"
          icone={Trash2}
          onClick={() =>
            executar(() => cartaoServico.remover(cartao.id), `Cartão "${cartao.apelido}" removido`)
          }
        >
          Remover cartão
        </Botao>
      </div>

      {limiteDisponivelCentavos < 0 && (
        <p className={estilos.alertaLimite}>
          <TriangleAlert size={16} />
          As parcelas a vencer passam do limite em {formatarCentavos(-limiteDisponivelCentavos)}.
        </p>
      )}

      <div className={estilos.colunas}>
        <Cartao titulo="Próximas faturas" subtitulo="Parcelas já comprometidas em cada mês">
          <GraficoFaturas faturas={resumo.proximasFaturas} cor={cartao.cor} />
        </Cartao>

        <Cartao
          titulo="Compras em andamento"
          subtitulo={`${comprasAtivas.length} compra${comprasAtivas.length === 1 ? '' : 's'} com parcelas a vencer`}
          acao={
            <Botao variante="secundario" tamanho="p" icone={Plus} onClick={aoNovaCompra}>
              Nova compra
            </Botao>
          }
        >
          {comprasAtivas.length === 0 ? (
            <EstadoVazio
              icone={ShoppingBag}
              titulo="Nenhuma parcela a vencer"
              descricao={`O ${nomeInstituicao(cartao.instituicao)} está livre de parcelamentos.`}
            />
          ) : (
            <ul className={estilos.compras}>
              {comprasAtivas.map((compra) => (
                <LinhaCompra key={compra.id} compra={compra} categoria={categoriaPorId.get(compra.categoriaId)} />
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </div>
  )
}

function LinhaCompra({ compra, categoria }: { compra: CompraCartaoDTO; categoria?: CategoriaDTO }) {
  const executar = useAcao()
  const [confirmando, setConfirmando] = useState(false)
  const restantes = compra.quantidadeParcelas - compra.parcelasPagas
  const progresso = compra.parcelasPagas / compra.quantidadeParcelas

  return (
    <li className={estilos.compra}>
      <IconeCategoria icone={categoria?.icone ?? 'outros'} cor={categoria?.cor ?? '#94a3b8'} />
      <div className={estilos.compraTexto}>
        <div className={estilos.compraTitulo}>
          <strong>{compra.descricao}</strong>
          {compra.natureza === 'parcelamento_fatura' && <Etiqueta cor="var(--alerta)">fatura parcelada</Etiqueta>}
          {compra.taxaMensal > 0 && <Etiqueta cor="var(--despesa)">juros {formatarTaxa(compra.taxaMensal)}</Etiqueta>}
        </div>
        <span>
          {compra.parcelasPagas}/{compra.quantidadeParcelas} pagas · {formatarCentavos(compra.valorParcelaCentavos)}
          /mês · desde {nomeDoMes(compra.primeiraFatura).toLowerCase()}
        </span>
        <div className={estilos.trilho}>
          <div className={estilos.barra} style={{ width: `${progresso * 100}%` }} />
        </div>
      </div>
      <div className={estilos.compraRestante}>
        <strong className="numero">{formatarCentavos(restantes * compra.valorParcelaCentavos)}</strong>
        <span>
          {restantes} parcela{restantes === 1 ? '' : 's'}
        </span>
      </div>
      {confirmando ? (
        <span className={estilos.confirmacao}>
          <button
            className={estilos.confirmar}
            aria-label="Confirmar remoção"
            onClick={() => executar(() => cartaoServico.removerCompra(compra.id), 'Compra removida')}
          >
            <Check size={15} />
          </button>
          <button className={estilos.acao} aria-label="Cancelar" onClick={() => setConfirmando(false)}>
            <X size={15} />
          </button>
        </span>
      ) : (
        <button className={estilos.acao} aria-label="Remover compra" onClick={() => setConfirmando(true)}>
          <Trash2 size={15} />
        </button>
      )}
    </li>
  )
}

import { useState, type CSSProperties } from 'react'
import { CloudOff, Info, Landmark, RefreshCw, Search } from 'lucide-react'
import { NOMES_MODALIDADES, type ModalidadeCredito } from '@compartilhado/dtos/taxa'
import { Botao } from '../../componentes/ui/Botao'
import { Campo } from '../../componentes/ui/Campo'
import { Cartao } from '../../componentes/ui/Cartao'
import { EstadoVazio, Esqueleto, Etiqueta } from '../../componentes/ui/Elementos'
import { useCartoes, useTaxas } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { taxaServico } from '../../servicos/taxaServico'
import { classes } from '../../utilitarios/classes'
import { dataCurta } from '../../utilitarios/datas'
import { correspondeBusca, nomeInstituicao } from '../../utilitarios/instituicoes'
import { formatarTaxa } from '../../utilitarios/moeda'
import estilos from './Taxas.module.css'

const MODALIDADES = Object.keys(NOMES_MODALIDADES) as ModalidadeCredito[]

// Verde (barata) -> vermelho (cara), relativo às demais taxas da modalidade.
const corDaTaxa = (fracao: number) => `hsl(${Math.round(150 - fracao * 150)} 70% 45%)`

function quando(iso: string | null): string {
  if (!iso) return 'nunca'
  const data = new Date(iso)
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const mesmoDia = data.toDateString() === new Date().toDateString()
  return mesmoDia ? `hoje às ${hora}` : `${data.toLocaleDateString('pt-BR')} às ${hora}`
}

export function Taxas() {
  const [modalidade, setModalidade] = useState<ModalidadeCredito>('cartao_parcelado')
  const [busca, setBusca] = useState('')
  const [atualizando, setAtualizando] = useState(false)
  const { dados } = useTaxas(modalidade)
  const { dados: cartoes } = useCartoes()
  const executar = useAcao()

  const meusBancos = new Set(cartoes?.map((c) => c.cnpj8).filter(Boolean))
  const taxas = dados?.taxas ?? []
  const situacao = dados?.situacao
  const minima = taxas[0]?.taxaMensal ?? 0
  const maxima = taxas[taxas.length - 1]?.taxaMensal ?? 0
  const mediana = taxas.length ? taxas[Math.floor(taxas.length / 2)].taxaMensal : 0
  const visiveis = taxas.filter((t) => correspondeBusca(t.instituicao, busca))

  async function atualizar() {
    setAtualizando(true)
    await executar(() => taxaServico.atualizar(), 'Taxas atualizadas com o Banco Central')
    setAtualizando(false)
  }

  return (
    <div className={estilos.pagina}>
      <div className={estilos.fonte}>
        <span className={estilos.fonteIcone}>
          <Landmark size={20} />
        </span>
        <div className={estilos.fonteTexto}>
          <strong>Banco Central do Brasil</strong>
          <span>
            {situacao?.inicioPeriodo
              ? `Taxas médias de ${dataCurta(situacao.inicioPeriodo)} a ${dataCurta(situacao.fimPeriodo!)} · baixadas ${quando(situacao.atualizadoEm)}`
              : 'Ainda não baixamos as taxas.'}
          </span>
        </div>
        <Botao variante="secundario" icone={RefreshCw} carregando={atualizando} onClick={atualizar}>
          Atualizar
        </Botao>
      </div>

      <div className={estilos.modalidades} role="tablist">
        {MODALIDADES.map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={m === modalidade}
            className={classes(estilos.modalidade, m === modalidade && estilos.modalidadeAtiva)}
            onClick={() => setModalidade(m)}
          >
            {NOMES_MODALIDADES[m]}
          </button>
        ))}
      </div>

      {!dados ? (
        <Esqueleto altura={400} />
      ) : taxas.length === 0 ? (
        <Cartao>
          <EstadoVazio
            icone={CloudOff}
            titulo="Sem taxas salvas"
            descricao="Conecte-se à internet e clique em Atualizar para baixar as taxas do Banco Central."
          />
        </Cartao>
      ) : (
        <>
          <div className={estilos.estatisticas}>
            <Estatistica rotulo="Menor taxa" taxa={minima} detalhe={nomeInstituicao(taxas[0].instituicao)} cor={corDaTaxa(0)} />
            <Estatistica rotulo="Mediana do mercado" taxa={mediana} detalhe={`${taxas.length} instituições`} cor={corDaTaxa(0.5)} />
            <Estatistica
              rotulo="Maior taxa"
              taxa={maxima}
              detalhe={nomeInstituicao(taxas[taxas.length - 1].instituicao)}
              cor={corDaTaxa(1)}
            />
          </div>

          <Cartao
            titulo={`Ranking: ${NOMES_MODALIDADES[modalidade].toLowerCase()}`}
            subtitulo="Da menor para a maior taxa média ao mês"
            acao={
              <Campo
                icone={Search}
                placeholder="Buscar banco..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className={estilos.busca}
              />
            }
          >
            <ol className={estilos.ranking}>
              {visiveis.map((t) => {
                const fracao = maxima > minima ? (t.taxaMensal - minima) / (maxima - minima) : 0
                return (
                  <li
                    key={t.cnpj8}
                    className={classes(estilos.linha, meusBancos.has(t.cnpj8) && estilos.meuBanco)}
                    style={{ '--cor': corDaTaxa(fracao) } as CSSProperties}
                  >
                    <span className={estilos.posicao}>{t.posicao}</span>
                    <div className={estilos.instituicao}>
                      <strong title={t.instituicao}>{nomeInstituicao(t.instituicao)}</strong>
                      {meusBancos.has(t.cnpj8) && <Etiqueta>seu cartão</Etiqueta>}
                    </div>
                    <div className={estilos.trilho}>
                      <div className={estilos.barra} style={{ width: `${(t.taxaMensal / maxima) * 100}%` }} />
                    </div>
                    <div className={estilos.valores}>
                      <strong className="numero">{formatarTaxa(t.taxaMensal)}</strong>
                      <span className="numero">{formatarTaxa(t.taxaAnual, 'a.a.')}</span>
                    </div>
                  </li>
                )
              })}
            </ol>
          </Cartao>

          <p className={estilos.aviso}>
            <Info size={16} />
            São taxas <strong>médias</strong> praticadas por cada instituição. A sua pode ser maior ou
            menor conforme o seu perfil de crédito. Por isso, no cadastro do cartão dá para informar a
            taxa real do contrato.
          </p>
        </>
      )}
    </div>
  )
}

function Estatistica({ rotulo, taxa, detalhe, cor }: { rotulo: string; taxa: number; detalhe: string; cor: string }) {
  return (
    <div className={estilos.estatistica} style={{ '--cor': cor } as CSSProperties}>
      <span>{rotulo}</span>
      <strong className="numero">{formatarTaxa(taxa)}</strong>
      <small>{detalhe}</small>
    </div>
  )
}

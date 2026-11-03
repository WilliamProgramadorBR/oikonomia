import { useState, type CSSProperties } from 'react'
import { Landmark } from 'lucide-react'
import type { TaxaMercadoDTO } from '@compartilhado/dtos/taxa'
import { buscarBancos, CNPJS_DO_CATALOGO, type MarcaCartao } from '../../utilitarios/bancos'
import { correspondeBusca, nomeInstituicao } from '../../utilitarios/instituicoes'
import { formatarTaxa } from '../../utilitarios/moeda'
import { Campo } from '../ui/Campo'
import estilos from './Cartoes.module.css'

interface PropsCampoInstituicao {
  valor: string
  instituicoes: TaxaMercadoDTO[] // taxas de cartão parcelado do Banco Central: uma por instituição
  aoEscolher: (instituicao: string, cnpj8: string | null, marca: MarcaCartao | null) => void
}

const MAX_CATALOGO = 8
const MAX_OUTRAS = 5

// Busca primeiro no catálogo de emissores conhecidos (com o visual do cartão) e depois nas demais
// instituições do Banco Central. Se não achar nada, aceita o nome digitado.
export function CampoInstituicao({ valor, instituicoes, aoEscolher }: PropsCampoInstituicao) {
  const [aberto, setAberto] = useState(false)
  const taxaPorCnpj = new Map(instituicoes.map((t) => [t.cnpj8, t.taxaMensal]))
  const doCatalogo = buscarBancos(valor).slice(0, MAX_CATALOGO)
  const outras = valor.trim()
    ? instituicoes.filter((t) => !CNPJS_DO_CATALOGO.has(t.cnpj8) && correspondeBusca(t.instituicao, valor)).slice(0, MAX_OUTRAS)
    : []

  const escolher = (nome: string, cnpj8: string | null, marca: MarcaCartao | null) => {
    aoEscolher(nome, cnpj8, marca)
    setAberto(false)
  }

  return (
    <div className={estilos.campoInstituicao}>
      <Campo
        rotulo="Banco / instituição"
        icone={Landmark}
        placeholder="Busque: Nubank, Banco do Brasil, Mercado Pago..."
        value={valor}
        onChange={(e) => {
          aoEscolher(e.target.value, null, null)
          setAberto(true)
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setAberto(false)}
      />

      {aberto && (doCatalogo.length > 0 || outras.length > 0) && (
        <ul className={estilos.sugestoes}>
          {doCatalogo.map((marca) => {
            const taxa = marca.cnpj8 ? taxaPorCnpj.get(marca.cnpj8) : undefined
            return (
              <li key={marca.id}>
                <button
                  type="button"
                  // onMouseDown dispara antes do blur do campo
                  onMouseDown={(e) => {
                    e.preventDefault()
                    escolher(marca.nome, marca.cnpj8, marca)
                  }}
                >
                  <span
                    className={estilos.miniMarca}
                    style={{ '--fundo1': marca.fundo[0], '--fundo2': marca.fundo[1], '--destaque': marca.destaque ?? 'transparent' } as CSSProperties}
                  />
                  <span className={estilos.sugestaoTexto}>
                    <strong>{marca.nome}</strong>
                    <small>{marca.apelidos.slice(0, 2).join(' · ')}</small>
                  </span>
                  <em className="numero">{taxa !== undefined ? formatarTaxa(taxa) : 'taxa não publicada'}</em>
                </button>
              </li>
            )
          })}
          {outras.length > 0 && <li className={estilos.grupoSugestao}>Outras instituições (Banco Central)</li>}
          {outras.map((opcao) => (
            <li key={opcao.cnpj8}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  escolher(nomeInstituicao(opcao.instituicao), opcao.cnpj8, null)
                }}
              >
                <span className={estilos.miniMarca} />
                <span className={estilos.sugestaoTexto}>
                  <strong>{nomeInstituicao(opcao.instituicao)}</strong>
                  <small>{opcao.instituicao}</small>
                </span>
                <em className="numero">{formatarTaxa(opcao.taxaMensal)}</em>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

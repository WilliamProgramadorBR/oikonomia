import { useState } from 'react'
import { Landmark } from 'lucide-react'
import type { TaxaMercadoDTO } from '@compartilhado/dtos/taxa'
import { correspondeBusca, nomeInstituicao } from '../../utilitarios/instituicoes'
import { formatarTaxa } from '../../utilitarios/moeda'
import { Campo } from '../ui/Campo'
import estilos from './Cartoes.module.css'

interface PropsCampoInstituicao {
  valor: string
  instituicoes: TaxaMercadoDTO[] // taxas de cartão parcelado: uma por instituição
  aoEscolher: (instituicao: string, cnpj8: string | null) => void
}

// Busca a instituição na lista do Banco Central. Se não achar, aceita o nome digitado.
export function CampoInstituicao({ valor, instituicoes, aoEscolher }: PropsCampoInstituicao) {
  const [aberto, setAberto] = useState(false)
  const opcoes = instituicoes.filter((t) => correspondeBusca(t.instituicao, valor)).slice(0, 6)

  return (
    <div className={estilos.campoInstituicao}>
      <Campo
        rotulo="Banco / instituição"
        icone={Landmark}
        placeholder="Busque: Nubank, Itaú, Bradesco..."
        value={valor}
        onChange={(e) => {
          aoEscolher(e.target.value, null)
          setAberto(true)
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setAberto(false)}
      />

      {aberto && opcoes.length > 0 && (
        <ul className={estilos.sugestoes}>
          {opcoes.map((opcao) => (
            <li key={opcao.cnpj8}>
              <button
                type="button"
                // onMouseDown dispara antes do blur do campo
                onMouseDown={(e) => {
                  e.preventDefault()
                  aoEscolher(opcao.instituicao, opcao.cnpj8)
                  setAberto(false)
                }}
              >
                <span>
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

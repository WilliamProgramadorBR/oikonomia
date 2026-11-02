import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { Medidor } from '../../componentes/graficos/Medidor'
import { useSaude } from '../../hooks/consultas'
import { nomeDoMes } from '../../utilitarios/datas'
import { formatarCentavos } from '../../utilitarios/moeda'
import { CORES_CLASSIFICACAO, NOMES_CLASSIFICACAO } from '../../utilitarios/saude'
import estilos from './Painel.module.css'

// Faixa compacta no painel: nota, limite seguro do próximo mês e o ponto mais urgente.
export function ResumoSaude() {
  const { dados: saude } = useSaude()
  const navegar = useNavigate()

  if (!saude?.dadosSuficientes) return null

  const [principal] = saude.insights
  const mes = nomeDoMes(saude.mesReferencia).split(' ')[0].toLowerCase()

  return (
    <button
      className={estilos.resumoSaude}
      style={{ '--cor': CORES_CLASSIFICACAO[saude.classificacao] } as CSSProperties}
      onClick={() => navegar('/saude')}
    >
      <Medidor nota={saude.nota} largura={96} />
      <div className={estilos.resumoSaudeNota}>
        <span>Saúde financeira</span>
        <strong>{NOMES_CLASSIFICACAO[saude.classificacao]}</strong>
      </div>
      <div className={estilos.resumoSaudeLimite}>
        <span>Limite seguro em {mes}</span>
        <strong className="numero">
          {saude.limiteCredito.parcelaMensalMaxima > 0
            ? `${formatarCentavos(saude.limiteCredito.parcelaMensalMaxima)}/mês`
            : 'Sem novas parcelas'}
        </strong>
      </div>
      {principal && (
        <div className={estilos.resumoSaudeInsight}>
          <span>Principal ponto</span>
          <strong>{principal.titulo}</strong>
        </div>
      )}
      <ChevronRight size={18} className={estilos.resumoSaudeSeta} />
    </button>
  )
}

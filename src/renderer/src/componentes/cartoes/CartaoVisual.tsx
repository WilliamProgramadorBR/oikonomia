import type { CSSProperties } from 'react'
import { Wifi } from 'lucide-react'
import { classes } from '../../utilitarios/classes'
import { nomeInstituicao } from '../../utilitarios/instituicoes'
import estilos from './Cartoes.module.css'

interface PropsCartaoVisual {
  apelido: string
  instituicao: string
  cor: string
  titular?: string
  rotuloValor?: string
  valor?: string
  usoLimite?: number // fração do limite usada (0 a 1+)
  selecionado?: boolean
  aoClicar?: () => void
}

// Representação "física" do cartão de crédito.
export function CartaoVisual({
  apelido,
  instituicao,
  cor,
  titular,
  rotuloValor,
  valor,
  usoLimite,
  selecionado,
  aoClicar
}: PropsCartaoVisual) {
  const Elemento = aoClicar ? 'button' : 'div'

  return (
    <Elemento
      type={aoClicar ? 'button' : undefined}
      className={classes(estilos.cartaoVisual, aoClicar && estilos.clicavel, selecionado && estilos.selecionado)}
      style={{ '--cor': cor } as CSSProperties}
      onClick={aoClicar}
    >
      <div className={estilos.cartaoTopo}>
        <span className={estilos.cartaoBanco}>{nomeInstituicao(instituicao) || 'Banco'}</span>
        <Wifi size={20} className={estilos.aproximacao} />
      </div>

      <span className={estilos.chip} />

      <div className={estilos.cartaoBase}>
        <div>
          <strong className={estilos.cartaoApelido}>{apelido || 'Meu cartão'}</strong>
          {titular && <span className={estilos.cartaoTitular}>{titular}</span>}
        </div>
        {valor && (
          <div className={estilos.cartaoValor}>
            <span>{rotuloValor}</span>
            <strong className="numero">{valor}</strong>
          </div>
        )}
      </div>

      {usoLimite !== undefined && (
        <div className={estilos.cartaoUso}>
          <div
            className={classes(estilos.cartaoUsoBarra, usoLimite > 0.9 && estilos.cartaoUsoAlerta)}
            style={{ width: `${Math.min(Math.max(usoLimite, 0), 1) * 100}%` }}
          />
        </div>
      )}
    </Elemento>
  )
}

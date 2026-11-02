import type { CSSProperties, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { iconeDe } from '../../utilitarios/icones'
import estilos from './Elementos.module.css'

// Pequenos componentes visuais reutilizados em várias telas.

export function Avatar({ nome, cor, tamanho = 32 }: { nome: string; cor: string; tamanho?: number }) {
  const iniciais = nome
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('')

  return (
    <span
      className={estilos.avatar}
      style={{ '--cor': cor, width: tamanho, height: tamanho, fontSize: tamanho * 0.38 } as CSSProperties}
      title={nome}
    >
      {iniciais}
    </span>
  )
}

export function IconeCategoria({
  icone,
  cor,
  tamanho = 38
}: {
  icone: string
  cor: string
  tamanho?: number
}) {
  const Icone = iconeDe(icone)
  return (
    <span
      className={estilos.iconeCategoria}
      style={{ '--cor': cor, width: tamanho, height: tamanho } as CSSProperties}
    >
      <Icone size={tamanho * 0.47} strokeWidth={2.2} />
    </span>
  )
}

interface PropsEstadoVazio {
  icone: LucideIcon
  titulo: string
  descricao?: string
  acao?: ReactNode
}

export function EstadoVazio({ icone: Icone, titulo, descricao, acao }: PropsEstadoVazio) {
  return (
    <div className={estilos.vazio}>
      <span className={estilos.vazioIcone}>
        <Icone size={26} strokeWidth={1.8} />
      </span>
      <h3 className={estilos.vazioTitulo}>{titulo}</h3>
      {descricao && <p className={estilos.vazioDescricao}>{descricao}</p>}
      {acao && <div className={estilos.vazioAcao}>{acao}</div>}
    </div>
  )
}

export function Esqueleto({ altura = 16, largura = '100%' }: { altura?: number; largura?: number | string }) {
  return <span className={estilos.esqueleto} style={{ height: altura, width: largura }} />
}

export function Etiqueta({ children, cor }: { children: ReactNode; cor?: string }) {
  return (
    <span className={estilos.etiqueta} style={cor ? ({ '--cor': cor } as CSSProperties) : undefined}>
      {children}
    </span>
  )
}

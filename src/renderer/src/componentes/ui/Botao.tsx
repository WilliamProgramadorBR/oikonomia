import type { ButtonHTMLAttributes } from 'react'
import { LoaderCircle, type LucideIcon } from 'lucide-react'
import { classes } from '../../utilitarios/classes'
import estilos from './Botao.module.css'

interface PropsBotao extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'fantasma' | 'perigo'
  tamanho?: 'p' | 'm'
  icone?: LucideIcon
  carregando?: boolean
}

export function Botao({
  variante = 'primario',
  tamanho = 'm',
  icone: Icone,
  carregando = false,
  className,
  children,
  disabled,
  type = 'button',
  ...resto
}: PropsBotao) {
  const tamanhoIcone = tamanho === 'p' ? 15 : 17

  return (
    <button
      type={type}
      className={classes(
        estilos.botao,
        estilos[variante],
        estilos[tamanho],
        !children && estilos.soIcone,
        className
      )}
      disabled={disabled || carregando}
      {...resto}
    >
      {carregando ? (
        <LoaderCircle size={tamanhoIcone} className={estilos.girando} />
      ) : (
        Icone && <Icone size={tamanhoIcone} strokeWidth={2.2} />
      )}
      {children}
    </button>
  )
}

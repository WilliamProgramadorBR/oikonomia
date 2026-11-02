import { useRef, useState, type CSSProperties, type InputHTMLAttributes, type KeyboardEvent } from 'react'
import { ArrowBigUpDash, Check, Eye, EyeOff, Lock } from 'lucide-react'
import type { AvaliacaoSenha } from '@compartilhado/seguranca/senha'
import { classes } from '../../utilitarios/classes'
import estilosCampo from '../ui/Campo.module.css'
import estilos from './CamposAcesso.module.css'

interface PropsCampoSenha extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  rotulo: string
}

// Senha com botão de mostrar/ocultar e aviso de Caps Lock ligado.
export function CampoSenha({ rotulo, className, ...resto }: PropsCampoSenha) {
  const [visivel, setVisivel] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const verificarCaps = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState('CapsLock'))

  return (
    <label className={estilosCampo.campo}>
      <span className={estilosCampo.rotulo}>{rotulo}</span>
      <span className={classes(estilosCampo.caixa, className)}>
        <Lock size={16} className={estilosCampo.icone} />
        <input
          {...resto}
          type={visivel ? 'text' : 'password'}
          className={estilosCampo.entrada}
          spellCheck={false}
          autoCapitalize="off"
          onKeyUp={verificarCaps}
          onKeyDown={verificarCaps}
          onBlur={() => setCapsLock(false)}
        />
        <button
          type="button"
          className={estilos.olho}
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          tabIndex={-1}
        >
          {visivel ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
      {capsLock && (
        <span className={estilos.capsLock}>
          <ArrowBigUpDash size={13} /> Caps Lock está ligado
        </span>
      )}
    </label>
  )
}

const CORES_FORCA = ['var(--despesa)', 'var(--despesa)', 'var(--alerta)', 'var(--receita)', 'var(--receita)']

export function MedidorSenha({ avaliacao, vazia }: { avaliacao: AvaliacaoSenha; vazia: boolean }) {
  if (vazia) return null
  const cor = CORES_FORCA[avaliacao.forca]
  const itens = avaliacao.valida ? avaliacao.dicas.slice(0, 2) : avaliacao.problemas

  return (
    <div className={estilos.medidor} style={{ '--cor-forca': cor } as CSSProperties}>
      <div className={estilos.barras}>
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={classes(estilos.barra, (avaliacao.forca >= n || (!avaliacao.valida && n === 1)) && estilos.barraAtiva)} />
        ))}
        <strong>{avaliacao.rotulo}</strong>
      </div>
      {itens.length > 0 && (
        <ul className={classes(estilos.itensSenha, avaliacao.valida && estilos.dicas)}>
          {itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {avaliacao.valida && avaliacao.forca >= 3 && (
        <span className={estilos.senhaBoa}>
          <Check size={13} /> Boa escolha
        </span>
      )}
    </div>
  )
}

// Código de 6 dígitos em caixas separadas; aceita colar o código inteiro.
export function CampoCodigo({ valor, aoAlterar, digitos = 6 }: { valor: string; aoAlterar: (v: string) => void; digitos?: number }) {
  const caixas = useRef<(HTMLInputElement | null)[]>([])
  const focar = (i: number) => caixas.current[Math.max(0, Math.min(digitos - 1, i))]?.focus()

  function definir(posicao: number, texto: string) {
    const numeros = texto.replace(/\D/g, '')
    if (!numeros) return
    const lista = valor.padEnd(digitos, ' ').split('')
    numeros.split('').forEach((n, k) => {
      if (posicao + k < digitos) lista[posicao + k] = n
    })
    aoAlterar(lista.join('').replace(/\s+$/, ''))
    focar(posicao + numeros.length)
  }

  function apagar(posicao: number) {
    const lista = valor.padEnd(digitos, ' ').split('')
    const alvo = lista[posicao]?.trim() ? posicao : posicao - 1
    if (alvo < 0) return
    lista[alvo] = ' '
    aoAlterar(lista.join('').replace(/\s+$/, ''))
    focar(alvo)
  }

  return (
    <div className={estilos.codigo}>
      {Array.from({ length: digitos }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            caixas.current[i] = el
          }}
          className={estilos.digito}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={digitos}
          aria-label={`Dígito ${i + 1}`}
          value={valor[i]?.trim() ?? ''}
          onChange={(e) => definir(i, e.target.value.slice(-digitos))}
          onPaste={(e) => {
            e.preventDefault()
            definir(0, e.clipboardData.getData('text'))
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault()
              apagar(i)
            } else if (e.key === 'ArrowLeft') focar(i - 1)
            else if (e.key === 'ArrowRight') focar(i + 1)
          }}
        />
      ))}
    </div>
  )
}

export function Marcador({ marcado, aoAlterar, children }: { marcado: boolean; aoAlterar: (v: boolean) => void; children: string }) {
  return (
    <label className={estilos.marcador}>
      <input type="checkbox" checked={marcado} onChange={(e) => aoAlterar(e.target.checked)} />
      <span className={estilos.caixaMarcador}>
        <Check size={12} strokeWidth={3} />
      </span>
      {children}
    </label>
  )
}

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Tema = 'claro' | 'escuro'

const CHAVE = 'tema'

function temaInicial(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'claro' || salvo === 'escuro') return salvo
  } catch {
    // armazenamento indisponível: segue a preferência do sistema
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

const TemaContexto = createContext<{ tema: Tema; alternarTema: () => void } | null>(null)

export function ProvedorTema({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(temaInicial)

  useEffect(() => {
    document.documentElement.dataset.tema = tema
    try {
      localStorage.setItem(CHAVE, tema)
    } catch {
      // sem persistência, sem problema
    }
  }, [tema])

  const alternarTema = () => setTema((atual) => (atual === 'claro' ? 'escuro' : 'claro'))

  return <TemaContexto.Provider value={{ tema, alternarTema }}>{children}</TemaContexto.Provider>
}

export function useTema() {
  const contexto = useContext(TemaContexto)
  if (!contexto) throw new Error('useTema precisa estar dentro de <ProvedorTema>')
  return contexto
}

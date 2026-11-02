import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

// Contador de versão dos dados: toda alteração incrementa e as consultas abertas recarregam.
const DadosContexto = createContext<{ versao: number; notificarAlteracao: () => void } | null>(
  null
)

export function ProvedorDados({ children }: { children: ReactNode }) {
  const [versao, setVersao] = useState(0)
  const notificarAlteracao = useCallback(() => setVersao((v) => v + 1), [])

  return (
    <DadosContexto.Provider value={{ versao, notificarAlteracao }}>
      {children}
    </DadosContexto.Provider>
  )
}

export function useDados() {
  const contexto = useContext(DadosContexto)
  if (!contexto) throw new Error('useDados precisa estar dentro de <ProvedorDados>')
  return contexto
}

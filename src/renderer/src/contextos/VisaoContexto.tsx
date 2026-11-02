import { createContext, useContext, useState, type ReactNode } from 'react'
import { mesAtual } from '@compartilhado/utilitarios/mes'

// Filtro global da tela: de quem estamos vendo os dados (família ou uma pessoa) e qual mês.
interface Visao {
  pessoaId: string | null // null = família inteira
  mes: string // AAAA-MM
  setPessoaId: (id: string | null) => void
  setMes: (mes: string) => void
}

const VisaoContexto = createContext<Visao | null>(null)

export function ProvedorVisao({ children }: { children: ReactNode }) {
  const [pessoaId, setPessoaId] = useState<string | null>(null)
  const [mes, setMes] = useState(mesAtual)

  return (
    <VisaoContexto.Provider value={{ pessoaId, mes, setPessoaId, setMes }}>
      {children}
    </VisaoContexto.Provider>
  )
}

export function useVisao() {
  const contexto = useContext(VisaoContexto)
  if (!contexto) throw new Error('useVisao precisa estar dentro de <ProvedorVisao>')
  return contexto
}

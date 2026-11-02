import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { EstadoAutenticacaoDTO, UsuarioDTO } from '@compartilhado/dtos/autenticacao'
import { EVENTO_SESSAO_ENCERRADA } from '../servicos/api'
import { autenticacaoServico } from '../servicos/autenticacaoServico'

interface ValorAutenticacao {
  estado: EstadoAutenticacaoDTO | null // null enquanto carrega
  usuario: UsuarioDTO | null
  recarregar: () => Promise<void>
  sair: () => Promise<void>
}

const AutenticacaoContexto = createContext<ValorAutenticacao | null>(null)

// A sessão de verdade vive no processo principal; aqui só refletimos quem está conectado.
export function ProvedorAutenticacao({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoAutenticacaoDTO | null>(null)

  const recarregar = useCallback(async () => {
    setEstado(await autenticacaoServico.estado())
  }, [])

  const sair = useCallback(async () => {
    await autenticacaoServico.sair().catch(() => undefined)
    await recarregar()
  }, [recarregar])

  useEffect(() => {
    void recarregar()
    const aoEncerrar = () => void recarregar()
    window.addEventListener(EVENTO_SESSAO_ENCERRADA, aoEncerrar)
    return () => window.removeEventListener(EVENTO_SESSAO_ENCERRADA, aoEncerrar)
  }, [recarregar])

  return (
    <AutenticacaoContexto.Provider value={{ estado, usuario: estado?.usuario ?? null, recarregar, sair }}>
      {children}
    </AutenticacaoContexto.Provider>
  )
}

export function useAutenticacao() {
  const contexto = useContext(AutenticacaoContexto)
  if (!contexto) throw new Error('useAutenticacao precisa estar dentro de <ProvedorAutenticacao>')
  return contexto
}

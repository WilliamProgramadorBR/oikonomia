import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import estilos from '../componentes/ui/Notificacoes.module.css'

type TipoNotificacao = 'sucesso' | 'erro'

interface Notificacao {
  id: number
  tipo: TipoNotificacao
  mensagem: string
}

const DURACAO_MS = 3500

const NotificacaoContexto = createContext<
  ((tipo: TipoNotificacao, mensagem: string) => void) | null
>(null)

export function ProvedorNotificacoes({ children }: { children: ReactNode }) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])

  const notificar = useCallback((tipo: TipoNotificacao, mensagem: string) => {
    const id = Date.now() + Math.random()
    setNotificacoes((atuais) => [...atuais, { id, tipo, mensagem }])
    setTimeout(() => setNotificacoes((atuais) => atuais.filter((n) => n.id !== id)), DURACAO_MS)
  }, [])

  return (
    <NotificacaoContexto.Provider value={notificar}>
      {children}
      <div className={estilos.pilha} role="status" aria-live="polite">
        {notificacoes.map((n) => (
          <div key={n.id} className={`${estilos.notificacao} ${estilos[n.tipo]}`}>
            {n.tipo === 'sucesso' ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
            <span>{n.mensagem}</span>
          </div>
        ))}
      </div>
    </NotificacaoContexto.Provider>
  )
}

export function useNotificar() {
  const contexto = useContext(NotificacaoContexto)
  if (!contexto) throw new Error('useNotificar precisa estar dentro de <ProvedorNotificacoes>')
  return contexto
}

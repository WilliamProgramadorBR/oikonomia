import { useCallback } from 'react'
import { useDados } from '../contextos/DadosContexto'
import { useNotificar } from '../contextos/NotificacaoContexto'

// Executa uma alteração (criar, remover...), avisa o usuário e atualiza as telas.
// Retorna true se deu certo.
export function useAcao() {
  const { notificarAlteracao } = useDados()
  const notificar = useNotificar()

  return useCallback(
    async (acao: () => Promise<unknown>, mensagemSucesso?: string): Promise<boolean> => {
      try {
        await acao()
        notificarAlteracao()
        if (mensagemSucesso) notificar('sucesso', mensagemSucesso)
        return true
      } catch (erro) {
        notificar('erro', (erro as Error).message)
        return false
      }
    },
    [notificar, notificarAlteracao]
  )
}

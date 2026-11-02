import { useEffect, useState } from 'react'
import type { EstadoAtualizacaoDTO } from '@compartilhado/dtos/atualizacao'
import { atualizacaoServico } from '../servicos/atualizacaoServico'

// Estado da atualização automática, empurrado pelo processo principal em tempo real.
export function useAtualizacao(): EstadoAtualizacaoDTO | null {
  const [estado, setEstado] = useState<EstadoAtualizacaoDTO | null>(null)

  useEffect(() => {
    atualizacaoServico.obter().then(setEstado).catch(() => undefined)
    return atualizacaoServico.aoMudar(setEstado)
  }, [])

  return estado
}

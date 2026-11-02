import { useEffect, useState } from 'react'
import { useDados } from '../contextos/DadosContexto'

interface EstadoConsulta<T> {
  dados: T | null
  carregando: boolean
  erro: string | null
}

// Busca dados e recarrega quando as dependências mudam ou quando algo é alterado no app.
export function useConsulta<T>(buscar: () => Promise<T>, dependencias: unknown[]) {
  const { versao } = useDados()
  const [estado, setEstado] = useState<EstadoConsulta<T>>({
    dados: null,
    carregando: true,
    erro: null
  })

  useEffect(() => {
    let ativo = true
    setEstado((atual) => ({ ...atual, carregando: true }))

    buscar()
      .then((dados) => ativo && setEstado({ dados, carregando: false, erro: null }))
      .catch(
        (erro: Error) =>
          ativo && setEstado((atual) => ({ ...atual, carregando: false, erro: erro.message }))
      )

    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versao, ...dependencias])

  return estado
}

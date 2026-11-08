import type {
  AlterarFraseSincronizacaoEntrada,
  AtivarSincronizacaoEntrada,
  DesativarSincronizacaoEntrada,
  DesbloquearSincronizacaoEntrada,
  EstadoSincronizacaoDTO
} from '@compartilhado/dtos/sincronizacao'
import { api, desembrulhar } from './api'

export const sincronizacaoServico = {
  estado(): Promise<EstadoSincronizacaoDTO> {
    return desembrulhar(api.sincronizacao.estado())
  },
  ativar(entrada: AtivarSincronizacaoEntrada): Promise<EstadoSincronizacaoDTO> {
    return desembrulhar(api.sincronizacao.ativar(entrada))
  },
  desbloquear(entrada: DesbloquearSincronizacaoEntrada): Promise<EstadoSincronizacaoDTO> {
    return desembrulhar(api.sincronizacao.desbloquear(entrada))
  },
  bloquear(): Promise<EstadoSincronizacaoDTO> {
    return desembrulhar(api.sincronizacao.bloquear())
  },
  alterarFrase(entrada: AlterarFraseSincronizacaoEntrada): Promise<EstadoSincronizacaoDTO> {
    return desembrulhar(api.sincronizacao.alterarFrase(entrada))
  },
  desativar(entrada: DesativarSincronizacaoEntrada): Promise<EstadoSincronizacaoDTO> {
    return desembrulhar(api.sincronizacao.desativar(entrada))
  }
}

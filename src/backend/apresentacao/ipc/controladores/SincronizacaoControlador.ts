import type {
  AlterarFraseSincronizacaoEntrada,
  AtivarSincronizacaoEntrada,
  DesativarSincronizacaoEntrada,
  DesbloquearSincronizacaoEntrada,
  EstadoSincronizacaoDTO
} from '../../../../compartilhado/dtos/sincronizacao'
import type { GerenciarSincronizacao } from '../../../aplicacao/casos-de-uso/sincronizacao/GerenciarSincronizacao'

export class SincronizacaoControlador {
  constructor(private readonly gerenciador: GerenciarSincronizacao) {}

  estado(): Promise<EstadoSincronizacaoDTO> {
    return this.gerenciador.estado()
  }

  ativar(entrada: AtivarSincronizacaoEntrada): Promise<EstadoSincronizacaoDTO> {
    return this.gerenciador.ativar(entrada)
  }

  desbloquear(entrada: DesbloquearSincronizacaoEntrada): Promise<EstadoSincronizacaoDTO> {
    return this.gerenciador.desbloquear(entrada)
  }

  bloquear(): Promise<EstadoSincronizacaoDTO> {
    return this.gerenciador.bloquear()
  }

  alterarFrase(entrada: AlterarFraseSincronizacaoEntrada): Promise<EstadoSincronizacaoDTO> {
    return this.gerenciador.alterarFrase(entrada)
  }

  desativar(entrada: DesativarSincronizacaoEntrada): Promise<EstadoSincronizacaoDTO> {
    return this.gerenciador.desativar(entrada)
  }
}

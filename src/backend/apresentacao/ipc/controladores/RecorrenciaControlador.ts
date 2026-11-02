import type {
  CriarRecorrenciaEntrada,
  EncerrarRecorrenciaEntrada,
  RecorrenciaDTO
} from '@compartilhado/dtos/recorrencia'
import type { CriarRecorrencia } from '../../../aplicacao/casos-de-uso/recorrencia/CriarRecorrencia'
import type { EncerrarRecorrencia } from '../../../aplicacao/casos-de-uso/recorrencia/EncerrarRecorrencia'
import type { ListarRecorrencias } from '../../../aplicacao/casos-de-uso/recorrencia/ListarRecorrencias'
import type { SincronizarRecorrencias } from '../../../aplicacao/casos-de-uso/recorrencia/SincronizarRecorrencias'

export class RecorrenciaControlador {
  constructor(
    private readonly listarRecorrencias: ListarRecorrencias,
    private readonly criarRecorrencia: CriarRecorrencia,
    private readonly encerrarRecorrencia: EncerrarRecorrencia,
    private readonly sincronizarRecorrencias: SincronizarRecorrencias
  ) {}

  listar(): Promise<RecorrenciaDTO[]> {
    return this.listarRecorrencias.executar()
  }

  criar(entrada: CriarRecorrenciaEntrada): Promise<RecorrenciaDTO> {
    return this.criarRecorrencia.executar(entrada)
  }

  encerrar(entrada: EncerrarRecorrenciaEntrada): Promise<void> {
    return this.encerrarRecorrencia.executar(entrada)
  }

  // Ao abrir o app: completa as previsões até o fim do horizonte (o mês virou, por exemplo).
  sincronizar(): Promise<void> {
    return this.sincronizarRecorrencias.executar()
  }
}

import type {
  AportarObjetivoEntrada,
  AtualizarObjetivoEntrada,
  CriarObjetivoEntrada,
  ObjetivosDTO,
  ProgramarAporteEntrada
} from '@compartilhado/dtos/objetivo'
import type { PerfilDTO, SalvarPerfilEntrada } from '@compartilhado/dtos/perfil'
import { api, desembrulhar } from './api'

export const objetivoServico = {
  listar(): Promise<ObjetivosDTO> {
    return desembrulhar(api.objetivos.listar())
  },
  criar(entrada: CriarObjetivoEntrada): Promise<void> {
    return desembrulhar(api.objetivos.criar(entrada))
  },
  atualizar(entrada: AtualizarObjetivoEntrada): Promise<void> {
    return desembrulhar(api.objetivos.atualizar(entrada))
  },
  remover(id: string): Promise<void> {
    return desembrulhar(api.objetivos.remover(id))
  },
  aportar(entrada: AportarObjetivoEntrada): Promise<void> {
    return desembrulhar(api.objetivos.aportar(entrada))
  },
  programarAporte(entrada: ProgramarAporteEntrada): Promise<void> {
    return desembrulhar(api.objetivos.programarAporte(entrada))
  }
}

export const perfilServico = {
  obter(): Promise<PerfilDTO> {
    return desembrulhar(api.perfil.obter())
  },
  salvar(entrada: SalvarPerfilEntrada): Promise<PerfilDTO> {
    return desembrulhar(api.perfil.salvar(entrada))
  }
}

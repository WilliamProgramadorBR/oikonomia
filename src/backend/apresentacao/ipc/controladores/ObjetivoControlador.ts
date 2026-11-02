import type {
  AportarObjetivoEntrada,
  AtualizarObjetivoEntrada,
  CriarObjetivoEntrada,
  ObjetivosDTO,
  ProgramarAporteEntrada
} from '@compartilhado/dtos/objetivo'
import type { PerfilDTO, SalvarPerfilEntrada } from '@compartilhado/dtos/perfil'
import type { ListarObjetivos } from '../../../aplicacao/casos-de-uso/objetivo/ListarObjetivos'
import type {
  AportarObjetivo,
  AtualizarObjetivo,
  CriarObjetivo,
  ProgramarAporte,
  RemoverObjetivo
} from '../../../aplicacao/casos-de-uso/objetivo/ManterObjetivos'
import type { ObterPerfil, SalvarPerfil } from '../../../aplicacao/casos-de-uso/perfil/Perfil'

export class ObjetivoControlador {
  constructor(
    private readonly listarObjetivos: ListarObjetivos,
    private readonly criarObjetivo: CriarObjetivo,
    private readonly atualizarObjetivo: AtualizarObjetivo,
    private readonly removerObjetivo: RemoverObjetivo,
    private readonly aportarObjetivo: AportarObjetivo,
    private readonly programarAporteObjetivo: ProgramarAporte
  ) {}

  listar(): Promise<ObjetivosDTO> {
    return this.listarObjetivos.executar()
  }

  criar(entrada: CriarObjetivoEntrada): Promise<void> {
    return this.criarObjetivo.executar(entrada)
  }

  atualizar(entrada: AtualizarObjetivoEntrada): Promise<void> {
    return this.atualizarObjetivo.executar(entrada)
  }

  remover(id: string): Promise<void> {
    return this.removerObjetivo.executar(id)
  }

  aportar(entrada: AportarObjetivoEntrada): Promise<void> {
    return this.aportarObjetivo.executar(entrada)
  }

  programarAporte(entrada: ProgramarAporteEntrada): Promise<void> {
    return this.programarAporteObjetivo.executar(entrada)
  }
}

export class PerfilControlador {
  constructor(
    private readonly obterPerfil: ObterPerfil,
    private readonly salvarPerfil: SalvarPerfil
  ) {}

  obter(): Promise<PerfilDTO> {
    return this.obterPerfil.executar()
  }

  salvar(entrada: SalvarPerfilEntrada): Promise<PerfilDTO> {
    return this.salvarPerfil.executar(entrada)
  }
}

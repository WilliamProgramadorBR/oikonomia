import type { Objetivo } from '../entidades/Objetivo'

export interface IObjetivoRepositorio {
  salvar(objetivo: Objetivo): Promise<void>
  listar(): Promise<Objetivo[]>
  buscarPorId(id: string): Promise<Objetivo | null>
  // Remove o objetivo; aportes e recorrências vinculados continuam, só perdem o vínculo.
  remover(id: string): Promise<void>
}

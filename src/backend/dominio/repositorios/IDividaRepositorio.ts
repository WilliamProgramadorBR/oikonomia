import type { Divida } from '../entidades/Divida'

export interface IDividaRepositorio {
  salvar(divida: Divida): Promise<void>
  listar(): Promise<Divida[]>
  buscarPorId(id: string): Promise<Divida | null>
  remover(id: string): Promise<void> // a recorrência da parcela perde o vínculo
}

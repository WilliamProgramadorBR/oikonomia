import type { AnaliseDTO, FiltroAnalise } from '@compartilhado/dtos/analise'
import type { ObterAnalise } from '../../../aplicacao/casos-de-uso/analise/ObterAnalise'

export class AnaliseControlador {
  constructor(private readonly obterAnalise: ObterAnalise) {}

  obter(filtro: FiltroAnalise): Promise<AnaliseDTO> {
    return this.obterAnalise.executar(filtro)
  }
}

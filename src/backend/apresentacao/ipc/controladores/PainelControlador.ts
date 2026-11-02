import type { FiltroPainel, PainelDTO } from '@compartilhado/dtos/painel'
import type { ObterPainel } from '../../../aplicacao/casos-de-uso/painel/ObterPainel'

export class PainelControlador {
  constructor(private readonly obterPainel: ObterPainel) {}

  obter(filtro: FiltroPainel): Promise<PainelDTO> {
    return this.obterPainel.executar(filtro)
  }
}

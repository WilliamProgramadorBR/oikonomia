import type { FiltroPrevisao, PrevisaoDTO } from '@compartilhado/dtos/previsao'
import type { ObterPrevisao } from '../../../aplicacao/casos-de-uso/previsao/ObterPrevisao'

export class PrevisaoControlador {
  constructor(private readonly obterPrevisao: ObterPrevisao) {}

  obter(filtro: FiltroPrevisao): Promise<PrevisaoDTO> {
    return this.obterPrevisao.executar(filtro)
  }
}

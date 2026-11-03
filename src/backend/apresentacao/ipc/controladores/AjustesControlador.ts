import type {
  AjustarPrevistaEntrada,
  AplicarFeriasEntrada,
  FeriasEntrada,
  PlanoFeriasDTO,
  ResultadoAjusteDTO
} from '@compartilhado/dtos/ajustes'
import type { TransacaoDTO } from '@compartilhado/dtos/transacao'
import type {
  AjustarPrevista,
  AplicarFerias,
  SimularFerias
} from '../../../aplicacao/casos-de-uso/recorrencia/AjustesDeRenda'

export class AjustesControlador {
  constructor(
    private readonly ajustarPrevistaUC: AjustarPrevista,
    private readonly simularFeriasUC: SimularFerias,
    private readonly aplicarFeriasUC: AplicarFerias
  ) {}

  ajustarPrevista(entrada: AjustarPrevistaEntrada): Promise<TransacaoDTO> {
    return this.ajustarPrevistaUC.executar(entrada)
  }

  simularFerias(entrada: FeriasEntrada): Promise<PlanoFeriasDTO> {
    return this.simularFeriasUC.executar(entrada)
  }

  aplicarFerias(entrada: AplicarFeriasEntrada): Promise<ResultadoAjusteDTO> {
    return this.aplicarFeriasUC.executar(entrada)
  }
}

import type {
  CriarDividaEntrada,
  PlanoDividasDTO,
  SimulacaoCreditoDTO,
  SimularCreditoEntrada
} from '@compartilhado/dtos/divida'
import { api, desembrulhar } from './api'

export const dividaServico = {
  plano(extraMensal: number | null): Promise<PlanoDividasDTO> {
    return desembrulhar(api.dividas.plano(extraMensal))
  },
  criar(entrada: CriarDividaEntrada): Promise<void> {
    return desembrulhar(api.dividas.criar(entrada))
  },
  remover(id: string): Promise<void> {
    return desembrulhar(api.dividas.remover(id))
  },
  simularCredito(entrada: SimularCreditoEntrada): Promise<SimulacaoCreditoDTO> {
    return desembrulhar(api.dividas.simularCredito(entrada))
  }
}

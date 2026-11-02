import type {
  CriarDividaEntrada,
  PlanoDividasDTO,
  SimulacaoCreditoDTO,
  SimularCreditoEntrada
} from '@compartilhado/dtos/divida'
import type {
  CriarDivida,
  ObterPlanoDividas,
  RemoverDivida,
  SimularCredito
} from '../../../aplicacao/casos-de-uso/divida/Dividas'

export class DividaControlador {
  constructor(
    private readonly obterPlano: ObterPlanoDividas,
    private readonly criarDivida: CriarDivida,
    private readonly removerDivida: RemoverDivida,
    private readonly simularCreditoUC: SimularCredito
  ) {}

  plano(extraMensal: number | null): Promise<PlanoDividasDTO> {
    return this.obterPlano.executar(extraMensal)
  }

  criar(entrada: CriarDividaEntrada): Promise<void> {
    return this.criarDivida.executar(entrada)
  }

  remover(id: string): Promise<void> {
    return this.removerDivida.executar(id)
  }

  simularCredito(entrada: SimularCreditoEntrada): Promise<SimulacaoCreditoDTO> {
    return this.simularCreditoUC.executar(entrada)
  }
}

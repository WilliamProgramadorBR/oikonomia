import type { ListaTaxasDTO, ModalidadeCredito, SituacaoTaxasDTO } from '@compartilhado/dtos/taxa'
import type { AtualizarTaxasMercado } from '../../../aplicacao/casos-de-uso/taxa/AtualizarTaxasMercado'
import type { ListarTaxasMercado } from '../../../aplicacao/casos-de-uso/taxa/ListarTaxasMercado'

export class TaxaControlador {
  constructor(
    private readonly listarTaxas: ListarTaxasMercado,
    private readonly atualizarTaxas: AtualizarTaxasMercado
  ) {}

  listar(modalidade?: ModalidadeCredito): Promise<ListaTaxasDTO> {
    return this.listarTaxas.executar(modalidade)
  }

  // Pedido explícito do usuário: sempre baixa de novo.
  atualizar(): Promise<SituacaoTaxasDTO> {
    return this.atualizarTaxas.executar({ forcar: true })
  }

  // Ao abrir o app: só baixa se os dados estiverem velhos.
  atualizarSeNecessario(): Promise<SituacaoTaxasDTO> {
    return this.atualizarTaxas.executar()
  }
}

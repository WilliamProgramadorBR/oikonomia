import type { ListaTaxasDTO, ModalidadeCredito } from '@compartilhado/dtos/taxa'
import type { ITaxaMercadoRepositorio } from '../../../dominio/repositorios/ITaxaMercadoRepositorio'
import { situacaoParaDTO } from './AtualizarTaxasMercado'

export class ListarTaxasMercado {
  constructor(private readonly repositorio: ITaxaMercadoRepositorio) {}

  async executar(modalidade?: ModalidadeCredito): Promise<ListaTaxasDTO> {
    const [taxas, situacao] = await Promise.all([
      this.repositorio.listar(modalidade),
      this.repositorio.situacao()
    ])
    return { situacao: situacaoParaDTO(situacao), taxas }
  }
}

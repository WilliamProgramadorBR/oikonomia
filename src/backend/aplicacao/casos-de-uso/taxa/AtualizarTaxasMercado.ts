import type { SituacaoTaxasDTO } from '@compartilhado/dtos/taxa'
import type { IProvedorTaxasMercado } from '../../../dominio/portas/IProvedorTaxasMercado'
import type {
  ITaxaMercadoRepositorio,
  SituacaoTaxas
} from '../../../dominio/repositorios/ITaxaMercadoRepositorio'

// O Banco Central publica semanalmente; checar uma vez por dia é suficiente.
const VALIDADE_MS = 24 * 60 * 60 * 1000

export function situacaoParaDTO(situacao: SituacaoTaxas): SituacaoTaxasDTO {
  return { ...situacao, atualizadoEm: situacao.atualizadoEm?.toISOString() ?? null }
}

export class AtualizarTaxasMercado {
  constructor(
    private readonly provedor: IProvedorTaxasMercado,
    private readonly repositorio: ITaxaMercadoRepositorio
  ) {}

  // Sem `forcar`, só baixa de novo se os dados guardados tiverem mais de um dia.
  async executar({ forcar = false } = {}): Promise<SituacaoTaxasDTO> {
    const atual = await this.repositorio.situacao()
    const recente =
      atual.atualizadoEm && Date.now() - atual.atualizadoEm.getTime() < VALIDADE_MS
    if (!forcar && recente) return situacaoParaDTO(atual)

    const lote = await this.provedor.buscarMaisRecentes()
    await this.repositorio.substituir(lote)
    return situacaoParaDTO(await this.repositorio.situacao())
  }
}

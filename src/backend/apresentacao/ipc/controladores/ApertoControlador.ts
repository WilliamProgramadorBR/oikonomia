import type { OfertaApertoEntrada, PlanoApertoDTO } from '@compartilhado/dtos/aperto'
import type { GerenciarPlanoAperto, ObterPlanoAperto, SalvarOfertaAperto } from '../../../aplicacao/casos-de-uso/aperto/PlanoAperto'

export class ApertoControlador {
  constructor(
    private readonly obterPlano: ObterPlanoAperto,
    private readonly salvarOferta: SalvarOfertaAperto,
    private readonly gerenciar: GerenciarPlanoAperto
  ) {}

  obter(pessoaId: string | null): Promise<PlanoApertoDTO> {
    return this.obterPlano.executar(pessoaId)
  }
  salvar(entrada: OfertaApertoEntrada): Promise<void> {
    return this.salvarOferta.executar(entrada)
  }
  remover(id: string): Promise<void> {
    return this.gerenciar.removerOferta(id)
  }
  marcarPasso(entrada: { chave: string; feito: boolean }): Promise<void> {
    return this.gerenciar.marcarPasso(entrada.chave, entrada.feito)
  }
  definirCaixaExtra(centavos: number): Promise<void> {
    return this.gerenciar.definirCaixaExtra(centavos)
  }
}

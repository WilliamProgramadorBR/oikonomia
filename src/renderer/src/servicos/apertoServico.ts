import type { OfertaApertoEntrada, PlanoApertoDTO } from '@compartilhado/dtos/aperto'
import { api, desembrulhar } from './api'

export const apertoServico = {
  obter: (pessoaId: string | null): Promise<PlanoApertoDTO> => desembrulhar(api.aperto.obter(pessoaId)),
  salvarOferta: (entrada: OfertaApertoEntrada): Promise<void> => desembrulhar(api.aperto.salvarOferta(entrada)),
  removerOferta: (id: string): Promise<void> => desembrulhar(api.aperto.removerOferta(id)),
  marcarPasso: (chave: string, feito: boolean): Promise<void> => desembrulhar(api.aperto.marcarPasso({ chave, feito })),
  definirCaixaExtra: (centavos: number): Promise<void> => desembrulhar(api.aperto.definirCaixaExtra(centavos))
}

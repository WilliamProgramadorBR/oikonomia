import type { OfertaAperto } from '@compartilhado/dtos/aperto'

export interface IApertoRepositorio {
  listar(): Promise<OfertaAperto[]>
  salvar(oferta: OfertaAperto): Promise<void>
  remover(id: string): Promise<void>
  passosFeitos(): Set<string>
  marcarPasso(chave: string, feito: boolean): void
  caixaExtra(): number
  definirCaixaExtra(centavos: number): void
}

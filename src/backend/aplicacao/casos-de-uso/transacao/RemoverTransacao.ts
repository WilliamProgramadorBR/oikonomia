import { ErroDominio, ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'

export class RemoverTransacao {
  constructor(private readonly repositorio: ITransacaoRepositorio) {}

  async executar(id: string): Promise<void> {
    const existente = await this.repositorio.buscarPorId(id)
    if (!existente) throw new ErroNaoEncontrado('Transação', id)
    if (existente.parcela) {
      throw new ErroDominio('Esta é uma parcela de cartão. Remova a compra inteira na tela Cartões.')
    }

    // Ocorrência de conta recorrente: marca como ignorada para a sincronização não recriá-la.
    if (existente.recorrencia) {
      existente.ignorar()
      await this.repositorio.salvar(existente)
      return
    }

    await this.repositorio.remover(id)
  }
}

import { ErroDominio, ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { ICategoriaRepositorio } from '../../../dominio/repositorios/ICategoriaRepositorio'
import type { IRecorrenciaRepositorio } from '../../../dominio/repositorios/IRecorrenciaRepositorio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'

export class RemoverCategoria {
  constructor(
    private readonly categoriaRepositorio: ICategoriaRepositorio,
    private readonly transacaoRepositorio: ITransacaoRepositorio,
    private readonly recorrenciaRepositorio: IRecorrenciaRepositorio
  ) {}

  async executar(id: string): Promise<void> {
    const categoria = await this.categoriaRepositorio.buscarPorId(id)
    if (!categoria) throw new ErroNaoEncontrado('Categoria', id)

    const emUso =
      (await this.transacaoRepositorio.existeComCategoria(id)) ||
      (await this.recorrenciaRepositorio.existeComCategoria(id))
    if (emUso) {
      throw new ErroDominio(`A categoria "${categoria.nome}" está em uso e não pode ser removida.`)
    }

    await this.categoriaRepositorio.remover(id)
  }
}

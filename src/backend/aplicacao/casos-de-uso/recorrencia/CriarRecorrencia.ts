import type { CriarRecorrenciaEntrada, RecorrenciaDTO } from '@compartilhado/dtos/recorrencia'
import { Recorrencia } from '../../../dominio/entidades/Recorrencia'
import { ErroDominio, ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { ICartaoRepositorio } from '../../../dominio/repositorios/ICartaoRepositorio'
import type { ICategoriaRepositorio } from '../../../dominio/repositorios/ICategoriaRepositorio'
import type { IPessoaRepositorio } from '../../../dominio/repositorios/IPessoaRepositorio'
import type { IRecorrenciaRepositorio } from '../../../dominio/repositorios/IRecorrenciaRepositorio'
import type { ListarRecorrencias } from './ListarRecorrencias'
import type { SincronizarRecorrencias } from './SincronizarRecorrencias'

export class CriarRecorrencia {
  constructor(
    private readonly recorrenciaRepositorio: IRecorrenciaRepositorio,
    private readonly pessoaRepositorio: IPessoaRepositorio,
    private readonly categoriaRepositorio: ICategoriaRepositorio,
    private readonly cartaoRepositorio: ICartaoRepositorio,
    private readonly sincronizar: SincronizarRecorrencias,
    private readonly listar: ListarRecorrencias
  ) {}

  async executar(entrada: CriarRecorrenciaEntrada): Promise<RecorrenciaDTO> {
    const [pessoa, categoria] = await Promise.all([
      this.pessoaRepositorio.buscarPorId(entrada.pessoaId),
      this.categoriaRepositorio.buscarPorId(entrada.categoriaId)
    ])
    if (!pessoa) throw new ErroNaoEncontrado('Pessoa', entrada.pessoaId)
    if (!categoria) throw new ErroNaoEncontrado('Categoria', entrada.categoriaId)
    if (categoria.tipo !== entrada.tipo) {
      throw new ErroDominio(`A categoria "${categoria.nome}" não é do tipo ${entrada.tipo}.`)
    }
    if (entrada.cartaoId && !(await this.cartaoRepositorio.buscarPorId(entrada.cartaoId))) {
      throw new ErroNaoEncontrado('Cartão', entrada.cartaoId)
    }

    const recorrencia = Recorrencia.criar(entrada)
    await this.recorrenciaRepositorio.salvar(recorrencia)
    await this.sincronizar.executar()
    return (await this.listar.buscar(recorrencia.id))!
  }
}

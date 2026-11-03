import type { IContaRepositorio } from '../../../dominio/repositorios/IContaRepositorio'
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
    private readonly listar: ListarRecorrencias,
    private readonly contaRepositorio?: IContaRepositorio
  ) {}

  async executar(entrada: CriarRecorrenciaEntrada): Promise<RecorrenciaDTO> {
    if (entrada.pessoaId && !(await this.pessoaRepositorio.buscarPorId(entrada.pessoaId))) {
      throw new ErroNaoEncontrado('Pessoa', entrada.pessoaId)
    }
    const categoria = await this.categoriaRepositorio.buscarPorId(entrada.categoriaId)
    if (!categoria) throw new ErroNaoEncontrado('Categoria', entrada.categoriaId)
    if (categoria.tipo !== entrada.tipo) {
      throw new ErroDominio(`A categoria "${categoria.nome}" não é do tipo ${entrada.tipo}.`)
    }
    if (entrada.cartaoId && !(await this.cartaoRepositorio.buscarPorId(entrada.cartaoId))) {
      throw new ErroNaoEncontrado('Cartão', entrada.cartaoId)
    }

    if (entrada.contaId && this.contaRepositorio && !(await this.contaRepositorio.buscarPorId(entrada.contaId))) {
      throw new ErroNaoEncontrado('Conta', entrada.contaId)
    }
    const recorrencia = Recorrencia.criar(entrada)
    await this.recorrenciaRepositorio.salvar(recorrencia)
    await this.sincronizar.executar()
    return (await this.listar.buscar(recorrencia.id))!
  }
}

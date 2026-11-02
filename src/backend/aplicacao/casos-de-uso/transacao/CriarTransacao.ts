import type { CriarTransacaoEntrada, TransacaoDTO } from '@compartilhado/dtos/transacao'
import { Transacao } from '../../../dominio/entidades/Transacao'
import { ErroDominio, ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { ICategoriaRepositorio } from '../../../dominio/repositorios/ICategoriaRepositorio'
import type { IPessoaRepositorio } from '../../../dominio/repositorios/IPessoaRepositorio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'
import { TransacaoMapeador } from '../../mapeadores/TransacaoMapeador'

export class CriarTransacao {
  constructor(
    private readonly transacaoRepositorio: ITransacaoRepositorio,
    private readonly pessoaRepositorio: IPessoaRepositorio,
    private readonly categoriaRepositorio: ICategoriaRepositorio
  ) {}

  async executar(entrada: CriarTransacaoEntrada): Promise<TransacaoDTO> {
    if (entrada.pessoaId && !(await this.pessoaRepositorio.buscarPorId(entrada.pessoaId))) {
      throw new ErroNaoEncontrado('Pessoa', entrada.pessoaId)
    }
    const categoria = await this.categoriaRepositorio.buscarPorId(entrada.categoriaId)
    if (!categoria) throw new ErroNaoEncontrado('Categoria', entrada.categoriaId)
    if (categoria.tipo !== entrada.tipo) {
      throw new ErroDominio(`A categoria "${categoria.nome}" não é do tipo ${entrada.tipo}.`)
    }

    const transacao = Transacao.criar({
      descricao: entrada.descricao,
      valorCentavos: entrada.valorCentavos,
      tipo: entrada.tipo,
      data: new Date(`${entrada.data}T00:00:00Z`),
      pessoaId: entrada.pessoaId ?? null,
      categoriaId: categoria.id,
      estabelecimento: entrada.estabelecimento ?? null,
      objetivoId: entrada.objetivoId ?? null
    })

    await this.transacaoRepositorio.salvar(transacao)
    return TransacaoMapeador.paraDTO(transacao)
  }
}

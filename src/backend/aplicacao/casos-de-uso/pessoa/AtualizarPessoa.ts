import type { AtualizarPessoaEntrada, PessoaDTO } from '@compartilhado/dtos/pessoa'
import { ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { IPessoaRepositorio } from '../../../dominio/repositorios/IPessoaRepositorio'
import { PessoaMapeador } from '../../mapeadores/PessoaMapeador'

export class AtualizarPessoa {
  constructor(private readonly repositorio: IPessoaRepositorio) {}

  async executar({ id, ...dados }: AtualizarPessoaEntrada): Promise<PessoaDTO> {
    const pessoa = await this.repositorio.buscarPorId(id)
    if (!pessoa) throw new ErroNaoEncontrado('Pessoa', id)

    pessoa.atualizar(dados)
    await this.repositorio.salvar(pessoa)
    return PessoaMapeador.paraDTO(pessoa)
  }
}

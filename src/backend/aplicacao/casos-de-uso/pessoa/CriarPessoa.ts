import type { CriarPessoaEntrada, PessoaDTO } from '@compartilhado/dtos/pessoa'
import { Pessoa } from '../../../dominio/entidades/Pessoa'
import type { IPessoaRepositorio } from '../../../dominio/repositorios/IPessoaRepositorio'
import { PessoaMapeador } from '../../mapeadores/PessoaMapeador'

export class CriarPessoa {
  constructor(private readonly repositorio: IPessoaRepositorio) {}

  async executar(entrada: CriarPessoaEntrada): Promise<PessoaDTO> {
    const pessoa = Pessoa.criar(entrada)
    await this.repositorio.salvar(pessoa)
    return PessoaMapeador.paraDTO(pessoa)
  }
}

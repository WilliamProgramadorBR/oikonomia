import type { PessoaDTO } from '@compartilhado/dtos/pessoa'
import type { IPessoaRepositorio } from '../../../dominio/repositorios/IPessoaRepositorio'
import { PessoaMapeador } from '../../mapeadores/PessoaMapeador'

export class ListarPessoas {
  constructor(private readonly repositorio: IPessoaRepositorio) {}

  async executar(): Promise<PessoaDTO[]> {
    const pessoas = await this.repositorio.listar()
    return pessoas.map(PessoaMapeador.paraDTO)
  }
}

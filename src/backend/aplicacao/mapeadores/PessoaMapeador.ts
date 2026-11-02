import type { PessoaDTO } from '@compartilhado/dtos/pessoa'
import type { Pessoa } from '../../dominio/entidades/Pessoa'

export const PessoaMapeador = {
  paraDTO(pessoa: Pessoa): PessoaDTO {
    return {
      id: pessoa.id,
      nome: pessoa.nome,
      cor: pessoa.cor,
      criadoEm: pessoa.criadoEm.toISOString()
    }
  }
}

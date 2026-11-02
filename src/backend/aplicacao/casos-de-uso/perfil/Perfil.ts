import type { PerfilDTO, SalvarPerfilEntrada } from '@compartilhado/dtos/perfil'
import {
  PERFIL_PADRAO,
  parametrosDoPerfil,
  validarPerfil,
  type PerfilFinanceiro
} from '../../../dominio/entidades/PerfilFinanceiro'
import type { IPerfilRepositorio } from '../../../dominio/repositorios/IPerfilRepositorio'

export function perfilParaDTO(perfil: PerfilFinanceiro | null): PerfilDTO {
  const efetivo = perfil ?? PERFIL_PADRAO
  return { ...efetivo, definido: perfil !== null, parametros: parametrosDoPerfil(efetivo) }
}

export class ObterPerfil {
  constructor(private readonly repositorio: IPerfilRepositorio) {}

  async executar(): Promise<PerfilDTO> {
    return perfilParaDTO(await this.repositorio.obter())
  }
}

export class SalvarPerfil {
  constructor(private readonly repositorio: IPerfilRepositorio) {}

  async executar(entrada: SalvarPerfilEntrada): Promise<PerfilDTO> {
    const perfil = validarPerfil(entrada)
    await this.repositorio.salvar(perfil)
    return perfilParaDTO(perfil)
  }
}

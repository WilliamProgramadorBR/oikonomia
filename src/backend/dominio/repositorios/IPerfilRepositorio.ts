import type { PerfilFinanceiro } from '../entidades/PerfilFinanceiro'

export interface IPerfilRepositorio {
  obter(): Promise<PerfilFinanceiro | null> // null = ainda não definido
  salvar(perfil: PerfilFinanceiro): Promise<void>
}

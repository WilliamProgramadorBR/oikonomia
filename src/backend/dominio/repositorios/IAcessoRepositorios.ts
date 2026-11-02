import type { Usuario } from '../entidades/Usuario'

export interface IUsuarioRepositorio {
  salvar(usuario: Usuario): Promise<void>
  buscarPorId(id: string): Promise<Usuario | null>
  buscarPorEmail(email: string): Promise<Usuario | null>
  listar(): Promise<Usuario[]>
  contar(): Promise<number>
}

// Sessões: o banco guarda só o resumo (hash) do token, nunca o token.
export interface Sessao {
  id: string
  usuarioId: string
  tokenResumo: string
  expiraEm: Date
  criadoEm: Date
}

export interface ISessaoRepositorio {
  salvar(sessao: Sessao): Promise<void>
  buscarPorResumo(tokenResumo: string): Promise<Sessao | null>
  remover(id: string): Promise<void>
  removerDoUsuario(usuarioId: string): Promise<void>
  removerExpiradas(agora: Date): Promise<void>
}

// Códigos de recuperação de senha enviados por e-mail (também guardados só como resumo).
export interface CodigoRecuperacao {
  id: string
  usuarioId: string
  codigoResumo: string
  tentativas: number
  expiraEm: Date
  usadoEm: Date | null
  criadoEm: Date
}

export interface ICodigoRecuperacaoRepositorio {
  salvar(codigo: CodigoRecuperacao): Promise<void>
  buscarAtivo(usuarioId: string, agora: Date): Promise<CodigoRecuperacao | null>
  contarDesde(usuarioId: string, desde: Date): Promise<number>
  invalidarDoUsuario(usuarioId: string, agora: Date): Promise<void>
}

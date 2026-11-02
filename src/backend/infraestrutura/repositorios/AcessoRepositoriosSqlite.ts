import { Usuario } from '../../dominio/entidades/Usuario'
import type {
  CodigoRecuperacao,
  ICodigoRecuperacaoRepositorio,
  ISessaoRepositorio,
  IUsuarioRepositorio,
  Sessao
} from '../../dominio/repositorios/IAcessoRepositorios'
import type { BancoDeDados } from '../banco/conexao'

interface LinhaUsuario {
  id: string
  nome: string
  email: string
  senha_hash: string
  pessoa_id: string | null
  tentativas_falhas: number
  bloqueado_ate: string | null
  senha_alterada_em: string
  ultimo_acesso_em: string | null
  criado_em: string
}

const data = (texto: string | null) => (texto ? new Date(texto) : null)

export class UsuarioRepositorioSqlite implements IUsuarioRepositorio {
  constructor(private readonly banco: BancoDeDados) {}

  async salvar(u: Usuario): Promise<void> {
    this.banco
      .prepare(
        `INSERT INTO usuarios (id, nome, email, senha_hash, pessoa_id, tentativas_falhas, bloqueado_ate,
                               senha_alterada_em, ultimo_acesso_em, criado_em)
         VALUES (@id, @nome, @email, @senha_hash, @pessoa_id, @tentativas_falhas, @bloqueado_ate,
                 @senha_alterada_em, @ultimo_acesso_em, @criado_em)
         ON CONFLICT(id) DO UPDATE SET
           nome = excluded.nome, email = excluded.email, senha_hash = excluded.senha_hash,
           pessoa_id = excluded.pessoa_id, tentativas_falhas = excluded.tentativas_falhas,
           bloqueado_ate = excluded.bloqueado_ate, senha_alterada_em = excluded.senha_alterada_em,
           ultimo_acesso_em = excluded.ultimo_acesso_em`
      )
      .run({
        id: u.id,
        nome: u.nome,
        email: u.email,
        senha_hash: u.senhaHash,
        pessoa_id: u.pessoaId,
        tentativas_falhas: u.tentativasFalhas,
        bloqueado_ate: u.bloqueadoAte?.toISOString() ?? null,
        senha_alterada_em: u.senhaAlteradaEm.toISOString(),
        ultimo_acesso_em: u.ultimoAcessoEm?.toISOString() ?? null,
        criado_em: u.criadoEm.toISOString()
      })
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const linha = this.banco.prepare('SELECT * FROM usuarios WHERE id = ?').get(id) as unknown as LinhaUsuario | undefined
    return linha ? this.paraEntidade(linha) : null
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const linha = this.banco.prepare('SELECT * FROM usuarios WHERE email = ?').get(email) as unknown as LinhaUsuario | undefined
    return linha ? this.paraEntidade(linha) : null
  }

  async listar(): Promise<Usuario[]> {
    const linhas = this.banco.prepare('SELECT * FROM usuarios ORDER BY criado_em').all() as unknown as LinhaUsuario[]
    return linhas.map((l) => this.paraEntidade(l))
  }

  async contar(): Promise<number> {
    return (this.banco.prepare('SELECT COUNT(*) AS total FROM usuarios').get() as { total: number }).total
  }

  private paraEntidade(l: LinhaUsuario): Usuario {
    return Usuario.restaurar({
      id: l.id,
      nome: l.nome,
      email: l.email,
      senhaHash: l.senha_hash,
      pessoaId: l.pessoa_id,
      tentativasFalhas: l.tentativas_falhas,
      bloqueadoAte: data(l.bloqueado_ate),
      senhaAlteradaEm: new Date(l.senha_alterada_em),
      ultimoAcessoEm: data(l.ultimo_acesso_em),
      criadoEm: new Date(l.criado_em)
    })
  }
}

interface LinhaSessao {
  id: string
  usuario_id: string
  token_resumo: string
  expira_em: string
  criado_em: string
}

export class SessaoRepositorioSqlite implements ISessaoRepositorio {
  constructor(private readonly banco: BancoDeDados) {}

  async salvar(s: Sessao): Promise<void> {
    this.banco
      .prepare('INSERT INTO sessoes (id, usuario_id, token_resumo, expira_em, criado_em) VALUES (?, ?, ?, ?, ?)')
      .run(s.id, s.usuarioId, s.tokenResumo, s.expiraEm.toISOString(), s.criadoEm.toISOString())
  }

  async buscarPorResumo(tokenResumo: string): Promise<Sessao | null> {
    const l = this.banco.prepare('SELECT * FROM sessoes WHERE token_resumo = ?').get(tokenResumo) as unknown as
      | LinhaSessao
      | undefined
    return l
      ? { id: l.id, usuarioId: l.usuario_id, tokenResumo: l.token_resumo, expiraEm: new Date(l.expira_em), criadoEm: new Date(l.criado_em) }
      : null
  }

  async remover(id: string): Promise<void> {
    this.banco.prepare('DELETE FROM sessoes WHERE id = ?').run(id)
  }

  async removerDoUsuario(usuarioId: string): Promise<void> {
    this.banco.prepare('DELETE FROM sessoes WHERE usuario_id = ?').run(usuarioId)
  }

  async removerExpiradas(agora: Date): Promise<void> {
    this.banco.prepare('DELETE FROM sessoes WHERE expira_em <= ?').run(agora.toISOString())
  }
}

interface LinhaCodigo {
  id: string
  usuario_id: string
  codigo_resumo: string
  tentativas: number
  expira_em: string
  usado_em: string | null
  criado_em: string
}

export class CodigoRecuperacaoRepositorioSqlite implements ICodigoRecuperacaoRepositorio {
  constructor(private readonly banco: BancoDeDados) {}

  async salvar(c: CodigoRecuperacao): Promise<void> {
    this.banco
      .prepare(
        `INSERT INTO codigos_recuperacao (id, usuario_id, codigo_resumo, tentativas, expira_em, usado_em, criado_em)
         VALUES (@id, @usuario_id, @codigo_resumo, @tentativas, @expira_em, @usado_em, @criado_em)
         ON CONFLICT(id) DO UPDATE SET tentativas = excluded.tentativas, usado_em = excluded.usado_em`
      )
      .run({
        id: c.id,
        usuario_id: c.usuarioId,
        codigo_resumo: c.codigoResumo,
        tentativas: c.tentativas,
        expira_em: c.expiraEm.toISOString(),
        usado_em: c.usadoEm?.toISOString() ?? null,
        criado_em: c.criadoEm.toISOString()
      })
  }

  async buscarAtivo(usuarioId: string, agora: Date): Promise<CodigoRecuperacao | null> {
    const l = this.banco
      .prepare(
        `SELECT * FROM codigos_recuperacao
         WHERE usuario_id = ? AND usado_em IS NULL AND expira_em > ?
         ORDER BY criado_em DESC LIMIT 1`
      )
      .get(usuarioId, agora.toISOString()) as unknown as LinhaCodigo | undefined
    return l
      ? {
          id: l.id,
          usuarioId: l.usuario_id,
          codigoResumo: l.codigo_resumo,
          tentativas: l.tentativas,
          expiraEm: new Date(l.expira_em),
          usadoEm: data(l.usado_em),
          criadoEm: new Date(l.criado_em)
        }
      : null
  }

  async contarDesde(usuarioId: string, desde: Date): Promise<number> {
    return (
      this.banco
        .prepare('SELECT COUNT(*) AS total FROM codigos_recuperacao WHERE usuario_id = ? AND criado_em >= ?')
        .get(usuarioId, desde.toISOString()) as { total: number }
    ).total
  }

  async invalidarDoUsuario(usuarioId: string, agora: Date): Promise<void> {
    this.banco
      .prepare('UPDATE codigos_recuperacao SET usado_em = ? WHERE usuario_id = ? AND usado_em IS NULL')
      .run(agora.toISOString(), usuarioId)
  }
}

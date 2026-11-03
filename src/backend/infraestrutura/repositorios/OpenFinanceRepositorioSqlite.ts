import { ErroDominio } from '../../dominio/erros/ErroDominio'
import type { CredenciaisAgregador } from '../../dominio/portas/IOpenFinance'
import type {
  AceiteTermo,
  ConexaoSalva,
  ContaRemotaSalva,
  IConfiguracaoOpenFinance,
  IOpenFinanceRepositorio
} from '../../dominio/repositorios/IOpenFinanceRepositorio'
import type { ConfiguracoesSqlite } from '../banco/Configuracoes'
import type { BancoDeDados } from '../banco/conexao'
import type { CofreSistema } from '../seguranca/CofreSistema'

interface LinhaConexao {
  item_id: string
  instituicao: string
  cor: string | null
  situacao: ConexaoSalva['situacao']
  mensagem: string | null
  conectado_em: string
}

interface LinhaContaRemota {
  id: string
  item_id: string
  nome: string
  tipo: ContaRemotaSalva['tipo']
  final_numero: string | null
  saldo_centavos: number
  conta_id: string | null
  ultima_sincronizacao: string | null
}

export class OpenFinanceRepositorioSqlite implements IOpenFinanceRepositorio {
  constructor(private readonly banco: BancoDeDados) {}

  async salvarConexao(c: ConexaoSalva): Promise<void> {
    this.banco
      .prepare(
        `INSERT INTO open_finance_conexoes (item_id, instituicao, cor, situacao, mensagem, conectado_em)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(item_id) DO UPDATE SET instituicao = excluded.instituicao, cor = excluded.cor,
           situacao = excluded.situacao, mensagem = excluded.mensagem`
      )
      .run(c.id, c.instituicao, c.cor, c.situacao, c.mensagem, c.conectadoEm.toISOString())
  }

  async listarConexoes(): Promise<ConexaoSalva[]> {
    const linhas = this.banco.prepare('SELECT * FROM open_finance_conexoes ORDER BY conectado_em').all() as unknown as LinhaConexao[]
    return linhas.map((l) => ({
      id: l.item_id,
      instituicao: l.instituicao,
      cor: l.cor,
      situacao: l.situacao,
      mensagem: l.mensagem,
      conectadoEm: new Date(l.conectado_em)
    }))
  }

  async removerConexao(itemId: string): Promise<void> {
    this.banco.prepare('DELETE FROM open_finance_contas WHERE item_id = ?').run(itemId)
    this.banco.prepare('DELETE FROM open_finance_conexoes WHERE item_id = ?').run(itemId)
  }

  async salvarContaRemota(c: ContaRemotaSalva): Promise<void> {
    this.banco
      .prepare(
        `INSERT INTO open_finance_contas (id, item_id, nome, tipo, final_numero, saldo_centavos, conta_id, ultima_sincronizacao)
         VALUES (@id, @item_id, @nome, @tipo, @final_numero, @saldo_centavos, @conta_id, @ultima_sincronizacao)
         ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, tipo = excluded.tipo, final_numero = excluded.final_numero,
           saldo_centavos = excluded.saldo_centavos, conta_id = excluded.conta_id, ultima_sincronizacao = excluded.ultima_sincronizacao`
      )
      .run({
        id: c.id,
        item_id: c.itemId,
        nome: c.nome,
        tipo: c.tipo,
        final_numero: c.finalNumero,
        saldo_centavos: c.saldoCentavos,
        conta_id: c.contaId,
        ultima_sincronizacao: c.ultimaSincronizacao
      })
  }

  async listarContasRemotas(): Promise<ContaRemotaSalva[]> {
    return (this.banco.prepare('SELECT * FROM open_finance_contas ORDER BY nome').all() as unknown as LinhaContaRemota[]).map(paraConta)
  }

  async buscarContaRemota(id: string): Promise<ContaRemotaSalva | null> {
    const l = this.banco.prepare('SELECT * FROM open_finance_contas WHERE id = ?').get(id) as unknown as LinhaContaRemota | undefined
    return l ? paraConta(l) : null
  }

  async buscarPorContaLocal(contaId: string): Promise<ContaRemotaSalva | null> {
    const l = this.banco.prepare('SELECT * FROM open_finance_contas WHERE conta_id = ?').get(contaId) as unknown as LinhaContaRemota | undefined
    return l ? paraConta(l) : null
  }
}

const paraConta = (l: LinhaContaRemota): ContaRemotaSalva => ({
  id: l.id,
  itemId: l.item_id,
  nome: l.nome,
  tipo: l.tipo,
  finalNumero: l.final_numero,
  saldoCentavos: l.saldo_centavos,
  contaId: l.conta_id,
  ultimaSincronizacao: l.ultima_sincronizacao
})

const CHAVES = {
  clientId: 'openfinance.client_id_cifrado',
  clientSecret: 'openfinance.client_secret_cifrado',
  termoVersao: 'openfinance.termo_versao',
  termoAceitoEm: 'openfinance.termo_aceito_em',
  termoUsuario: 'openfinance.termo_usuario',
  revogadoEm: 'openfinance.revogado_em'
}

// Client ID e Client Secret cifrados pelo cofre do sistema: nunca em texto no banco, nunca no binário.
export class ConfiguracaoOpenFinanceSegura implements IConfiguracaoOpenFinance {
  constructor(
    private readonly configuracoes: ConfiguracoesSqlite,
    private readonly cofre: CofreSistema
  ) {}

  criptografiaDisponivel(): boolean {
    return this.cofre.disponivel()
  }

  credenciais(): CredenciaisAgregador | null {
    const id = this.configuracoes.ler(CHAVES.clientId)
    const segredo = this.configuracoes.ler(CHAVES.clientSecret)
    if (!id || !segredo) return null
    const clientId = this.cofre.decifrar(id)
    const clientSecret = this.cofre.decifrar(segredo)
    return clientId && clientSecret ? { clientId, clientSecret } : null
  }

  salvarCredenciais({ clientId, clientSecret }: CredenciaisAgregador): void {
    if (!this.cofre.disponivel()) {
      throw new ErroDominio('A criptografia do sistema não está disponível; as credenciais não podem ser guardadas com segurança.')
    }
    this.configuracoes.gravar(CHAVES.clientId, this.cofre.cifrar(clientId))
    this.configuracoes.gravar(CHAVES.clientSecret, this.cofre.cifrar(clientSecret))
  }

  apagarCredenciais(): void {
    this.configuracoes.remover(CHAVES.clientId)
    this.configuracoes.remover(CHAVES.clientSecret)
  }

  aceite(): AceiteTermo | null {
    const versao = this.configuracoes.ler(CHAVES.termoVersao)
    const aceitoEm = this.configuracoes.ler(CHAVES.termoAceitoEm)
    if (!versao || !aceitoEm) return null
    return { versao, aceitoEm: new Date(aceitoEm), usuarioId: this.configuracoes.ler(CHAVES.termoUsuario) }
  }

  registrarAceite({ versao, aceitoEm, usuarioId }: AceiteTermo): void {
    this.configuracoes.gravar(CHAVES.termoVersao, versao)
    this.configuracoes.gravar(CHAVES.termoAceitoEm, aceitoEm.toISOString())
    if (usuarioId) this.configuracoes.gravar(CHAVES.termoUsuario, usuarioId)
    this.configuracoes.remover(CHAVES.revogadoEm)
  }

  revogarAceite(revogadoEm: Date): void {
    this.configuracoes.remover(CHAVES.termoVersao)
    this.configuracoes.remover(CHAVES.termoAceitoEm)
    this.configuracoes.remover(CHAVES.termoUsuario)
    this.configuracoes.gravar(CHAVES.revogadoEm, revogadoEm.toISOString())
  }
}

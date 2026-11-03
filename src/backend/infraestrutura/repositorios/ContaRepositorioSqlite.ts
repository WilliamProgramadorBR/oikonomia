import { ContaBancaria, type TipoConta } from '../../dominio/entidades/ContaBancaria'
import type { IContaRepositorio, MovimentoConta, SaldoConferido } from '../../dominio/repositorios/IContaRepositorio'
import type { BancoDeDados } from '../banco/conexao'

interface LinhaConta {
  id: string
  nome: string
  tipo: TipoConta
  instituicao: string
  cnpj8: string | null
  pessoa_id: string | null
  ativa: number
  criado_em: string
}

interface LinhaSaldo {
  id: string
  conta_id: string
  data: string
  saldo_centavos: number
  origem: 'informado' | 'extrato'
  criado_em: string
}

export class ContaRepositorioSqlite implements IContaRepositorio {
  constructor(private readonly banco: BancoDeDados) {}

  async salvar(c: ContaBancaria): Promise<void> {
    this.banco
      .prepare(
        `INSERT INTO contas (id, nome, tipo, instituicao, cnpj8, pessoa_id, ativa, criado_em)
         VALUES (@id, @nome, @tipo, @instituicao, @cnpj8, @pessoa_id, @ativa, @criado_em)
         ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, tipo = excluded.tipo, instituicao = excluded.instituicao,
           cnpj8 = excluded.cnpj8, pessoa_id = excluded.pessoa_id, ativa = excluded.ativa`
      )
      .run({
        id: c.id,
        nome: c.nome,
        tipo: c.tipo,
        instituicao: c.instituicao,
        cnpj8: c.cnpj8,
        pessoa_id: c.pessoaId,
        ativa: c.ativa ? 1 : 0,
        criado_em: c.criadoEm.toISOString()
      })
  }

  async listar(): Promise<ContaBancaria[]> {
    const linhas = this.banco.prepare('SELECT * FROM contas ORDER BY ativa DESC, criado_em').all() as unknown as LinhaConta[]
    return linhas.map((l) => this.paraEntidade(l))
  }

  async buscarPorId(id: string): Promise<ContaBancaria | null> {
    const l = this.banco.prepare('SELECT * FROM contas WHERE id = ?').get(id) as unknown as LinhaConta | undefined
    return l ? this.paraEntidade(l) : null
  }

  async registrarSaldo(s: SaldoConferido): Promise<void> {
    this.banco
      .prepare('INSERT INTO saldos_conta (id, conta_id, data, saldo_centavos, origem, criado_em) VALUES (?, ?, ?, ?, ?, ?)')
      .run(s.id, s.contaId, s.data, s.saldoCentavos, s.origem, s.criadoEm.toISOString())
  }

  async ultimoSaldo(contaId: string): Promise<SaldoConferido | null> {
    const l = this.banco
      .prepare('SELECT * FROM saldos_conta WHERE conta_id = ? ORDER BY data DESC, criado_em DESC LIMIT 1')
      .get(contaId) as unknown as LinhaSaldo | undefined
    return l
      ? { id: l.id, contaId: l.conta_id, data: l.data, saldoCentavos: l.saldo_centavos, origem: l.origem, criadoEm: new Date(l.criado_em) }
      : null
  }

  async movimentoEntre(contaId: string, depois: string, ate: string): Promise<MovimentoConta> {
    const l = this.banco
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor_centavos ELSE 0 END), 0) AS entradas,
           COALESCE(SUM(CASE WHEN tipo <> 'receita' THEN valor_centavos ELSE 0 END), 0) AS saidas,
           COUNT(*) AS quantidade
         FROM transacoes
         WHERE conta_id = ? AND status = 'confirmada' AND data > ? AND data <= ?`
      )
      .get(contaId, depois, ate) as { entradas: number; saidas: number; quantidade: number }
    return { entradasCentavos: l.entradas, saidasCentavos: l.saidas, quantidade: l.quantidade }
  }

  private paraEntidade(l: LinhaConta): ContaBancaria {
    return ContaBancaria.restaurar({
      id: l.id,
      nome: l.nome,
      tipo: l.tipo,
      instituicao: l.instituicao,
      cnpj8: l.cnpj8,
      pessoaId: l.pessoa_id,
      ativa: l.ativa === 1,
      criadoEm: new Date(l.criado_em)
    })
  }
}

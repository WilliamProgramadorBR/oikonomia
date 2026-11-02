import { Objetivo, type PrioridadeObjetivo, type TipoObjetivo } from '../../dominio/entidades/Objetivo'
import type { IObjetivoRepositorio } from '../../dominio/repositorios/IObjetivoRepositorio'
import type { BancoDeDados } from '../banco/conexao'
import { emTransacao } from '../banco/transacao'

interface LinhaObjetivo {
  id: string
  nome: string
  tipo: TipoObjetivo
  valor_alvo_centavos: number
  valor_inicial_centavos: number
  data_alvo: string
  prioridade: PrioridadeObjetivo
  pessoa_id: string | null
  criado_em: string
}

export class ObjetivoRepositorioSqlite implements IObjetivoRepositorio {
  constructor(private readonly banco: BancoDeDados) {}

  async salvar(objetivo: Objetivo): Promise<void> {
    this.banco
      .prepare(
        `INSERT INTO objetivos
           (id, nome, tipo, valor_alvo_centavos, valor_inicial_centavos, data_alvo, prioridade, pessoa_id, criado_em)
         VALUES
           (@id, @nome, @tipo, @valor_alvo_centavos, @valor_inicial_centavos, @data_alvo, @prioridade, @pessoa_id, @criado_em)
         ON CONFLICT(id) DO UPDATE SET
           nome = excluded.nome,
           valor_alvo_centavos = excluded.valor_alvo_centavos,
           data_alvo = excluded.data_alvo,
           prioridade = excluded.prioridade,
           pessoa_id = excluded.pessoa_id`
      )
      .run({
        id: objetivo.id,
        nome: objetivo.nome,
        tipo: objetivo.tipo,
        valor_alvo_centavos: objetivo.valorAlvoCentavos,
        valor_inicial_centavos: objetivo.valorInicialCentavos,
        data_alvo: objetivo.dataAlvo,
        prioridade: objetivo.prioridade,
        pessoa_id: objetivo.pessoaId,
        criado_em: objetivo.criadoEm.toISOString()
      })
  }

  async listar(): Promise<Objetivo[]> {
    const linhas = this.banco
      .prepare('SELECT * FROM objetivos ORDER BY prioridade, data_alvo')
      .all() as unknown as LinhaObjetivo[]
    return linhas.map((linha) => this.paraEntidade(linha))
  }

  async buscarPorId(id: string): Promise<Objetivo | null> {
    const linha = this.banco.prepare('SELECT * FROM objetivos WHERE id = ?').get(id) as unknown as
      | LinhaObjetivo
      | undefined
    return linha ? this.paraEntidade(linha) : null
  }

  async remover(id: string): Promise<void> {
    emTransacao(this.banco, () => {
      this.banco.prepare('UPDATE transacoes SET objetivo_id = NULL WHERE objetivo_id = ?').run(id)
      this.banco.prepare('UPDATE recorrencias SET objetivo_id = NULL WHERE objetivo_id = ?').run(id)
      this.banco.prepare('DELETE FROM objetivos WHERE id = ?').run(id)
    })
  }

  private paraEntidade(linha: LinhaObjetivo): Objetivo {
    return Objetivo.restaurar({
      id: linha.id,
      nome: linha.nome,
      tipo: linha.tipo,
      valorAlvoCentavos: linha.valor_alvo_centavos,
      valorInicialCentavos: linha.valor_inicial_centavos,
      dataAlvo: linha.data_alvo,
      prioridade: linha.prioridade,
      pessoaId: linha.pessoa_id,
      criadoEm: new Date(linha.criado_em)
    })
  }
}

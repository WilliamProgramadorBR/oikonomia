import type {
  EstadoSincronizacaoPersistido,
  ISincronizacaoRepositorio
} from '../../dominio/repositorios/ISincronizacaoRepositorio'
import type { BancoDeDados } from '../banco/conexao'
import { emTransacao } from '../banco/transacao'

interface LinhaConfiguracao {
  modo: EstadoSincronizacaoPersistido['modo']
  fase: EstadoSincronizacaoPersistido['fase']
  dispositivo_id: string | null
  familia_id: string | null
  servidor_url: string | null
  cofre_chave: string | null
  ultimo_cursor: number
  mensagem: string | null
  atualizado_em: string
}

export class SincronizacaoRepositorioSqlite implements ISincronizacaoRepositorio {
  constructor(private readonly banco: BancoDeDados) {}

  async obterEstado(): Promise<EstadoSincronizacaoPersistido> {
    const linha = this.banco.prepare('SELECT * FROM sincronizacao_configuracao WHERE id = 1').get() as
      | LinhaConfiguracao
      | undefined
    if (!linha) throw new Error('Configuração de sincronização ausente.')
    return {
      modo: linha.modo,
      fase: linha.fase,
      dispositivoId: linha.dispositivo_id,
      familiaId: linha.familia_id,
      servidorUrl: linha.servidor_url,
      cofreChave: linha.cofre_chave,
      ultimoCursor: linha.ultimo_cursor,
      mensagem: linha.mensagem,
      atualizadoEm: new Date(linha.atualizado_em)
    }
  }

  async prepararCofre({ dispositivoId, cofreChave, atualizadoEm }: { dispositivoId: string; cofreChave: string; atualizadoEm: Date }): Promise<void> {
    this.banco
      .prepare(
        `UPDATE sincronizacao_configuracao
         SET modo = 'sincronizacao', fase = 'cofre_preparado', dispositivo_id = ?,
             cofre_chave = ?, mensagem = NULL, atualizado_em = ?
         WHERE id = 1`
      )
      .run(dispositivoId, cofreChave, atualizadoEm.toISOString())
  }

  async atualizarCofre(cofreChave: string, atualizadoEm: Date): Promise<void> {
    this.banco
      .prepare('UPDATE sincronizacao_configuracao SET cofre_chave = ?, atualizado_em = ? WHERE id = 1')
      .run(cofreChave, atualizadoEm.toISOString())
  }

  async voltarParaLocal(atualizadoEm: Date): Promise<void> {
    emTransacao(this.banco, () => {
      this.banco.exec('DELETE FROM sincronizacao_outbox; DELETE FROM sincronizacao_inbox;')
      this.banco
        .prepare(
          `UPDATE sincronizacao_configuracao
           SET modo = 'local', fase = 'local', dispositivo_id = NULL, familia_id = NULL,
               servidor_url = NULL, cofre_chave = NULL, ultimo_cursor = 0,
               mensagem = NULL, atualizado_em = ?
           WHERE id = 1`
        )
        .run(atualizadoEm.toISOString())
    })
  }
}

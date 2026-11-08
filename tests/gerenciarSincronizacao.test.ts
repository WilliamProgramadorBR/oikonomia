import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GerenciarSincronizacao } from '../src/backend/aplicacao/casos-de-uso/sincronizacao/GerenciarSincronizacao'
import type {
  EstadoSincronizacaoPersistido,
  ISincronizacaoRepositorio
} from '../src/backend/dominio/repositorios/ISincronizacaoRepositorio'
import { CriptografiaSincronizacaoNode } from '../src/backend/infraestrutura/seguranca/CriptografiaSincronizacaoNode'

class RepositorioMemoria implements ISincronizacaoRepositorio {
  estado: EstadoSincronizacaoPersistido = {
    modo: 'local',
    fase: 'local',
    dispositivoId: null,
    familiaId: null,
    servidorUrl: null,
    cofreChave: null,
    ultimoCursor: 0,
    mensagem: null,
    atualizadoEm: new Date(0)
  }

  async obterEstado() {
    return { ...this.estado }
  }

  async prepararCofre(entrada: { dispositivoId: string; cofreChave: string; atualizadoEm: Date }) {
    this.estado = {
      ...this.estado,
      modo: 'sincronizacao',
      fase: 'cofre_preparado',
      dispositivoId: entrada.dispositivoId,
      cofreChave: entrada.cofreChave,
      atualizadoEm: entrada.atualizadoEm
    }
  }

  async atualizarCofre(cofreChave: string, atualizadoEm: Date) {
    this.estado = { ...this.estado, cofreChave, atualizadoEm }
  }

  async voltarParaLocal(atualizadoEm: Date) {
    this.estado = {
      ...this.estado,
      modo: 'local',
      fase: 'local',
      dispositivoId: null,
      familiaId: null,
      servidorUrl: null,
      cofreChave: null,
      ultimoCursor: 0,
      mensagem: null,
      atualizadoEm
    }
  }
}

test('ciclo local, bloqueio, troca de frase e retorno local', async () => {
  const repositorio = new RepositorioMemoria()
  const gerenciador = new GerenciarSincronizacao(repositorio, new CriptografiaSincronizacaoNode())
  const fraseInicial = 'Minha primeira frase privada 2026'
  const fraseNova = 'Minha segunda frase privada 2027'

  const ativado = await gerenciador.ativar({ fraseSecreta: fraseInicial, confirmacao: fraseInicial })
  assert.equal(ativado.modo, 'sincronizacao')
  assert.equal(ativado.fase, 'cofre_preparado')
  assert.equal(ativado.bloqueado, false)
  assert.equal(repositorio.estado.cofreChave?.includes(fraseInicial), false)

  assert.equal((await gerenciador.bloquear()).bloqueado, true)
  await assert.rejects(
    gerenciador.desbloquear({ fraseSecreta: 'esta frase está completamente incorreta' }),
    /incorreta|danificado/i
  )
  assert.equal((await gerenciador.desbloquear({ fraseSecreta: fraseInicial })).bloqueado, false)

  await gerenciador.alterarFrase({ fraseAtual: fraseInicial, fraseNova, confirmacao: fraseNova })
  await gerenciador.bloquear()
  await assert.rejects(gerenciador.desbloquear({ fraseSecreta: fraseInicial }))
  assert.equal((await gerenciador.desbloquear({ fraseSecreta: fraseNova })).bloqueado, false)

  const local = await gerenciador.desativar({ fraseSecreta: fraseNova })
  assert.equal(local.modo, 'local')
  assert.equal(local.fase, 'local')
  assert.equal(local.bloqueado, false)
  assert.equal(repositorio.estado.cofreChave, null)
})

test('frase curta ou confirmação divergente não cria cofre', async () => {
  const gerenciador = new GerenciarSincronizacao(new RepositorioMemoria(), new CriptografiaSincronizacaoNode())
  await assert.rejects(
    gerenciador.ativar({ fraseSecreta: 'curta', confirmacao: 'curta' }),
    /16 caracteres/
  )
  await assert.rejects(
    gerenciador.ativar({
      fraseSecreta: 'uma frase suficientemente longa',
      confirmacao: 'outra frase suficientemente longa'
    }),
    /não confere/
  )
})

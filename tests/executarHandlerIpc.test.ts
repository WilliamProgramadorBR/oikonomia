import assert from 'node:assert/strict'
import { test } from 'node:test'
import { executarHandlerIpc } from '../src/backend/apresentacao/ipc/executarHandlerIpc'
import { ErroDominio } from '../src/backend/dominio/erros/ErroDominio'
import { ErroArmazenamento } from '../src/backend/infraestrutura/banco/conexao'

const sessaoAtiva = { autenticado: true }

test('só retorna sucesso depois que a unidade de trabalho confirma a operação', async () => {
  const eventos: string[] = []
  const unidade = {
    async executarAtomico<T>(executar: () => Promise<T>): Promise<T> {
      eventos.push('início')
      const resultado = await executar()
      eventos.push('persistido')
      return resultado
    }
  }

  const resposta = await executarHandlerIpc(
    sessaoAtiva,
    unidade,
    'teste:sucesso',
    async () => {
      eventos.push('executado')
      return 42
    },
    [],
    false
  )
  eventos.push('respondido')

  assert.deepEqual(resposta, { sucesso: true, dados: 42 })
  assert.deepEqual(eventos, ['início', 'executado', 'persistido', 'respondido'])
})

test('regra de negócio rejeitada preserva a mensagem do domínio', async () => {
  const unidade = {
    async executarAtomico<T>(executar: () => Promise<T>): Promise<T> {
      return executar()
    }
  }
  const resposta = await executarHandlerIpc(
    sessaoAtiva,
    unidade,
    'teste:dominio',
    async () => {
      throw new ErroDominio('Operação não permitida.')
    },
    [],
    false
  )
  assert.deepEqual(resposta, { sucesso: false, erro: 'Operação não permitida.' })
})

test('falha de persistência nunca é apresentada como sucesso', async () => {
  const unidade = {
    async executarAtomico<T>(_executar: () => Promise<T>): Promise<T> {
      throw new ErroArmazenamento('disco cheio')
    }
  }
  const resposta = await executarHandlerIpc(sessaoAtiva, unidade, 'teste:disco', async () => 'ok', [], false)
  assert.equal(resposta.sucesso, false)
  if (!resposta.sucesso) assert.match(resposta.erro, /não foi possível salvar/i)
})

test('falha inesperada do repositório permanece no contrato Resposta<T>', async () => {
  const unidade = {
    async executarAtomico<T>(executar: () => Promise<T>): Promise<T> {
      return executar()
    }
  }
  const resposta = await executarHandlerIpc(
    sessaoAtiva,
    unidade,
    'teste:repositorio',
    async () => {
      throw new TypeError('detalhe que não deve chegar à interface')
    },
    [],
    false
  )
  assert.deepEqual(resposta, { sucesso: false, erro: 'Erro inesperado. Tente novamente.' })
})

test('sessão ausente não executa nem persiste o handler protegido', async () => {
  let chamadas = 0
  const unidade = {
    async executarAtomico<T>(executar: () => Promise<T>): Promise<T> {
      chamadas++
      return executar()
    }
  }
  const resposta = await executarHandlerIpc(
    { autenticado: false },
    unidade,
    'teste:protegido',
    async () => 'não deve executar',
    [],
    false
  )
  assert.equal(resposta.sucesso, false)
  assert.equal(chamadas, 0)
})

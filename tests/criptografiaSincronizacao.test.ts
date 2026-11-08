import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CriptografiaSincronizacaoNode } from '../src/backend/infraestrutura/seguranca/CriptografiaSincronizacaoNode'

const FRASE = 'Minha frase financeira secreta 2026'
const FRASE_NOVA = 'Uma frase diferente e igualmente segura 2027'

test('frase do usuário protege uma chave aleatória sem ser armazenada', async () => {
  const criptografia = new CriptografiaSincronizacaoNode()
  const criado = await criptografia.criar(FRASE)

  assert.equal(criado.chaveDados.length, 32)
  assert.equal(criado.envelope.includes(FRASE), false)
  const aberto = await criptografia.abrir(FRASE, criado.envelope)
  assert.deepEqual(Buffer.from(aberto), Buffer.from(criado.chaveDados))

  await assert.rejects(criptografia.abrir('frase errada e suficientemente longa', criado.envelope))
  criptografia.limpar(aberto)
  criptografia.limpar(criado.chaveDados)
})

test('trocar a frase reprotege a mesma chave de dados', async () => {
  const criptografia = new CriptografiaSincronizacaoNode()
  const criado = await criptografia.criar(FRASE)
  const novoEnvelope = await criptografia.reproteger(criado.chaveDados, FRASE_NOVA)

  const reaberto = await criptografia.abrir(FRASE_NOVA, novoEnvelope)
  assert.deepEqual(Buffer.from(reaberto), Buffer.from(criado.chaveDados))
  await assert.rejects(criptografia.abrir(FRASE, novoEnvelope))

  criptografia.limpar(reaberto)
  criptografia.limpar(criado.chaveDados)
})

test('payload sincronizado autentica conteúdo e contexto', async () => {
  const criptografia = new CriptografiaSincronizacaoNode()
  const criado = await criptografia.criar(FRASE)
  const original = Buffer.from('{"valorCentavos":12345}', 'utf8')
  const cifrado = criptografia.cifrar(criado.chaveDados, original, 'transacao:abc:1')

  assert.equal(cifrado.includes('12345'), false)
  assert.deepEqual(
    Buffer.from(criptografia.decifrar(criado.chaveDados, cifrado, 'transacao:abc:1')),
    original
  )
  assert.throws(() => criptografia.decifrar(criado.chaveDados, cifrado, 'transacao:outra:1'))

  const adulterado = JSON.parse(cifrado) as { conteudo: string }
  adulterado.conteudo = `${adulterado.conteudo.slice(0, -4)}AAAA`
  assert.throws(() => criptografia.decifrar(criado.chaveDados, JSON.stringify(adulterado), 'transacao:abc:1'))
  criptografia.limpar(criado.chaveDados)
})

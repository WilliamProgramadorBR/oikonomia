import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { test } from 'node:test'
import {
  codigoRecuperacaoConfere,
  codificarBase32,
  criarUriTotp,
  decodificarBase32,
  gerarCodigoTotp,
  gerarCodigosRecuperacao,
  resumirCodigoRecuperacao,
  verificarCodigoTotp
} from '../servidor/src/seguranca/Totp'

test('TOTP corresponde aos vetores SHA-1 da RFC 6238', () => {
  const segredo = Buffer.from('12345678901234567890', 'ascii')
  const vetores = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130']
  ] as const
  for (const [instante, esperado] of vetores) {
    assert.equal(gerarCodigoTotp(segredo, instante, { digitos: 8 }), esperado)
  }
})

test('Base32, URI e janela TOTP são compatíveis com aplicativos autenticadores', () => {
  const segredo = randomBytes(20)
  const base32 = codificarBase32(segredo)
  assert.deepEqual(decodificarBase32(base32), segredo)
  const uri = criarUriTotp(base32, 'Pessoa@Exemplo.com')
  assert.match(uri, /^otpauth:\/\/totp\//)
  assert.match(uri, /secret=/)
  assert.match(uri, /issuer=Oikonomia/)

  const agora = 2_000_000_000
  const codigoAnterior = gerarCodigoTotp(segredo, agora - 30)
  assert.equal(verificarCodigoTotp(segredo, codigoAnterior, agora, 1).valido, true)
  assert.equal(verificarCodigoTotp(segredo, codigoAnterior, agora, 0).valido, false)
})

test('códigos de recuperação são aleatórios, resumidos e comparados em tempo constante', () => {
  const codigos = gerarCodigosRecuperacao()
  assert.equal(codigos.length, 10)
  assert.equal(new Set(codigos).size, 10)
  for (const codigo of codigos) assert.match(codigo, /^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){3}$/)

  const segredoServidor = randomBytes(32)
  const resumo = resumirCodigoRecuperacao(codigos[0], segredoServidor)
  assert.equal(codigoRecuperacaoConfere(codigos[0], resumo, segredoServidor), true)
  assert.equal(codigoRecuperacaoConfere(codigos[1], resumo, segredoServidor), false)
})

import assert from 'node:assert/strict'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, test } from 'node:test'
import { ArmazenamentoCifrado, ErroArmazenamento } from '../src/backend/infraestrutura/banco/conexao'
import type { CofreSistema } from '../src/backend/infraestrutura/seguranca/CofreSistema'

class CofreFalso {
  constructor(private readonly ativo = true) {}

  disponivel(): boolean {
    return this.ativo
  }

  cifrar(texto: string): string {
    if (!this.ativo) throw new Error('indisponível')
    return `TESTE:${texto}`
  }

  decifrar(texto: string): string | null {
    return this.ativo && texto.startsWith('TESTE:') ? texto.slice(6) : null
  }
}

const temporarios: string[] = []

function preparar(): { pasta: string; caminho: string; cofre: CofreSistema } {
  const pasta = mkdtempSync(join(tmpdir(), 'oikonomia-'))
  temporarios.push(pasta)
  return {
    pasta,
    caminho: join(pasta, 'financeiro.db'),
    cofre: new CofreFalso() as unknown as CofreSistema
  }
}

afterEach(() => {
  for (const pasta of temporarios.splice(0)) rmSync(pasta, { recursive: true, force: true })
})

test('primeiro uso cria somente banco cifrado e chave protegida', () => {
  const { caminho, cofre } = preparar()
  const armazenamento = new ArmazenamentoCifrado(caminho, cofre)

  assert.equal(readFileSync(caminho).subarray(0, 8).toString(), 'PFCIFRA1')
  assert.equal(existsSync(`${caminho}.chave`), true)
  assert.notEqual(readFileSync(caminho).subarray(0, 16).toString(), 'SQLite format 3\0')
  assert.equal(
    (armazenamento.banco.prepare('SELECT modo FROM sincronizacao_configuracao WHERE id = 1').get() as { modo: string }).modo,
    'local'
  )
  armazenamento.fechar()
})

test('reabre um banco cifrado válido com os dados persistidos', async () => {
  const { caminho, cofre } = preparar()
  const primeiro = new ArmazenamentoCifrado(caminho, cofre)
  await primeiro.executarAtomico(async () => {
    primeiro.banco.exec('CREATE TABLE teste (valor TEXT NOT NULL); INSERT INTO teste VALUES (\'persistido\')')
  })
  primeiro.fechar()

  const segundo = new ArmazenamentoCifrado(caminho, cofre)
  const linha = segundo.banco.prepare('SELECT valor FROM teste').get() as { valor: string }
  assert.equal(linha.valor, 'persistido')
  segundo.fechar()
})

test('cofre indisponível falha fechado sem criar arquivos', () => {
  const { caminho } = preparar()
  const cofre = new CofreFalso(false) as unknown as CofreSistema

  assert.throws(() => new ArmazenamentoCifrado(caminho, cofre), ErroArmazenamento)
  assert.equal(existsSync(caminho), false)
  assert.equal(existsSync(`${caminho}.chave`), false)
})

test('chave ausente ou inválida nunca gera uma substituta para dados existentes', () => {
  const ausente = preparar()
  const armazenamento = new ArmazenamentoCifrado(ausente.caminho, ausente.cofre)
  armazenamento.fechar()
  const conteudo = readFileSync(ausente.caminho)
  rmSync(`${ausente.caminho}.chave`)
  assert.throws(() => new ArmazenamentoCifrado(ausente.caminho, ausente.cofre), /chave.*sumiu/i)
  assert.deepEqual(readFileSync(ausente.caminho), conteudo)
  assert.equal(existsSync(`${ausente.caminho}.chave`), false)

  const invalida = preparar()
  const outro = new ArmazenamentoCifrado(invalida.caminho, invalida.cofre)
  outro.fechar()
  writeFileSync(`${invalida.caminho}.chave`, 'conteudo-invalido')
  assert.throws(() => new ArmazenamentoCifrado(invalida.caminho, invalida.cofre), /chave.*não pôde/i)
})

test('arquivo cifrado corrompido é rejeitado pela autenticação AES-GCM', () => {
  const { caminho, cofre } = preparar()
  const armazenamento = new ArmazenamentoCifrado(caminho, cofre)
  armazenamento.fechar()
  const corrompido = readFileSync(caminho)
  corrompido[corrompido.length - 1] ^= 0xff
  writeFileSync(caminho, corrompido)

  assert.throws(() => new ArmazenamentoCifrado(caminho, cofre), /corrompidos|integridade/i)
})

test('migração cifra o banco legado sem deixar cópia em texto claro', () => {
  const { caminho, cofre } = preparar()
  const legado = new DatabaseSync(caminho)
  legado.exec('CREATE TABLE legado (valor TEXT NOT NULL); INSERT INTO legado VALUES (\'original\')')
  legado.close()

  const armazenamento = new ArmazenamentoCifrado(caminho, cofre)
  assert.equal(readFileSync(caminho).subarray(0, 8).toString(), 'PFCIFRA1')
  assert.equal(existsSync(`${caminho}.sem-criptografia`), false)
  assert.equal((armazenamento.banco.prepare('SELECT valor FROM legado').get() as { valor: string }).valor, 'original')
  armazenamento.fechar()
})

test('falha durante a migração mantém o banco legado original intacto', () => {
  const { caminho, cofre } = preparar()
  const legado = new DatabaseSync(caminho)
  legado.exec('CREATE TABLE legado (valor TEXT NOT NULL); INSERT INTO legado VALUES (\'intacto\')')
  legado.close()
  writeFileSync(`${caminho}.chave`, `TESTE:${Buffer.alloc(32, 1).toString('base64')}`)
  mkdirSync(`${caminho}.gravando`)

  assert.throws(() => new ArmazenamentoCifrado(caminho, cofre), ErroArmazenamento)
  assert.equal(readFileSync(caminho).subarray(0, 16).toString(), 'SQLite format 3\0')
  const original = new DatabaseSync(caminho, { readOnly: true })
  assert.equal((original.prepare('SELECT valor FROM legado').get() as { valor: string }).valor, 'intacto')
  original.close()
})

test('falha de escrita reverte a memória e não confirma a alteração', async () => {
  const { caminho, cofre } = preparar()
  const armazenamento = new ArmazenamentoCifrado(caminho, cofre)
  await armazenamento.executarAtomico(async () =>
    armazenamento.banco.exec('CREATE TABLE falha (id INTEGER); INSERT INTO falha VALUES (0)')
  )

  mkdirSync(`${caminho}.gravando`)
  await assert.rejects(
    armazenamento.executarAtomico(async () => armazenamento.banco.exec('INSERT INTO falha VALUES (1)')),
    ErroArmazenamento
  )
  assert.equal((armazenamento.banco.prepare('SELECT COUNT(*) AS n FROM falha').get() as { n: number }).n, 1)

  rmSync(`${caminho}.gravando`, { recursive: true, force: true })
  armazenamento.fechar()
  const reaberto = new ArmazenamentoCifrado(caminho, cofre)
  assert.equal((reaberto.banco.prepare('SELECT COUNT(*) AS n FROM falha').get() as { n: number }).n, 1)
  reaberto.fechar()
})

test('reinicialização promove uma gravação temporária íntegra mais nova', async () => {
  const { caminho, cofre } = preparar()
  const primeiro = new ArmazenamentoCifrado(caminho, cofre)
  await primeiro.executarAtomico(async () => {
    primeiro.banco.exec('CREATE TABLE reinicio (id INTEGER); INSERT INTO reinicio VALUES (1)')
  })
  primeiro.fechar()

  const segundo = new ArmazenamentoCifrado(caminho, cofre)
  await segundo.executarAtomico(async () => segundo.banco.exec('INSERT INTO reinicio VALUES (2)'))
  segundo.fechar()

  copyFileSync(caminho, `${caminho}.gravando`)
  copyFileSync(`${caminho}.anterior`, caminho)
  const futuro = new Date(Date.now() + 2_000)
  utimesSync(`${caminho}.gravando`, futuro, futuro)

  const recuperado = new ArmazenamentoCifrado(caminho, cofre)
  assert.equal((recuperado.banco.prepare('SELECT COUNT(*) AS n FROM reinicio').get() as { n: number }).n, 2)
  recuperado.fechar()
})

test('operações concorrentes são serializadas e o fechamento aguarda a última gravação', async () => {
  const { caminho, cofre } = preparar()
  const armazenamento = new ArmazenamentoCifrado(caminho, cofre)
  armazenamento.banco.exec('CREATE TABLE fila (id INTEGER)')
  armazenamento.persistir()
  const ordem: string[] = []
  let liberar!: () => void
  const espera = new Promise<void>((resolver) => (liberar = resolver))

  const primeira = armazenamento.executarAtomico(async () => {
    ordem.push('primeira-inicio')
    await espera
    armazenamento.banco.exec('INSERT INTO fila VALUES (1)')
    ordem.push('primeira-fim')
  })
  const segunda = armazenamento.executarAtomico(async () => {
    ordem.push('segunda')
    armazenamento.banco.exec('INSERT INTO fila VALUES (2)')
  })
  const fechamento = armazenamento.fecharQuandoDisponivel()
  await new Promise<void>((resolver) => setImmediate(resolver))
  assert.deepEqual(ordem, ['primeira-inicio'])
  assert.equal(armazenamento.banco.isOpen, true)

  liberar()
  await Promise.all([primeira, segunda, fechamento])
  assert.deepEqual(ordem, ['primeira-inicio', 'primeira-fim', 'segunda'])
  assert.equal(armazenamento.banco.isOpen, false)
})

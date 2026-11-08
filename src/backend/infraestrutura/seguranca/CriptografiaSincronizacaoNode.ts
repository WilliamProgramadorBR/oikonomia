import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'node:crypto'
import type { ICriptografiaSincronizacao } from '../../dominio/portas/ICriptografiaSincronizacao'

const AAD_CHAVE = Buffer.from('OIKONOMIA-SYNC-KEY-v1')
const CUSTO_N = 2 ** 16
const BLOCO_R = 8
const PARALELISMO_P = 1
const MEMORIA_MAXIMA = 128 * 1024 * 1024
const TAMANHO_CHAVE = 32

interface EnvelopeChaveV1 {
  versao: 1
  kdf: 'scrypt'
  custoN: number
  blocoR: number
  paralelismoP: number
  sal: string
  iv: string
  tag: string
  chaveCifrada: string
}

interface EnvelopeConteudoV1 {
  versao: 1
  algoritmo: 'aes-256-gcm'
  iv: string
  tag: string
  conteudo: string
}

function base64Estrito(valor: unknown, tamanho?: number): Buffer {
  if (typeof valor !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(valor)) throw new Error('Base64 inválido.')
  const buffer = Buffer.from(valor, 'base64')
  if (buffer.toString('base64') !== valor || (tamanho !== undefined && buffer.length !== tamanho)) {
    throw new Error('Tamanho criptográfico inválido.')
  }
  return buffer
}

function derivarChave(fraseSecreta: string, sal: Buffer): Promise<Buffer> {
  return new Promise((resolver, rejeitar) => {
    scrypt(
      Buffer.from(fraseSecreta.normalize('NFKC'), 'utf8'),
      sal,
      TAMANHO_CHAVE,
      { N: CUSTO_N, r: BLOCO_R, p: PARALELISMO_P, maxmem: MEMORIA_MAXIMA },
      (erro, chave) => (erro ? rejeitar(erro) : resolver(chave as Buffer))
    )
  })
}

export class CriptografiaSincronizacaoNode implements ICriptografiaSincronizacao {
  async criar(fraseSecreta: string): Promise<{ envelope: string; chaveDados: Uint8Array }> {
    const chaveDados = randomBytes(TAMANHO_CHAVE)
    try {
      return { envelope: await this.protegerChave(chaveDados, fraseSecreta), chaveDados }
    } catch (erro) {
      chaveDados.fill(0)
      throw erro
    }
  }

  async abrir(fraseSecreta: string, envelopeTexto: string): Promise<Uint8Array> {
    let envelope: EnvelopeChaveV1
    try {
      envelope = JSON.parse(envelopeTexto) as EnvelopeChaveV1
      if (
        envelope.versao !== 1 ||
        envelope.kdf !== 'scrypt' ||
        envelope.custoN !== CUSTO_N ||
        envelope.blocoR !== BLOCO_R ||
        envelope.paralelismoP !== PARALELISMO_P
      ) {
        throw new Error('Envelope incompatível.')
      }
      const sal = base64Estrito(envelope.sal, 16)
      const iv = base64Estrito(envelope.iv, 12)
      const tag = base64Estrito(envelope.tag, 16)
      const chaveCifrada = base64Estrito(envelope.chaveCifrada, TAMANHO_CHAVE)
      const chaveFrase = await derivarChave(fraseSecreta, sal)
      try {
        const decifra = createDecipheriv('aes-256-gcm', chaveFrase, iv)
        decifra.setAAD(AAD_CHAVE)
        decifra.setAuthTag(tag)
        const chaveDados = Buffer.concat([decifra.update(chaveCifrada), decifra.final()])
        if (chaveDados.length !== TAMANHO_CHAVE) throw new Error('Chave de dados inválida.')
        return chaveDados
      } finally {
        chaveFrase.fill(0)
      }
    } catch {
      throw new Error('Não foi possível abrir o cofre de sincronização.')
    }
  }

  reproteger(chaveDados: Uint8Array, fraseNova: string): Promise<string> {
    return this.protegerChave(chaveDados, fraseNova)
  }

  cifrar(chaveDados: Uint8Array, conteudo: Uint8Array, contexto: string): string {
    const iv = randomBytes(12)
    const cifra = createCipheriv('aes-256-gcm', Buffer.from(chaveDados), iv)
    cifra.setAAD(this.aadConteudo(contexto))
    const cifrado = Buffer.concat([cifra.update(conteudo), cifra.final()])
    const envelope: EnvelopeConteudoV1 = {
      versao: 1,
      algoritmo: 'aes-256-gcm',
      iv: iv.toString('base64'),
      tag: cifra.getAuthTag().toString('base64'),
      conteudo: cifrado.toString('base64')
    }
    return JSON.stringify(envelope)
  }

  decifrar(chaveDados: Uint8Array, envelopeTexto: string, contexto: string): Uint8Array {
    try {
      const envelope = JSON.parse(envelopeTexto) as EnvelopeConteudoV1
      if (envelope.versao !== 1 || envelope.algoritmo !== 'aes-256-gcm') throw new Error('Envelope incompatível.')
      const decifra = createDecipheriv('aes-256-gcm', Buffer.from(chaveDados), base64Estrito(envelope.iv, 12))
      decifra.setAAD(this.aadConteudo(contexto))
      decifra.setAuthTag(base64Estrito(envelope.tag, 16))
      return Buffer.concat([decifra.update(base64Estrito(envelope.conteudo)), decifra.final()])
    } catch {
      throw new Error('O conteúdo sincronizado é inválido ou foi alterado.')
    }
  }

  limpar(chaveDados: Uint8Array): void {
    chaveDados.fill(0)
  }

  private async protegerChave(chaveDados: Uint8Array, fraseSecreta: string): Promise<string> {
    const sal = randomBytes(16)
    const iv = randomBytes(12)
    const chaveFrase = await derivarChave(fraseSecreta, sal)
    try {
      const cifra = createCipheriv('aes-256-gcm', chaveFrase, iv)
      cifra.setAAD(AAD_CHAVE)
      const chaveCifrada = Buffer.concat([cifra.update(chaveDados), cifra.final()])
      const envelope: EnvelopeChaveV1 = {
        versao: 1,
        kdf: 'scrypt',
        custoN: CUSTO_N,
        blocoR: BLOCO_R,
        paralelismoP: PARALELISMO_P,
        sal: sal.toString('base64'),
        iv: iv.toString('base64'),
        tag: cifra.getAuthTag().toString('base64'),
        chaveCifrada: chaveCifrada.toString('base64')
      }
      return JSON.stringify(envelope)
    } finally {
      chaveFrase.fill(0)
    }
  }

  private aadConteudo(contexto: string): Buffer {
    return Buffer.from(`OIKONOMIA-SYNC-DATA-v1:${contexto.normalize('NFKC')}`, 'utf8')
  }
}

import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const ALFABETO_RECUPERACAO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export interface OpcoesTotp {
  digitos?: number
  periodoSegundos?: number
}

export function codificarBase32(dados: Uint8Array): string {
  let acumulador = 0
  let bits = 0
  let saida = ''
  for (const byte of dados) {
    acumulador = (acumulador << 8) | byte
    bits += 8
    while (bits >= 5) {
      saida += BASE32[(acumulador >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) saida += BASE32[(acumulador << (5 - bits)) & 31]
  return saida
}

export function decodificarBase32(texto: string): Buffer {
  const limpo = texto.toUpperCase().replace(/[\s=-]/g, '')
  if (!limpo || [...limpo].some((caractere) => !BASE32.includes(caractere))) {
    throw new Error('Segredo TOTP inválido.')
  }
  let acumulador = 0
  let bits = 0
  const bytes: number[] = []
  for (const caractere of limpo) {
    acumulador = (acumulador << 5) | BASE32.indexOf(caractere)
    bits += 5
    if (bits >= 8) {
      bytes.push((acumulador >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

export function gerarSegredoTotp(): string {
  return codificarBase32(randomBytes(20))
}

export function gerarCodigoTotp(
  segredo: Uint8Array,
  instanteSegundos = Math.floor(Date.now() / 1000),
  { digitos = 6, periodoSegundos = 30 }: OpcoesTotp = {}
): string {
  if (!Number.isInteger(digitos) || digitos < 6 || digitos > 10) throw new Error('Quantidade de dígitos TOTP inválida.')
  if (!Number.isInteger(periodoSegundos) || periodoSegundos < 15) throw new Error('Período TOTP inválido.')
  const passo = BigInt(Math.floor(instanteSegundos / periodoSegundos))
  const contador = Buffer.alloc(8)
  contador.writeBigUInt64BE(passo)
  const resumo = createHmac('sha1', Buffer.from(segredo)).update(contador).digest()
  const deslocamento = resumo[resumo.length - 1] & 0x0f
  const numero =
    (((resumo[deslocamento] & 0x7f) << 24) |
      (resumo[deslocamento + 1] << 16) |
      (resumo[deslocamento + 2] << 8) |
      resumo[deslocamento + 3]) >>>
    0
  return String(numero % 10 ** digitos).padStart(digitos, '0')
}

export function verificarCodigoTotp(
  segredo: Uint8Array,
  codigo: string,
  instanteSegundos = Math.floor(Date.now() / 1000),
  janela = 1,
  opcoes: OpcoesTotp = {}
): { valido: boolean; passo: number | null } {
  const digitos = opcoes.digitos ?? 6
  if (!new RegExp(`^\\d{${digitos}}$`).test(codigo) || !Number.isInteger(janela) || janela < 0 || janela > 2) {
    return { valido: false, passo: null }
  }
  const periodo = opcoes.periodoSegundos ?? 30
  const recebido = Buffer.from(codigo)
  for (let deslocamento = -janela; deslocamento <= janela; deslocamento++) {
    const instante = instanteSegundos + deslocamento * periodo
    const esperado = Buffer.from(gerarCodigoTotp(segredo, instante, opcoes))
    if (recebido.length === esperado.length && timingSafeEqual(recebido, esperado)) {
      return { valido: true, passo: Math.floor(instante / periodo) }
    }
  }
  return { valido: false, passo: null }
}

export function criarUriTotp(segredoBase32: string, email: string, emissor = 'Oikonomia'): string {
  const conta = `${emissor}:${email.trim().toLowerCase()}`
  const parametros = new URLSearchParams({
    secret: segredoBase32,
    issuer: emissor,
    algorithm: 'SHA1',
    digits: '6',
    period: '30'
  })
  return `otpauth://totp/${encodeURIComponent(conta)}?${parametros.toString()}`
}

export function gerarCodigosRecuperacao(quantidade = 10): string[] {
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 20) throw new Error('Quantidade inválida.')
  return Array.from({ length: quantidade }, () => {
    const caracteres = Array.from(
      { length: 16 },
      () => ALFABETO_RECUPERACAO[randomInt(0, ALFABETO_RECUPERACAO.length)]
    ).join('')
    return caracteres.match(/.{4}/g)!.join('-')
  })
}

export function resumirCodigoRecuperacao(codigo: string, segredoServidor: Uint8Array): Buffer {
  const normalizado = codigo.toUpperCase().replace(/[^A-Z2-9]/g, '')
  return createHmac('sha256', Buffer.from(segredoServidor)).update(normalizado).digest()
}

export function codigoRecuperacaoConfere(
  codigo: string,
  resumoEsperado: Uint8Array,
  segredoServidor: Uint8Array
): boolean {
  const obtido = resumirCodigoRecuperacao(codigo, segredoServidor)
  const esperado = Buffer.from(resumoEsperado)
  return obtido.length === esperado.length && timingSafeEqual(obtido, esperado)
}

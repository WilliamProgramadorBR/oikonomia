import { ErroDominio } from '../erros/ErroDominio'

// Leitura de extratos bancários exportados pelos bancos: OFX (padrão de quase todos) e CSV
// (formatos variam: Nubank usa "Data,Valor,Identificador,Descrição"; outros usam ";" e vírgula decimal).

export interface LinhaExtrato {
  idOriginal: string | null // FITID do OFX ou identificador do CSV, quando existe
  data: string // AAAA-MM-DD
  valorCentavos: number // positivo = entrou, negativo = saiu
  descricao: string
}

export interface ExtratoLido {
  formato: 'ofx' | 'csv'
  linhas: LinhaExtrato[]
  saldoFinal: { valorCentavos: number; data: string } | null
}

// Bytes do arquivo → texto: UTF-8, com recaída para Windows-1252 (comum em OFX de bancos brasileiros).
export function decodificarArquivo(bytes: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8').decode(bytes)
  if (!utf8.includes('�')) return utf8.replace(/^﻿/, '')
  return new TextDecoder('windows-1252').decode(bytes)
}

export function lerExtrato(texto: string): ExtratoLido {
  const extrato = /<OFX>|OFXHEADER/i.test(texto) ? lerOfx(texto) : lerCsv(texto)
  if (extrato.linhas.length === 0) {
    throw new ErroDominio('Não encontrei lançamentos no arquivo. Use o extrato em OFX ou CSV exportado pelo banco.')
  }
  return extrato
}

// "-1.234,56", "1234.56", "R$ 85,90", "(45,00)", "120,00 D" → centavos com sinal.
export function lerValor(bruto: string): number | null {
  let texto = bruto.trim().replace(/r\$|\s/gi, '')
  if (!texto) return null
  let sinal = 1
  if (/^\(.*\)$/.test(texto)) {
    sinal = -1
    texto = texto.slice(1, -1)
  }
  if (/d$/i.test(texto)) {
    sinal = -1
    texto = texto.slice(0, -1)
  } else if (/c$/i.test(texto)) texto = texto.slice(0, -1)
  if (texto.startsWith('-')) {
    sinal *= -1
    texto = texto.slice(1)
  } else if (texto.startsWith('+')) texto = texto.slice(1)
  if (!/^[\d.,]+$/.test(texto)) return null

  // O último separador com 1 ou 2 dígitos depois é o decimal; os outros são milhar.
  const decimal = texto.match(/[.,](\d{1,2})$/)
  const inteiro = decimal ? texto.slice(0, -decimal[0].length) : texto
  const reais = Number(inteiro.replace(/[.,]/g, '') || '0')
  const centavos = decimal ? Number(decimal[1].padEnd(2, '0')) : 0
  if (!Number.isFinite(reais)) return null
  return sinal * (reais * 100 + centavos)
}

// "02/11/2026", "2/11/26", "2026-11-02", "20261102120000[-3:BRT]" → "2026-11-02"
export function lerData(bruto: string): string | null {
  const texto = bruto.trim()
  let m = texto.match(/^(\d{4})(\d{2})(\d{2})/)
  if (m) return validar(`${m[1]}-${m[2]}-${m[3]}`)
  m = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return validar(`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`)
  m = texto.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (m) {
    const ano = m[3].length === 2 ? `20${m[3]}` : m[3]
    return validar(`${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`)
  }
  return null
}

function validar(iso: string): string | null {
  const data = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== iso ? null : iso
}

// ===== OFX (SGML da versão 1.x ou XML da 2.x) =====

function campo(bloco: string, tag: string): string | null {
  const m = bloco.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'))
  return m ? m[1].trim() : null
}

function lerOfx(texto: string): ExtratoLido {
  const linhas: LinhaExtrato[] = []
  const blocos = texto.split(/<STMTTRN>/i).slice(1)
  for (const bruto of blocos) {
    const bloco = bruto.split(/<\/STMTTRN>/i)[0]
    const data = lerData(campo(bloco, 'DTPOSTED') ?? '')
    const valor = lerValor(campo(bloco, 'TRNAMT') ?? '')
    if (!data || valor === null || valor === 0) continue
    const memo = campo(bloco, 'MEMO')
    const nome = campo(bloco, 'NAME')
    const descricao = [nome, memo].filter((t, i, lista) => t && lista.indexOf(t) === i).join(' - ') || 'Lançamento'
    linhas.push({ idOriginal: campo(bloco, 'FITID'), data, valorCentavos: valor, descricao: limparEntidades(descricao) })
  }

  const saldoBloco = texto.match(/<LEDGERBAL>([\s\S]*?)(<\/LEDGERBAL>|<AVAILBAL>|<\/STMTRS>)/i)?.[1]
  const saldoValor = saldoBloco ? lerValor(campo(saldoBloco, 'BALAMT') ?? '') : null
  const saldoData = saldoBloco ? lerData(campo(saldoBloco, 'DTASOF') ?? '') : null
  return {
    formato: 'ofx',
    linhas,
    saldoFinal: saldoValor !== null && saldoData ? { valorCentavos: saldoValor, data: saldoData } : null
  }
}

const limparEntidades = (texto: string) =>
  texto.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()

// ===== CSV =====

function dividirLinha(linha: string, separador: string): string[] {
  const celulas: string[] = []
  let atual = ''
  let aspas = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') {
        atual += '"'
        i++
      } else aspas = !aspas
    } else if (c === separador && !aspas) {
      celulas.push(atual.trim())
      atual = ''
    } else atual += c
  }
  celulas.push(atual.trim())
  return celulas
}

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

interface Colunas {
  data: number
  descricao: number
  valor: number
  credito: number
  debito: number
  saldo: number
  id: number
}

function acharColunas(cabecalho: string[]): Colunas | null {
  const nomes = cabecalho.map(normalizar)
  const achar = (re: RegExp, excluir?: RegExp) => nomes.findIndex((n) => re.test(n) && !(excluir && excluir.test(n)))
  const colunas: Colunas = {
    data: achar(/^(data|date|dt)\b|data (lancamento|movimento)/),
    id: achar(/identificador|^id$|codigo|documento|^doc/),
    descricao: achar(/descri|histor|memo|title|titulo|estabelecimento|lancamento$|detalhe/, /^data/),
    valor: achar(/^(valor|amount|value|quantia)\b|valor \(r\$\)/),
    credito: achar(/credito|entrada/),
    debito: achar(/debito|saida/),
    saldo: achar(/^saldo/)
  }
  if (colunas.data < 0 || (colunas.valor < 0 && colunas.credito < 0 && colunas.debito < 0)) return null
  return colunas
}

function lerCsv(texto: string): ExtratoLido {
  const linhasTexto = texto.split(/\r?\n/).filter((l) => l.trim())
  if (linhasTexto.length < 2) throw new ErroDominio('O arquivo CSV está vazio.')
  const amostra = linhasTexto.slice(0, 5).join('\n')
  const separador = [';', '\t', ','].sort((a, b) => amostra.split(b).length - amostra.split(a).length)[0]

  // O cabeçalho nem sempre é a primeira linha (alguns bancos põem nome e período antes).
  let inicio = -1
  let colunas: Colunas | null = null
  for (let i = 0; i < Math.min(15, linhasTexto.length); i++) {
    colunas = acharColunas(dividirLinha(linhasTexto[i], separador))
    if (colunas) {
      inicio = i + 1
      break
    }
  }
  if (!colunas) throw new ErroDominio('Não reconheci as colunas do CSV (preciso de data e valor).')

  const linhas: LinhaExtrato[] = []
  let saldoFinal: ExtratoLido['saldoFinal'] = null
  for (const bruta of linhasTexto.slice(inicio)) {
    const c = dividirLinha(bruta, separador)
    const data = lerData(c[colunas.data] ?? '')
    if (!data) continue
    let valor: number | null = null
    if (colunas.valor >= 0) valor = lerValor(c[colunas.valor] ?? '')
    else {
      const credito = colunas.credito >= 0 ? (lerValor(c[colunas.credito] ?? '') ?? 0) : 0
      const debito = colunas.debito >= 0 ? (lerValor(c[colunas.debito] ?? '') ?? 0) : 0
      valor = Math.abs(credito) - Math.abs(debito)
    }
    if (valor === null || valor === 0) continue
    const descricao = (colunas.descricao >= 0 ? c[colunas.descricao] : '') || 'Lançamento'
    linhas.push({ idOriginal: colunas.id >= 0 ? c[colunas.id] || null : null, data, valorCentavos: valor, descricao: descricao.replace(/\s+/g, ' ').trim() })

    if (colunas.saldo >= 0) {
      const saldo = lerValor(c[colunas.saldo] ?? '')
      if (saldo !== null && (!saldoFinal || data >= saldoFinal.data)) saldoFinal = { valorCentavos: saldo, data }
    }
  }
  return { formato: 'csv', linhas, saldoFinal }
}

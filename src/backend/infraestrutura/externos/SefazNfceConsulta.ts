import type { IConsultaNfce, NotaFiscal, PaginaNfce } from '../../dominio/portas/IConsultaNfce'

const TEMPO_LIMITE_MS = 20_000
const LIMITE_TEXTO = 15_000

// Consulta a página pública da NFC-e (endereço do QR code) e tenta ler o layout padrão usado pela
// maioria das SEFAZ (classes txtTopo, txtTit, Rqtd, valor, totalNumb). Estados com layout próprio
// ou com captcha caem nas próximas tentativas (IA ou dados da chave).
export class SefazNfceConsulta implements IConsultaNfce {
  async consultar(url: string): Promise<PaginaNfce> {
    if (!/^https?:\/\//i.test(url)) throw new Error('Endereço do QR code inválido.')

    const resposta = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS)
    })
    if (!resposta.ok) throw new Error(`A SEFAZ respondeu ${resposta.status}.`)
    const html = await resposta.text()

    return { nota: lerLayoutPadrao(html), texto: paraTexto(html).slice(0, LIMITE_TEXTO) }
  }
}

const decodificar = (texto: string) =>
  texto
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()

const semTags = (html: string) => decodificar(html.replace(/<[^>]+>/g, ' '))

function paraTexto(html: string): string {
  return semTags(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' '))
}

// "1.234,56" -> 123456
const centavos = (valor: string) => Math.round(Number(valor.replace(/[^\d,]/g, '').replace(',', '.')) * 100)

export function lerLayoutPadrao(html: string): NotaFiscal | null {
  const total = /class="[^"]*totalNumb[^"]*txtMax[^"]*"[^>]*>([\d.,]+)</.exec(html)?.[1]
    ?? /Valor a pagar[^<]*<\/label>\s*<span[^>]*>([\d.,]+)</i.exec(html)?.[1]
  if (!total) return null

  const itens: NotaFiscal['itens'] = []
  const blocos = html.split(/<tr[^>]*id="Item/i).slice(1)
  for (const bloco of blocos) {
    const descricao = /class="txtTit[^"]*"[^>]*>([^<]+)</.exec(bloco)?.[1]
    const valor = /class="valor"[^>]*>([\d.,]+)</.exec(bloco)?.[1]
    const quantidade = /class="Rqtd"[^>]*>[\s\S]*?<\/strong>\s*([\d.,]+)/.exec(bloco)?.[1]
    if (descricao && valor) {
      itens.push({
        descricao: decodificar(descricao),
        quantidade: quantidade ? Number(quantidade.replace(',', '.')) : 1,
        valorCentavos: centavos(valor)
      })
    }
  }

  const emitente = /class="txtTopo"[^>]*>([^<]+)</.exec(html)?.[1]
  const cnpj = /CNPJ:?\s*([\d./-]{14,18})/.exec(semTags(html))?.[1]?.replace(/\D/g, '')
  const emissao = /Emiss[ãa]o:?\s*(?:<\/strong>)?\s*(\d{2})\/(\d{2})\/(\d{4})/i.exec(html)

  return {
    emitente: emitente ? decodificar(emitente) : null,
    cnpj: cnpj ?? null,
    data: emissao ? `${emissao[3]}-${emissao[2]}-${emissao[1]}` : null,
    totalCentavos: centavos(total),
    itens
  }
}

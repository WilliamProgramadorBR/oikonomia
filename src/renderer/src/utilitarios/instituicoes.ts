// Os nomes no Banco Central vêm em caixa alta e abreviados ("BCO DO BRASIL S.A.").
// Aqui deixamos legíveis e permitimos buscar por apelidos comuns ("nubank", "itaú").

const SUFIXOS = /\s+(S\.?\/?A\.?|SCFI|CFI|S\.A\. CFI|LTDA\.?)$/i

const capitalizar = (palavra: string) =>
  palavra.length <= 2 && palavra !== 'do' && palavra !== 'de' && palavra !== 'da'
    ? palavra.toUpperCase()
    : palavra.charAt(0).toUpperCase() + palavra.slice(1)

// "BCO DO BRASIL S.A." -> "Banco do Brasil"
export function nomeInstituicao(nome: string): string {
  let limpo = nome.trim()
  while (SUFIXOS.test(limpo)) limpo = limpo.replace(SUFIXOS, '')
  return limpo
    .toLowerCase()
    .replace(/^bco\b/, 'banco')
    .replace(/^fin\.\s*/, '')
    .split(/\s+/)
    .map((p, i) => (i > 0 && ['do', 'de', 'da', 'e'].includes(p) ? p : capitalizar(p)))
    .join(' ')
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\bbanco\b/g, 'bco')
    .replace(/\bnubank\b/g, 'nu ')
    .trim()

export function correspondeBusca(instituicao: string, busca: string): boolean {
  const termo = normalizar(busca)
  return !termo || normalizar(instituicao).includes(termo)
}

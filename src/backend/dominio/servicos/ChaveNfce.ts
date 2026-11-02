// A chave de acesso da NFC-e (44 dígitos) já traz informações úteis mesmo sem consultar a SEFAZ:
// cUF(2) AAMM(4) CNPJ(14) modelo(2) série(3) número(9) tipoEmissão(1) código(8) DV(1).

export interface DadosChave {
  chave: string
  anoMes: string // AAAA-MM da emissão
  cnpj: string
  modelo: string // 65 = NFC-e
  numero: string
}

export function extrairChave(texto: string): string | null {
  const parametro = /[?&]p=(\d{44})/.exec(texto)
  if (parametro) return parametro[1]
  return /\d{44}/.exec(texto.replace(/\s/g, ''))?.[0] ?? null
}

export function interpretarChave(chave: string): DadosChave | null {
  if (!/^\d{44}$/.test(chave)) return null
  return {
    chave,
    anoMes: `20${chave.slice(2, 4)}-${chave.slice(4, 6)}`,
    cnpj: chave.slice(6, 20),
    modelo: chave.slice(20, 22),
    numero: chave.slice(25, 34).replace(/^0+/, '')
  }
}

export const formatarCnpj = (cnpj: string) =>
  cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')

// Utilitários de mês no formato 'AAAA-MM' e datas 'AAAA-MM-DD'. Funções puras, usadas no front e no back.

const doisDigitos = (n: number) => String(n).padStart(2, '0')

export function hojeISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`
}

export function mesAtual(): string {
  return hojeISO().slice(0, 7)
}

export function deslocarMes(mes: string, delta: number): string {
  const [ano, numero] = mes.split('-').map(Number)
  return new Date(Date.UTC(ano, numero - 1 + delta, 1)).toISOString().slice(0, 7)
}

export function intervaloDoMes(mes: string): { inicio: string; fim: string } {
  const [ano, numero] = mes.split('-').map(Number)
  const ultimoDia = new Date(Date.UTC(ano, numero, 0)).getUTCDate()
  return { inicio: `${mes}-01`, fim: `${mes}-${doisDigitos(ultimoDia)}` }
}

// Os `quantidade` meses terminando em `mes`, em ordem crescente.
export function ultimosMeses(mes: string, quantidade: number): string[] {
  return Array.from({ length: quantidade }, (_, i) => deslocarMes(mes, i - quantidade + 1))
}

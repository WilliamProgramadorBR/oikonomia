// Simula a quitação de várias dívidas ao mesmo tempo, mês a mês.
// Avalanche: o dinheiro extra vai para a dívida de MAIOR juro (economiza mais).
// Bola de neve: vai para a de MENOR saldo (quita uma logo, motiva a seguir).
// Quando uma dívida termina, a parcela dela passa a reforçar a próxima ("efeito bola de neve").

const LIMITE_MESES = 600

export type Metodo = 'minimo' | 'avalanche' | 'bola_de_neve'

export interface DividaParaQuitar {
  id: string
  saldo: number
  taxaMensal: number // fração
  parcela: number // pagamento mínimo mensal (0 = sem parcela fixa)
}

export interface ResultadoQuitacao {
  meses: number | null
  totalJuros: number | null // null = não quita: os juros crescem sem limite
  quitadaEm: Map<string, number | null> // mês (1, 2...) em que cada dívida zera
}

export function simularQuitacao(
  dividas: DividaParaQuitar[],
  extraMensal: number,
  metodo: Metodo
): ResultadoQuitacao {
  const saldos = new Map(dividas.map((d) => [d.id, d.saldo]))
  const quitadaEm = new Map<string, number | null>(dividas.map((d) => [d.id, d.saldo <= 0 ? 0 : null]))
  const ordem = [...dividas].sort((a, b) =>
    metodo === 'bola_de_neve' ? a.saldo - b.saldo : b.taxaMensal - a.taxaMensal
  )
  const extra = metodo === 'minimo' ? 0 : Math.max(0, extraMensal)
  let totalJuros = 0

  for (let mes = 1; mes <= LIMITE_MESES; mes++) {
    const abertas = dividas.filter((d) => saldos.get(d.id)! > 0)
    if (abertas.length === 0) return { meses: mes - 1, totalJuros: Math.round(totalJuros), quitadaEm }

    // Só restam dívidas sem parcela e não há dinheiro extra: nunca serão quitadas.
    const semPagamento =
      abertas.every((d) => d.parcela === 0) &&
      extra + dividas.filter((d) => quitadaEm.get(d.id) !== null).reduce((s, d) => s + d.parcela, 0) === 0
    if (semPagamento || metodo === 'minimo' && abertas.every((d) => d.parcela === 0)) break

    // Juros do mês
    for (const d of abertas) {
      const juros = saldos.get(d.id)! * d.taxaMensal
      totalJuros += juros
      saldos.set(d.id, saldos.get(d.id)! + juros)
    }

    // Disponível: extra + parcelas das que já terminaram (só nas estratégias com extra)
    let disponivel =
      extra + (metodo === 'minimo' ? 0 : dividas.filter((d) => quitadaEm.get(d.id) !== null).reduce((s, d) => s + d.parcela, 0))

    // Paga o mínimo de cada aberta
    for (const d of abertas) {
      const pagamento = Math.min(d.parcela, saldos.get(d.id)!)
      saldos.set(d.id, saldos.get(d.id)! - pagamento)
      disponivel += d.parcela - pagamento // sobra da última parcela volta para o bolo
    }

    // O resto vai na ordem da estratégia
    for (const d of ordem) {
      if (disponivel <= 0) break
      const saldo = saldos.get(d.id)!
      if (saldo <= 0) continue
      const pagamento = Math.min(disponivel, saldo)
      saldos.set(d.id, saldo - pagamento)
      disponivel -= pagamento
    }

    for (const d of dividas) {
      if (quitadaEm.get(d.id) === null && saldos.get(d.id)! <= 0.5) quitadaEm.set(d.id, mes)
    }
  }

  return { meses: null, totalJuros: null, quitadaEm }
}

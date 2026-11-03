// Regras usadas pelo Plano de aperto. Genéricas: valem para qualquer família num mês apertado.
export const REGRAS_APERTO: { id: string; texto: string }[] = [
  { id: 'R1', texto: 'Nunca pague o mínimo nem um valor parcial da fatura: o rotativo é o crédito mais caro do país. Ou paga inteira, ou parcela formalmente.' },
  { id: 'R2', texto: 'Compare as saídas pelo custo total (soma das parcelas − valor original), nunca pelo valor da parcela.' },
  { id: 'R3', texto: 'Escolha o menor número de parcelas que caiba no orçamento dos próximos meses.' },
  { id: 'R4', texto: 'Dimensione a solução pelo buraco de caixa do mês, não pela dívida total.' },
  { id: 'R5', texto: 'Tente primeiro o que custa zero: negociar a data com o credor, pedir adiantamento salarial.' },
  { id: 'R6', texto: 'No refinanciamento, custo real = total novo − saldo que você já pagaria − dinheiro recebido.' },
  { id: 'R7', texto: 'Não estenda uma dívida que está perto de acabar.' },
  { id: 'R8', texto: 'Não pegue mais do que precisa, mesmo que o banco ofereça.' },
  { id: 'R9', texto: 'Preserve o FGTS: ele é a sua proteção em caso de demissão.' },
  { id: 'R10', texto: 'Quite primeiro as dívidas de juros maiores (cartão) antes de antecipar empréstimos antigos.' },
  { id: 'R11', texto: 'Pix ou boleto no crédito empurram o gasto para a próxima fatura: útil para levar a conta ao mês com mais renda.' },
  { id: 'R12', texto: 'O parcelamento da fatura costuma cobrar a 1ª parcela na hora: ela entra no caixa deste mês.' }
]

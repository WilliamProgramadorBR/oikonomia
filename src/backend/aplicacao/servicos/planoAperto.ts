import type {
  AvisoOferta,
  MesAperto,
  MesBaseAperto,
  OfertaAperto,
  OfertaAvaliadaDTO,
  PassoAperto,
  PlanoApertoDTO,
  TipoOferta
} from '@compartilhado/dtos/aperto'
import { moeda, nomeMes } from './formatacao'

// Motor do Plano de aperto (regras R1–R12, em compartilhado/constantes/regrasAperto.ts).
// Puro: recebe os meses previstos e as ofertas, devolve diagnóstico, comparação e plano. Sem IA.

const ORDEM_NO_PLANO: Record<TipoOferta, number> = {
  custo_zero: 0,
  credito_no_cartao: 1,
  parcelar_fatura: 2,
  emprestimo: 3,
  refinanciamento: 4,
  antecipacao_fgts: 5
}
const ULTIMO_RECURSO = 0.5 // custo acima de 50% do valor
const MAXIMO_COMBINADAS = 14 // 2^14 combinações no pior caso: instantâneo

export interface EntradaPlanoAperto {
  meses: MesBaseAperto[] // o primeiro é o mês do aperto
  caixaExtraCentavos: number
  ofertas: OfertaAperto[]
  passosFeitos: Set<string>
}

export const totalPago = (o: OfertaAperto) => (o.tipo === 'custo_zero' ? o.valorCentavos : o.parcelas * o.parcelaCentavos)

// R2 e R6: o custo real é o que se paga a mais. No refinanciamento, desconta o saldo que já seria pago.
export const custoReal = (o: OfertaAperto) =>
  o.tipo === 'custo_zero' ? 0 : totalPago(o) - o.valorCentavos - (o.tipo === 'refinanciamento' ? o.saldoSubstituidoCentavos : 0)

// Efeito da oferta no caixa de cada mês (positivo = sobra mais). R12: parcela no mês 0 já sai agora.
export function efeitoPorMes(o: OfertaAperto, quantidade: number): number[] {
  const efeito = Array.from({ length: quantidade }, () => 0)
  efeito[0] += o.valorCentavos
  if (o.tipo === 'custo_zero') {
    if (quantidade > 1) efeito[1] -= o.valorCentavos // só muda a data: paga no mês seguinte
    return efeito
  }
  for (let k = 0; k < o.parcelas; k++) {
    const mes = o.primeiraParcelaEmMeses + k
    if (mes < quantidade) efeito[mes] -= o.parcelaCentavos
  }
  if (o.tipo === 'refinanciamento') {
    // A parcela antiga deixa de existir a partir do mês seguinte.
    for (let k = 1; k <= o.parcelasSubstituidasRestantes && k < quantidade; k++) efeito[k] += o.parcelaSubstituidaCentavos
  }
  return efeito
}

const ehUltimoRecurso = (o: OfertaAperto) => o.tipo !== 'custo_zero' && o.valorCentavos > 0 && custoReal(o) / o.valorCentavos > ULTIMO_RECURSO

const acumular = (saldos: number[], inicial: number) => {
  let caixa = inicial
  return saldos.map((s) => (caixa += s))
}

export function montarPlanoAperto({ meses, caixaExtraCentavos, ofertas, passosFeitos }: EntradaPlanoAperto): PlanoApertoDTO {
  const n = meses.length
  const saldos = meses.map((m) => m.receitas - m.despesas)
  const caixaSemPlano = acumular(saldos, caixaExtraCentavos)
  const buraco = Math.max(0, -caixaSemPlano[0])
  // Pontual: os meses seguintes voltam a sobrar. Estrutural: a renda não cobre as contas de forma recorrente.
  const seguintes = saldos.slice(1, 4)
  const mediaSeguintes = seguintes.length ? seguintes.reduce((a, b) => a + b, 0) / seguintes.length : 0
  const situacao = buraco === 0 && caixaSemPlano.every((c) => c >= 0) ? 'sem_aperto' : mediaSeguintes < 0 ? 'estrutural' : 'pontual'

  const ativas = ofertas.filter((o) => o.situacao === 'avaliando')
  const pagas = ativas.filter((o) => o.tipo !== 'custo_zero')
  const alivio = (o: OfertaAperto) => efeitoPorMes(o, n)[0]
  // Custo por real de alívio: a régua para escolher a saída mais barata (R2). FGTS só em último caso (R9).
  const razao = (o: OfertaAperto) =>
    (o.tipo === 'antecipacao_fgts' ? 1e6 : 0) + (alivio(o) > 0 ? custoReal(o) / alivio(o) : Number.POSITIVE_INFINITY)

  // Escolha gulosa: a mais barata primeiro, uma por grupo, sem criar falta nos meses seguintes (R3),
  // até cobrir o buraco (R4) — e para aí (R8).
  // Busca entre as combinações (no máximo uma por grupo) a que fecha este mês (R4) pelo menor custo
  // real total (R2), sem deixar os meses seguintes no vermelho (R3). Os meses seguintes são avaliados
  // supondo este mês coberto. Se nada fecha, fica a que mais reduz a falta. FGTS pesa como último caso (R9).
  const candidatas = [...pagas].filter((o) => alivio(o) > 0).sort((a, b) => razao(a) - razao(b)).slice(0, MAXIMO_COMBINADAS)
  const efeitos = new Map(candidatas.map((o) => [o, acumular(efeitoPorMes(o, n), 0)]))
  const futuro = (caixa: number[]) => acumular(caixa.slice(1).map((c, k) => c - caixa[k]), Math.max(0, caixa[0]))
  const limiteFuturo = futuro(caixaSemPlano).map((c) => Math.min(0, c))
  const penalidade = (o: OfertaAperto) => custoReal(o) + (o.tipo === 'antecipacao_fgts' ? 1e9 : 0)
  let melhor = { escolhidas: [] as OfertaAperto[], caixa: caixaSemPlano, fecha: caixaSemPlano[0] >= 0, custo: 0 }
  const avaliar = (combo: OfertaAperto[]) => {
    const caixa = caixaSemPlano.map((c, k) => combo.reduce((t, o) => t + efeitos.get(o)![k], c))
    if (futuro(caixa).some((c, k) => c < limiteFuturo[k])) return
    const fecha = caixa[0] >= 0
    const custo = combo.reduce((t, o) => t + penalidade(o), 0)
    const ganha = fecha
      ? !melhor.fecha || custo < melhor.custo || (custo === melhor.custo && combo.length < melhor.escolhidas.length)
      : !melhor.fecha && (caixa[0] > melhor.caixa[0] || (caixa[0] === melhor.caixa[0] && custo < melhor.custo))
    if (ganha) melhor = { escolhidas: combo, caixa, fecha, custo }
  }
  const percorrer = (i: number, combo: OfertaAperto[]) => {
    if (i === candidatas.length) return avaliar(combo)
    percorrer(i + 1, combo)
    const o = candidatas[i]
    if (!o.grupo || !combo.some((e) => e.grupo === o.grupo)) percorrer(i + 1, [...combo, o])
  }
  if (caixaSemPlano[0] < 0) percorrer(0, [])
  const escolhidas = melhor.escolhidas
  const caixaComPlano = melhor.caixa
  const fecha = caixaComPlano[0] >= 0
  const custoTotal = escolhidas.reduce((t, o) => t + custoReal(o), 0)
  const maisBarata = [...pagas].filter((o) => alivio(o) > 0).sort((a, b) => razao(a) - razao(b))[0]

  const avaliadas: OfertaAvaliadaDTO[] = ofertas.map((o) => {
    const custo = custoReal(o)
    const percentual = o.valorCentavos > 0 ? custo / o.valorCentavos : 0
    return {
      ...o,
      totalPagoCentavos: totalPago(o),
      custoRealCentavos: custo,
      custoPercentual: percentual,
      alivioNoMesCentavos: alivio(o),
      escolhida: escolhidas.includes(o),
      rotulo: ehUltimoRecurso(o) ? 'ultimo_recurso' : o === maisBarata ? 'mais_barata' : null,
      avisos: avisosDaOferta(o, buraco)
    }
  })

  const custoZero = ativas.filter((o) => o.tipo === 'custo_zero')
  const passos = montarPassos(custoZero, escolhidas, fecha, passosFeitos)
  const planoB = [
    ...[...pagas]
      .filter((o) => !escolhidas.includes(o))
      .sort((a, b) => Number(ehUltimoRecurso(a)) - Number(ehUltimoRecurso(b)) || razao(a) - razao(b))
      .map((o) => `${o.descricao} (custa ${moeda(custoReal(o))}${ehUltimoRecurso(o) ? ', último recurso' : ''})`)
  ]

  const projecao: MesAperto[] = meses.map((m, k) => ({
    mes: m.mes,
    receitas: m.receitas,
    despesas: m.despesas,
    saldoMes: saldos[k],
    caixaSemPlano: caixaSemPlano[k],
    caixaComPlano: caixaComPlano[k],
    avisos: m.avisos
  }))
  const pior = projecao.reduce<MesAperto | null>((p, m) => (!p || m.caixaComPlano < p.caixaComPlano ? m : p), null)

  return {
    mes: meses[0]?.mes ?? '',
    caixaExtraCentavos,
    receitasMes: meses[0]?.receitas ?? 0,
    contasMes: meses[0]?.despesas ?? 0,
    buracoCentavos: buraco,
    situacao,
    mesMaisApertado: pior && pior.caixaComPlano < 0 ? pior.mes : (projecao.slice(1).sort((a, b) => a.caixaComPlano - b.caixaComPlano)[0]?.mes ?? null),
    ofertas: avaliadas,
    fecha,
    sobraComPlanoCentavos: caixaComPlano[0] ?? 0,
    custoTotalPlanoCentavos: custoTotal,
    passos,
    planoB,
    dicas: dicasDoPlano(situacao, ofertas, escolhidas),
    projecao,
    explicacao: explicar({ situacao, buraco, contasMes: meses[0]?.despesas ?? 0, escolhidas, custoTotal, fecha, sobra: caixaComPlano[0] ?? 0, custoZero, avaliadas, projecao })
  }
}

function avisosDaOferta(o: OfertaAperto, buraco: number): AvisoOferta[] {
  const avisos: AvisoOferta[] = []
  const custo = custoReal(o)
  if (o.tipo === 'custo_zero') {
    avisos.push({ regra: 'R5', texto: 'Sem custo: tente isto antes de qualquer crédito. Depende de o outro lado aceitar.', nivel: 'info' })
    return avisos
  }
  const pct = o.valorCentavos > 0 ? Math.round((custo / o.valorCentavos) * 1000) / 10 : 0
  avisos.push({ regra: o.tipo === 'refinanciamento' ? 'R6' : 'R2', texto: custoTexto(o, custo, pct), nivel: pct > 50 ? 'perigo' : pct > 20 ? 'alerta' : 'info' })
  if (o.primeiraParcelaEmMeses === 0 && o.parcelas > 0) {
    avisos.push({ regra: 'R12', texto: `A 1ª parcela (${moeda(o.parcelaCentavos)}) sai já neste mês: alivia ${moeda(o.valorCentavos - o.parcelaCentavos)}, não ${moeda(o.valorCentavos)}.`, nivel: 'info' })
  }
  if (o.tipo === 'refinanciamento' && o.parcelasSubstituidasRestantes > 0 && o.parcelasSubstituidasRestantes <= 4) {
    avisos.push({ regra: 'R7', texto: `A dívida antiga acabaria em ${o.parcelasSubstituidasRestantes} ${o.parcelasSubstituidasRestantes === 1 ? 'mês' : 'meses'}; refinanciar estende o desconto por ${o.parcelas} meses.`, nivel: 'perigo' })
  }
  if (['emprestimo', 'refinanciamento', 'antecipacao_fgts'].includes(o.tipo) && buraco > 0 && o.valorCentavos > buraco * 1.5) {
    avisos.push({ regra: 'R8', texto: `É bem mais do que falta neste mês (${moeda(buraco)}). Se for usar, peça só o necessário.`, nivel: 'alerta' })
  }
  if (o.tipo === 'antecipacao_fgts') {
    avisos.push({ regra: 'R9', texto: 'Antecipar o FGTS bloqueia o saldo e, no saque-aniversário, você perde o saque total se for demitido.', nivel: 'perigo' })
  }
  return avisos
}

function custoTexto(o: OfertaAperto, custo: number, pct: number) {
  const pctTexto = `${pct.toLocaleString('pt-BR')}%`
  if (o.tipo === 'refinanciamento') {
    return `Custo real ${moeda(custo)}: paga ${moeda(totalPago(o))}, menos ${moeda(o.saldoSubstituidoCentavos)} que já pagaria e ${moeda(o.valorCentavos)} que recebe (${pctTexto} do valor).`
  }
  return `Paga ${moeda(totalPago(o))} por ${moeda(o.valorCentavos)}: custo de ${moeda(custo)} (${pctTexto}).`
}

function montarPassos(custoZero: OfertaAperto[], escolhidas: OfertaAperto[], fecha: boolean, feitos: Set<string>): PassoAperto[] {
  const passos: Omit<PassoAperto, 'feito'>[] = []
  for (const o of custoZero) {
    const dispensa = escolhidas.find((e) => o.grupo && e.grupo === o.grupo)
    passos.push({
      chave: `zero:${o.id}`,
      texto: `Tente primeiro, sem custo: ${o.descricao}.${dispensa ? ` Se der certo, não precisa de "${dispensa.descricao}".` : ''}`,
      valorCentavos: o.valorCentavos
    })
  }
  if (escolhidas.some((o) => o.tipo === 'parcelar_fatura')) {
    passos.push({ chave: 'simular', texto: 'Simule os parcelamentos no aplicativo do banco sem confirmar e anote as opções (as ofertas mudam).', valorCentavos: null })
  }
  for (const o of [...escolhidas].sort((a, b) => ORDEM_NO_PLANO[a.tipo] - ORDEM_NO_PLANO[b.tipo])) {
    passos.push({ chave: `oferta:${o.id}`, texto: textoDoPasso(o), valorCentavos: o.primeiraParcelaEmMeses === 0 ? o.parcelaCentavos : o.valorCentavos })
  }
  if (fecha && escolhidas.length) {
    passos.push({ chave: 'resto', texto: 'Pague à vista as demais contas do mês, começando pelas essenciais (moradia, luz, água).', valorCentavos: null })
    passos.push({ chave: 'cartoes', texto: 'Guarde os cartões até a virada do mês: compras novas só com o que já está no orçamento.', valorCentavos: null })
  }
  return passos.map((p) => ({ ...p, feito: feitos.has(p.chave) }))
}

function textoDoPasso(o: OfertaAperto) {
  const parcelas = `${o.parcelas}x de ${moeda(o.parcelaCentavos)}`
  switch (o.tipo) {
    case 'parcelar_fatura':
      return `Parcele: ${o.descricao}, em ${parcelas}${o.primeiraParcelaEmMeses === 0 ? ' e pague a 1ª parcela agora' : ''}.`
    case 'credito_no_cartao':
      return `Pague no crédito (Pix ou boleto no cartão): ${o.descricao}, em ${parcelas}. O gasto vai para a próxima fatura.`
    case 'emprestimo':
      return `Empréstimo: ${o.descricao}. ${moeda(o.valorCentavos)} em ${parcelas}; peça só esse valor.`
    case 'refinanciamento':
      return `Refinanciamento${ehUltimoRecurso(o) ? ' (último recurso)' : ''}: ${o.descricao}. Recebe ${moeda(o.valorCentavos)} e paga ${parcelas}.`
    case 'antecipacao_fgts':
      return `Antecipação do FGTS (último recurso): ${o.descricao}. ${moeda(o.valorCentavos)}.`
    default:
      return o.descricao
  }
}

function dicasDoPlano(situacao: PlanoApertoDTO['situacao'], ofertas: OfertaAperto[], escolhidas: OfertaAperto[]): AvisoOferta[] {
  const dicas: AvisoOferta[] = []
  if (situacao === 'sem_aperto') return dicas
  dicas.push({ regra: 'R1', texto: 'Não pague o mínimo nem parte da fatura: ou paga inteira, ou parcela formalmente.', nivel: 'alerta' })
  dicas.push({ regra: 'R4', texto: 'O que precisa ser resolvido é o buraco deste mês, não a dívida inteira.', nivel: 'info' })
  if (!ofertas.some((o) => o.tipo === 'custo_zero')) {
    dicas.push({ regra: 'R5', texto: 'Antes de pegar crédito, pergunte ao proprietário ou credor se dá para pagar alguns dias depois, ou peça um adiantamento ao RH. Cadastre como "custo zero".', nivel: 'info' })
  }
  if (!ofertas.some((o) => o.tipo === 'credito_no_cartao')) {
    dicas.push({ regra: 'R11', texto: 'Pix ou boleto no crédito (aluguel, contas) costuma ter taxa baixa e leva o gasto para a próxima fatura. Veja se o seu cartão oferece.', nivel: 'info' })
  }
  if (situacao === 'estrutural') {
    dicas.push({ regra: 'R4', texto: 'Os próximos meses também ficam no vermelho: crédito só adia o problema. O caminho é cortar contas fixas ou aumentar a renda.', nivel: 'perigo' })
  }
  if (escolhidas.some((o) => o.tipo === 'refinanciamento' || o.tipo === 'emprestimo')) {
    dicas.push({ regra: 'R10', texto: 'Com o dinheiro do empréstimo, quite primeiro o que tem juros maiores (cartão).', nivel: 'info' })
  }
  return dicas
}

function explicar(d: {
  situacao: PlanoApertoDTO['situacao']
  buraco: number
  contasMes: number
  escolhidas: OfertaAperto[]
  custoTotal: number
  fecha: boolean
  sobra: number
  custoZero: OfertaAperto[]
  avaliadas: OfertaAvaliadaDTO[]
  projecao: MesAperto[]
}): string {
  if (d.situacao === 'sem_aperto') return 'Pelas contas cadastradas, o dinheiro deste mês e dos próximos dá para tudo. Nada a resolver agora.'
  const partes: string[] = []
  partes.push(`As contas deste mês somam ${moeda(d.contasMes)}, mas o que falta de verdade é ${moeda(d.buraco)}: é esse buraco que precisa ser coberto.`)
  const volta = d.projecao.slice(1).find((m) => m.saldoMes > 0)
  partes.push(
    d.situacao === 'pontual'
      ? `É um aperto pontual${volta ? `: em ${nomeMes(volta.mes)} volta a sobrar dinheiro` : ''}, então a saída é empurrar parte das contas para os próximos meses pelo menor custo.`
      : 'Os próximos meses também não fecham: além de cobrir este mês, é preciso cortar despesas ou aumentar a renda.'
  )
  if (d.custoZero.length) partes.push(`Tente primeiro o que não custa nada: ${d.custoZero.map((o) => o.descricao.toLowerCase()).join('; ')}.`)
  if (d.escolhidas.length) {
    partes.push(
      `A combinação mais barata é ${d.escolhidas.map((o) => o.descricao).join(' + ')}, com custo total de ${moeda(d.custoTotal)}. ${
        d.fecha ? `Com ela, sobram ${moeda(d.sobra)} neste mês.` : `Mesmo assim faltam ${moeda(-d.sobra)}.`
      }`
    )
  } else if (d.buraco > 0) {
    partes.push('Cadastre abaixo as ofertas que você recebeu (parcelamento da fatura, Pix no crédito, empréstimos) para o app calcular qual sai mais barata.')
  }
  const caraNoPlano = d.escolhidas.filter(ehUltimoRecurso)
  if (caraNoPlano.length) {
    partes.push(`Atenção: o plano só fecha com ${caraNoPlano.map((o) => o.descricao).join(' e ')}, que é caro. Antes, tente o que custa zero e procure outras ofertas (parcelar a fatura em menos vezes, Pix no crédito); cadastre-as aqui que o app recalcula.`)
  }
  const cara = d.avaliadas.filter((o) => o.rotulo === 'ultimo_recurso' && !o.escolhida && o.situacao === 'avaliando').sort((a, b) => b.custoRealCentavos - a.custoRealCentavos)[0]
  if (cara) partes.push(`Evite ${cara.descricao}: custa ${moeda(cara.custoRealCentavos)} a mais, ${Math.round(cara.custoPercentual * 100)}% do valor.`)
  return partes.join(' ')
}

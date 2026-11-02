import type { AnaliseDTO } from '@compartilhado/dtos/analise'
import type { InsightDTO } from '@compartilhado/dtos/saude'
import type { Categoria } from '../../dominio/entidades/Categoria'
import { moeda, nomeMes, percentual } from './formatacao'

type DadosAnalise = Omit<Extract<AnaliseDTO, { dadosSuficientes: true }>, 'dadosSuficientes' | 'insights'>

const ORDEM: Record<InsightDTO['tipo'], number> = { critico: 0, atencao: 1, dica: 2, positivo: 3 }
const VARIACAO_PESSOA_RELEVANTE = 0.2

// Textos nativos das análises: o que os números do período mostram, em português claro.
export function gerarInsightsAnalise(
  a: DadosAnalise,
  categoriaPorId: Map<string, Categoria>
): InsightDTO[] {
  const insights: InsightDTO[] = []

  // ===== Família: quem concentra os gastos =====
  if (a.porPessoa.length >= 2) {
    const [maior] = a.porPessoa
    const nome = primeiroNome(maior.nome)
    const parteEssencial = maior.total > 0 ? maior.porNatureza.essencial / maior.total : 0
    const porMes = (total: number) => moeda(Math.round(total / a.periodo.meses))

    // Concentrar gastos essenciais (aluguel, mercado) é responsabilidade, não exagero.
    const contexto =
      parteEssencial >= 0.5
        ? ` ${percentual(parteEssencial)} disso é essencial (${maior.topCategorias[0]?.nome.toLowerCase() ?? 'contas da casa'}), ou seja, boa parte das contas da casa está com ${nome}.`
        : ''
    const teto = maior.topEstiloVida
      ? ` No estilo de vida, o maior gasto é ${maior.topEstiloVida.nome.toLowerCase()} (${porMes(maior.topEstiloVida.total)}/mês): se for preciso ajustar, um teto combinado ali faz diferença.`
      : ''

    insights.push({
      tipo: maior.participacao > 0.5 && parteEssencial < 0.5 ? 'atencao' : 'dica',
      titulo: `${nome} concentra ${percentual(maior.participacao)} dos gastos`,
      texto: `São ${moeda(maior.mediaMensal)} por mês em média.${contexto}${teto}`
    })
  }
  for (const pessoa of a.porPessoa) {
    if (pessoa.variacaoUltimoMes !== null && pessoa.variacaoUltimoMes >= VARIACAO_PESSOA_RELEVANTE) {
      insights.push({
        tipo: 'atencao',
        titulo: `Gastos de ${primeiroNome(pessoa.nome)} subiram`,
        texto: `Em ${nomeMes(a.periodo.fim)}, os gastos de ${primeiroNome(pessoa.nome)} ficaram ${percentual(pessoa.variacaoUltimoMes)} acima da média dos meses anteriores.`
      })
    }
  }

  // ===== Natureza =====
  const natureza = (id: string) => a.porNatureza.find((n) => n.natureza === id)
  const estilo = natureza('estilo_vida')
  if (estilo?.status && estilo.status !== 'bom' && estilo.participacaoRenda !== null) {
    insights.push({
      tipo: estilo.status === 'critico' ? 'critico' : 'atencao',
      titulo: 'Estilo de vida acima do recomendado',
      texto: `Lazer, restaurantes, compras e assinaturas levam ${percentual(estilo.participacaoRenda)} da renda (${moeda(estilo.mediaMensal)}/mês). A referência é até 30%. É a parte mais fácil de ajustar sem mexer no essencial.`
    })
  }
  const essencial = natureza('essencial')
  if (essencial?.status && essencial.status !== 'bom' && essencial.participacaoRenda !== null) {
    insights.push({
      tipo: essencial.status === 'critico' ? 'critico' : 'atencao',
      titulo: 'Custo essencial alto',
      texto: `Moradia, mercado, transporte, saúde e contas somam ${percentual(essencial.participacaoRenda)} da renda. Acima de 50%, sobra pouco para guardar e para imprevistos; renegociar contas fixas costuma ter efeito duradouro.`
    })
  }
  const educacao = natureza('educacao')
  if (educacao && educacao.total > 0) {
    insights.push({
      tipo: 'positivo',
      titulo: 'Investimento em vocês',
      texto: `${moeda(educacao.mediaMensal)} por mês foram para educação, cursos e estudos. É o tipo de gasto com maior retorno no longo prazo: aumenta a renda futura.`
    })
  }
  const juros = natureza('juros')
  if (juros && juros.total > 0) {
    insights.push({
      tipo: juros.status === 'critico' ? 'critico' : 'atencao',
      titulo: 'Juros e tarifas',
      texto: `${moeda(juros.total)} foram pagos em juros e tarifas no período. Esse dinheiro não volta: quitar a dívida mais cara primeiro é o melhor "investimento" disponível.`
    })
  }

  // ===== Tendências =====
  const geral = a.tendenciaGeral
  if (geral.confiavel && Math.abs(geral.variacaoMensal) >= 0.03) {
    const [ultimaProjecao] = geral.projecao.slice(-1)
    insights.push(
      geral.inclinacaoMensal > 0
        ? {
            tipo: 'atencao',
            titulo: 'Os gastos estão subindo',
            texto: `Nos últimos ${a.periodo.meses} meses, as despesas cresceram em média ${moeda(geral.inclinacaoMensal)} por mês. Se a tendência continuar, chegam a ${moeda(ultimaProjecao.valor)} em ${nomeMes(ultimaProjecao.mes)}.`
          }
        : {
            tipo: 'positivo',
            titulo: 'Os gastos estão caindo',
            texto: `As despesas caíram em média ${moeda(-geral.inclinacaoMensal)} por mês nos últimos ${a.periodo.meses} meses. Bom momento para direcionar a diferença para a reserva.`
          }
    )
  }
  const [maisCresce] = a.tendenciasCategorias.filter((t) => t.inclinacaoMensal > 0)
  if (maisCresce) {
    insights.push({
      tipo: 'atencao',
      titulo: `${maisCresce.nome} em alta`,
      texto: `${maisCresce.nome} cresce cerca de ${moeda(maisCresce.inclinacaoMensal)} por mês (${percentual(maisCresce.variacaoMensal)} da média mensal), uma tendência consistente desde ${nomeMes(a.periodo.inicio)}.`
    })
  }

  // ===== Hábitos =====
  if (a.habitos.length > 0) {
    const exemplos = a.habitos
      .slice(0, 3)
      .map((h) => `${h.descricao} (${categoriaPorId.get(h.categoriaId)?.nome.toLowerCase() ?? 'outros'})`)
      .join(', ')
    insights.push({
      tipo: 'dica',
      titulo: `${a.habitos.length} gasto(s) se repetem todo mês`,
      texto: `${exemplos} aparecem quase todo mês, mas não estão cadastrados como recorrentes. Cadastrá-los deixa a previsão e o limite seguro de crédito mais precisos.`
    })
  }

  return insights.sort((x, y) => ORDEM[x.tipo] - ORDEM[y.tipo])
}

const primeiroNome = (nome: string) => nome.split(' ')[0]

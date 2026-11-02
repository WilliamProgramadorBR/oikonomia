import type { ContextoFinanceiro } from './ContextoFinanceiro'
import { moeda, nomeMes } from './formatacao'

// Assistente sem IA: identifica a intenção da pergunta por palavras-chave e responde com os
// números e textos que o app já calcula. Sempre funciona, mesmo offline.

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const mesAno = (mes: string) => `${nomeMes(mes)}/${mes.slice(2, 4)}`

type Intencao = { padrao: RegExp; responder: (c: ContextoFinanceiro) => string }

const INTENCOES: Intencao[] = [
  {
    padrao: /limite|credito|parcel|posso comprar|financ|emprest/,
    responder: ({ saude: s }) =>
      !s.dadosSuficientes
        ? s.motivo
        : `**Limite seguro de novas parcelas em ${mesAno(s.mesReferencia)}: ${moeda(s.limiteCredito.parcelaMensalMaxima)}/mês.**\n\n${s.limiteCredito.explicacao}\n\nPara comparar bancos antes de contratar, use a tela **Simular crédito**.`
  },
  {
    padrao: /divid|quitar|juros|cheque especial|rotativo/,
    responder: ({ dividas: d }) =>
      d.dividas.length === 0
        ? 'Não há dívidas cadastradas. Se tiver empréstimos ou financiamentos, cadastre na tela **Dívidas** para o app montar a estratégia.'
        : `**Total devido: ${moeda(d.totalDevido)}** em ${d.dividas.length} dívida(s).\n\n${d.explicacao}\n\n${d.dividas
            .slice(0, 5)
            .map((x) => `- ${x.nome}: saldo ${moeda(x.saldoAtualCentavos)} a ${x.taxaMensal.toLocaleString('pt-BR')}% a.m.`)
            .join('\n')}${d.trocas[0] ? `\n\n**Oportunidade:** ${d.trocas[0].observacao}` : ''}`
  },
  {
    padrao: /quem gast|gasta mais|gastou mais|familia|esposa|marido|filh|pessoa/,
    responder: ({ analise: a }) =>
      !a.dadosSuficientes
        ? a.motivo
        : `Média de ${moeda(a.mediaMensal)}/mês em despesas nos últimos meses:\n\n${a.porPessoa
            .map((p) => `- **${p.nome}**: ${Math.round(p.participacao * 100)}% (${moeda(p.mediaMensal)}/mês), principalmente ${p.topCategorias.map((c) => c.nome.toLowerCase()).join(', ')}`)
            .join('\n')}`
  },
  {
    padrao: /objetiv|meta|reserva|viagem|casa propria|imovel|apartamento|juntar|guardar/,
    responder: ({ objetivos: o }) =>
      o.objetivos.length === 0
        ? 'Ainda não há objetivos. Na tela **Objetivos** você define o que quer alcançar e o app mostra se cabe e em quanto tempo.'
        : `Folga para objetivos: **${moeda(o.capacidadeMensal)}/mês**.\n\n${o.objetivos
            .map(
              (x) =>
                `- **${x.nome}**: ${moeda(x.valorAtualCentavos)} de ${moeda(x.valorAlvoCentavos)}. ${x.plano.passos[0]?.titulo ?? ''}${x.plano.prazoRealista ? ` (previsão: ${mesAno(x.plano.prazoRealista)})` : ''}`
            )
            .join('\n')}`
  },
  {
    padrao: /gastar|orcamento|sobra|sobrar|proximo mes|previs|mes que vem/,
    responder: ({ saude: s, previsao: p }) => {
      const meses = p.meses
        .slice(0, 4)
        .map((m) => `- ${mesAno(m.mes)}: ${m.saldoProjetado < 0 ? `faltam ${moeda(-m.saldoProjetado)}` : `sobra projetada de ${moeda(m.saldoProjetado)}`}`)
        .join('\n')
      if (!s.dadosSuficientes) return `Previsão dos próximos meses:\n\n${meses}`
      const o = s.orcamento
      return `**Orçamento de ${mesAno(s.mesReferencia)}** (renda de ${moeda(o.renda)}):\n\n- Contas recorrentes: ${moeda(o.contasRecorrentes)}\n- Parcelas: ${moeda(o.parcelas)}\n- Imprevistos (média): ${moeda(o.imprevistos)}\n- Guardar: ${moeda(o.guardarPrevisto + o.guardarSugerido)}\n- Margem de segurança: ${moeda(o.margemSeguranca)}\n- **Livre para gastar: ${moeda(o.livreParaGastar)}**\n\nPróximos meses:\n\n${meses}`
    }
  },
  {
    padrao: /cort|economiz|reduzir|gasto alto|onde.*gast/,
    responder: ({ analise: a }) =>
      !a.dadosSuficientes
        ? a.motivo
        : `${a.insights
            .filter((i) => i.tipo !== 'positivo')
            .slice(0, 3)
            .map((i) => `- **${i.titulo}:** ${i.texto}`)
            .join('\n') || 'Não encontrei exageros nos últimos meses.'}`
  }
]

export function responderNativamente(pergunta: string, contexto: ContextoFinanceiro): string {
  const texto = normalizar(pergunta)
  const intencao = INTENCOES.find((i) => i.padrao.test(texto))
  if (intencao) return intencao.responder(contexto)

  const s = contexto.saude
  return `${s.dadosSuficientes ? `${s.resumo}\n\n` : ''}Posso responder sobre:\n\n- quanto dá para parcelar no mês que vem\n- o orçamento e a previsão dos próximos meses\n- como quitar as dívidas mais rápido\n- se os objetivos vão dar certo\n- quem da família gasta mais e onde dá para cortar`
}

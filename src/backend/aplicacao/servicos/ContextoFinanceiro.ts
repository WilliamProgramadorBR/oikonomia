import type { AnaliseDTO } from '@compartilhado/dtos/analise'
import type { PlanoDividasDTO } from '@compartilhado/dtos/divida'
import type { ObjetivosDTO } from '@compartilhado/dtos/objetivo'
import type { PrevisaoDTO } from '@compartilhado/dtos/previsao'
import type { SaudeFinanceiraDTO } from '@compartilhado/dtos/saude'
import { deslocarMes, mesAtual } from '@compartilhado/utilitarios/mes'
import type { IPessoaRepositorio } from '../../dominio/repositorios/IPessoaRepositorio'
import type { ObterAnalise } from '../casos-de-uso/analise/ObterAnalise'
import type { ObterPlanoDividas } from '../casos-de-uso/divida/Dividas'
import type { ListarObjetivos } from '../casos-de-uso/objetivo/ListarObjetivos'
import type { ObterPrevisao } from '../casos-de-uso/previsao/ObterPrevisao'
import type { ObterSaudeFinanceira } from '../casos-de-uso/saude/ObterSaudeFinanceira'

// Tudo o que o assistente precisa saber sobre a família, calculado pelas regras do próprio app.
export interface ContextoFinanceiro {
  pessoas: string[]
  saude: SaudeFinanceiraDTO
  previsao: PrevisaoDTO
  objetivos: ObjetivosDTO
  dividas: PlanoDividasDTO
  analise: AnaliseDTO
}

export class MontadorContexto {
  constructor(
    private readonly pessoaRepositorio: IPessoaRepositorio,
    private readonly obterSaude: ObterSaudeFinanceira,
    private readonly obterPrevisao: ObterPrevisao,
    private readonly listarObjetivos: ListarObjetivos,
    private readonly obterPlanoDividas: ObterPlanoDividas,
    private readonly obterAnalise: ObterAnalise
  ) {}

  async montar(): Promise<ContextoFinanceiro> {
    const atual = mesAtual()
    const [pessoas, saude, previsao, objetivos, dividas, analise] = await Promise.all([
      this.pessoaRepositorio.listar(),
      this.obterSaude.executar(null),
      this.obterPrevisao.executar({ pessoaId: null, mesInicial: atual }),
      this.listarObjetivos.executar(),
      this.obterPlanoDividas.executar(null),
      this.obterAnalise.executar({ pessoaId: null, mesFinal: deslocarMes(atual, -1), meses: 6 })
    ])
    return { pessoas: pessoas.map((p) => p.nome), saude, previsao, objetivos, dividas, analise }
  }
}

const reais = (centavos: number | null | undefined) => (centavos == null ? null : Math.round(centavos) / 100)

// Versão compacta e em reais, para caber no contexto da IA sem desperdício.
export function resumirParaIA(c: ContextoFinanceiro): object {
  const s = c.saude
  return {
    hoje: mesAtual(),
    familia: c.pessoas,
    saudeFinanceira: s.dadosSuficientes
      ? {
          mesAvaliado: s.mesReferencia,
          nota: s.nota,
          classificacao: s.classificacao,
          resumo: s.resumo,
          orcamentoProximoMes: Object.fromEntries(
            Object.entries(s.orcamento).map(([k, v]) => [k, typeof v === 'number' ? reais(v) : v])
          ),
          limiteSeguroNovasParcelasPorMes: reais(s.limiteCredito.parcelaMensalMaxima),
          explicacaoLimite: s.limiteCredito.explicacao,
          indicadores: s.indicadores.map((i) => ({ nome: i.nome, valor: i.valor, unidade: i.unidade, status: i.status, referencia: i.referencia })),
          pontosDeAtencao: s.insights.map((i) => `${i.titulo}: ${i.texto}`)
        }
      : { indisponivel: s.motivo },
    previsaoProximosMeses: c.previsao.meses.map((m) => ({
      mes: m.mes,
      receitas: reais(m.receitas),
      contasRecorrentes: reais(m.contasRecorrentes),
      parcelas: reais(m.parcelasCartao + m.parcelasDividas),
      imprevistosEstimados: reais(m.avulsasLancadas + m.reservaImprevistos),
      guardar: reais(m.guardado),
      sobraProjetada: reais(m.saldoProjetado)
    })),
    objetivos: c.objetivos.objetivos.map((o) => ({
      nome: o.nome,
      alvo: reais(o.valorAlvoCentavos),
      juntado: reais(o.valorAtualCentavos),
      prazo: o.dataAlvo,
      situacao: o.plano.viabilidade,
      aporteNecessarioPorMes: reais(o.plano.aporteNecessario),
      aporteQueCabePorMes: reais(o.plano.aporteSugerido),
      prazoRealista: o.plano.prazoRealista,
      proximoPasso: o.plano.passos[0]?.titulo
    })),
    perfil: { estilo: c.objetivos.perfil.estilo, prioridade: c.objetivos.perfil.prioridade },
    dividas: {
      totalDevido: reais(c.dividas.totalDevido),
      lista: c.dividas.dividas.map((d) => ({
        nome: d.nome,
        saldo: reais(d.saldoAtualCentavos),
        taxaMensalPercentual: d.taxaMensal,
        medianaMercado: d.taxaMercadoMediana,
        parcela: reais(d.parcelaCentavos),
        parcelasRestantes: d.parcelasRestantes
      })),
      estrategiaRecomendada: c.dividas.recomendado,
      explicacao: c.dividas.explicacao,
      trocasSugeridas: c.dividas.trocas.map((t) => t.observacao)
    },
    analiseUltimosMeses: c.analise.dadosSuficientes
      ? {
          mediaDespesasMes: reais(c.analise.mediaMensal),
          rendaMedia: reais(c.analise.rendaMediaMensal),
          porPessoa: c.analise.porPessoa.map((p) => ({ nome: p.nome, participacao: p.participacao, mediaMes: reais(p.mediaMensal), principais: p.topCategorias.map((x) => x.nome) })),
          porNatureza: c.analise.porNatureza.map((n) => ({ natureza: n.nome, mediaMes: reais(n.mediaMensal), daRenda: n.participacaoRenda })),
          tendencias: c.analise.tendenciasCategorias.map((t) => ({ categoria: t.nome, variacaoMensal: reais(t.inclinacaoMensal) })),
          habitosNaoCadastrados: c.analise.habitos.map((h) => h.descricao)
        }
      : null
  }
}

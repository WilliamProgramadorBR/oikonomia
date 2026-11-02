import { CASA } from '@compartilhado/constantes/casa'
import type {
  AnaliseDTO,
  FatiaSimples,
  FiltroAnalise,
  GastoPessoaDTO,
  NaturezaResumoDTO,
  PontoNatureza,
  TendenciaDTO
} from '@compartilhado/dtos/analise'
import type { NaturezaDespesa } from '@compartilhado/dtos/categoria'
import { NOMES_NATUREZAS } from '@compartilhado/dtos/categoria'
import type { StatusIndicador } from '@compartilhado/dtos/saude'
import { deslocarMes, intervaloDoMes, mesAtual } from '@compartilhado/utilitarios/mes'
import type { Transacao } from '../../../dominio/entidades/Transacao'
import type { ICategoriaRepositorio } from '../../../dominio/repositorios/ICategoriaRepositorio'
import type { IPessoaRepositorio } from '../../../dominio/repositorios/IPessoaRepositorio'
import type { IRecorrenciaRepositorio } from '../../../dominio/repositorios/IRecorrenciaRepositorio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'
import { assinaturaDe, detectarHabitos } from '../../../dominio/servicos/DetectorHabitos'
import { regressaoLinear } from '../../../dominio/servicos/RegressaoLinear'
import { gerarInsightsAnalise } from '../../servicos/NarradorAnalises'

const NATUREZAS: NaturezaDespesa[] = ['essencial', 'estilo_vida', 'educacao', 'juros', 'outros']
const MESES_PROJETADOS = 3
const R2_MINIMO = 0.5 // abaixo disso a reta não explica bem a série
const VARIACAO_RELEVANTE = 0.05 // 5% da média por mês
const PARTICIPACAO_MINIMA_CATEGORIA = 0.05

// Referências do método 50/30/20 adaptado (fração da renda).
const REFERENCIAS: Record<NaturezaDespesa, { texto: string; avaliar: (v: number) => StatusIndicador } | null> = {
  essencial: { texto: 'até 50% da renda', avaliar: (v) => (v <= 0.5 ? 'bom' : v <= 0.6 ? 'atencao' : 'critico') },
  estilo_vida: { texto: 'até 30% da renda', avaliar: (v) => (v <= 0.3 ? 'bom' : v <= 0.4 ? 'atencao' : 'critico') },
  educacao: { texto: '5% da renda ou mais', avaliar: (v) => (v >= 0.05 ? 'bom' : 'atencao') },
  juros: { texto: 'zero', avaliar: (v) => (v === 0 ? 'bom' : v <= 0.02 ? 'atencao' : 'critico') },
  outros: null
}

const soma = (lista: Transacao[]) => lista.reduce((total, t) => total + t.valorCentavos, 0)
const mesDe = (t: Transacao) => t.data.toISOString().slice(0, 7)
const media = (valores: number[]) => (valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : 0)

function agrupar<T>(lista: Transacao[], chave: (t: Transacao) => T | null): Map<T, Transacao[]> {
  const grupos = new Map<T, Transacao[]>()
  for (const t of lista) {
    const k = chave(t)
    if (k === null) continue
    grupos.set(k, [...(grupos.get(k) ?? []), t])
  }
  return grupos
}

// Análises do período: quem gasta o quê, natureza dos gastos, tendências e hábitos.
// Usa só meses completos e lançamentos confirmados (o que de fato aconteceu).
export class ObterAnalise {
  constructor(
    private readonly transacaoRepositorio: ITransacaoRepositorio,
    private readonly pessoaRepositorio: IPessoaRepositorio,
    private readonly categoriaRepositorio: ICategoriaRepositorio,
    private readonly recorrenciaRepositorio: IRecorrenciaRepositorio
  ) {}

  async executar({ pessoaId, mesFinal, meses }: FiltroAnalise): Promise<AnaliseDTO> {
    const ultimoCompleto = deslocarMes(mesAtual(), -1)
    const fim = mesFinal > ultimoCompleto ? ultimoCompleto : mesFinal
    const janela = Array.from({ length: meses }, (_, k) => deslocarMes(fim, k - meses + 1))

    const [todas, pessoas, categorias, recorrencias] = await Promise.all([
      this.transacaoRepositorio.listar({
        pessoaId: pessoaId ?? undefined,
        inicio: intervaloDoMes(janela[0]).inicio,
        fim: intervaloDoMes(fim).fim
      }),
      this.pessoaRepositorio.listar(),
      this.categoriaRepositorio.listar(),
      this.recorrenciaRepositorio.listar()
    ])

    const confirmadas = todas.filter((t) => t.status === 'confirmada')
    const despesas = confirmadas.filter((t) => t.tipo === 'despesa')
    if (despesas.length === 0) {
      return {
        dadosSuficientes: false,
        motivo:
          'Ainda não há despesas confirmadas em meses completos. As análises aparecem a partir do fim do primeiro mês de uso.'
      }
    }

    // Começa no primeiro mês com dados, para meses antes do uso do app não virarem "zero".
    const mesesComDados = new Set(despesas.map(mesDe))
    const periodo = janela.slice(janela.findIndex((m) => mesesComDados.has(m)))
    const n = periodo.length

    const categoriaPorId = new Map(categorias.map((c) => [c.id, c]))
    const naturezaDe = (t: Transacao): NaturezaDespesa => categoriaPorId.get(t.categoriaId)?.natureza ?? 'outros'
    const totaisPorMes = (lista: Transacao[]) => {
      const porMes = agrupar(lista, mesDe)
      return periodo.map((m) => soma(porMes.get(m) ?? []))
    }

    const totalDespesas = soma(despesas)
    const mediaMensal = Math.round(totalDespesas / n)
    const rendaMediaMensal = Math.round(soma(confirmadas.filter((t) => t.tipo === 'receita')) / n)

    const fatias = (grupos: Map<string, Transacao[]>, limite: number): FatiaSimples[] =>
      [...grupos]
        .map(([id, lista]) => {
          const categoria = categoriaPorId.get(id)
          return { id, nome: categoria?.nome ?? 'Outros', cor: categoria?.cor ?? '#94a3b8', total: soma(lista) }
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, limite)

    // ===== Quem gasta o quê (só na visão da família) =====
    const porPessoa: GastoPessoaDTO[] = pessoaId
      ? []
      : [...agrupar(despesas, (t) => t.pessoaId ?? CASA.id)]
          .map(([id, lista]) => {
            const pessoa = id === CASA.id ? CASA : pessoas.find((p) => p.id === id)
            const mensal = totaisPorMes(lista)
            const anteriores = mensal.slice(0, -1)
            const mediaAnteriores = media(anteriores)
            const porNatureza = Object.fromEntries(NATUREZAS.map((nat) => [nat, 0])) as Record<NaturezaDespesa, number>
            for (const t of lista) porNatureza[naturezaDe(t)] += t.valorCentavos

            return {
              pessoaId: id === CASA.id ? null : id,
              nome: pessoa?.nome ?? 'Desconhecido',
              cor: pessoa?.cor ?? '#94a3b8',
              total: soma(lista),
              mediaMensal: Math.round(soma(lista) / n),
              participacao: soma(lista) / totalDespesas,
              lancamentos: lista.length,
              ticketMedio: Math.round(soma(lista) / lista.length),
              variacaoUltimoMes:
                anteriores.length > 0 && mediaAnteriores > 0
                  ? (mensal[mensal.length - 1] - mediaAnteriores) / mediaAnteriores
                  : null,
              topCategorias: fatias(agrupar(lista, (t) => t.categoriaId), 3),
              topEstiloVida:
                fatias(
                  agrupar(
                    lista.filter((t) => naturezaDe(t) === 'estilo_vida'),
                    (t) => t.categoriaId
                  ),
                  1
                )[0] ?? null,
              topEstabelecimentos: [...agrupar(lista, (t) => t.estabelecimento)]
                .map(([nome, doLugar]) => ({ nome, total: soma(doLugar), vezes: doLugar.length }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 3),
              porNatureza
            }
          })
          .sort((a, b) => b.total - a.total)

    // ===== Natureza dos gastos =====
    const porNaturezaGrupos = agrupar(despesas, naturezaDe)
    const porNatureza: NaturezaResumoDTO[] = NATUREZAS.map((natureza) => {
      const total = soma(porNaturezaGrupos.get(natureza) ?? [])
      const mediaNatureza = Math.round(total / n)
      const participacaoRenda = rendaMediaMensal > 0 ? mediaNatureza / rendaMediaMensal : null
      const referencia = REFERENCIAS[natureza]
      return {
        natureza,
        nome: NOMES_NATUREZAS[natureza],
        total,
        mediaMensal: mediaNatureza,
        participacaoDespesas: total / totalDespesas,
        participacaoRenda,
        referencia: referencia?.texto ?? null,
        status: referencia && participacaoRenda !== null ? referencia.avaliar(participacaoRenda) : null
      }
    }).filter((item) => item.total > 0 || item.natureza === 'essencial' || item.natureza === 'estilo_vida')

    const serieNatureza: PontoNatureza[] = periodo.map((mes) => {
      const ponto = { mes } as PontoNatureza
      for (const natureza of NATUREZAS) {
        ponto[natureza] = soma((porNaturezaGrupos.get(natureza) ?? []).filter((t) => mesDe(t) === mes))
      }
      return ponto
    })

    // ===== Tendências (regressão linear) =====
    const tendencia = (id: string, nome: string, cor: string, valores: number[]): TendenciaDTO => {
      const reg = regressaoLinear(valores)
      const mediaSerie = media(valores)
      return {
        id,
        nome,
        cor,
        inclinacaoMensal: Math.round(reg.inclinacao),
        variacaoMensal: mediaSerie > 0 ? reg.inclinacao / mediaSerie : 0,
        r2: reg.r2,
        confiavel: valores.length >= 3 && reg.r2 >= R2_MINIMO,
        serie: periodo.map((mes, i) => ({ mes, valor: valores[i], ajustado: Math.max(0, Math.round(reg.prever(i))) })),
        projecao: Array.from({ length: MESES_PROJETADOS }, (_, k) => ({
          mes: deslocarMes(periodo[n - 1], k + 1),
          valor: Math.max(0, Math.round(reg.prever(n + k)))
        }))
      }
    }

    const tendenciaGeral = tendencia('geral', 'Total de despesas', '#f43f5e', totaisPorMes(despesas))
    const candidatas = [...agrupar(despesas, (t) => t.categoriaId)]
      .filter(([, lista]) => soma(lista) >= totalDespesas * PARTICIPACAO_MINIMA_CATEGORIA)
      .filter(([, lista]) => new Set(lista.map(mesDe)).size >= 3)
      .map(([id, lista]) => {
        const categoria = categoriaPorId.get(id)
        return tendencia(id, categoria?.nome ?? 'Outros', categoria?.cor ?? '#94a3b8', totaisPorMes(lista))
      })
      .filter((t) => t.confiavel && Math.abs(t.variacaoMensal) >= VARIACAO_RELEVANTE)
      .sort((a, b) => b.inclinacaoMensal - a.inclinacaoMensal)
    const tendenciasCategorias = [
      ...candidatas.filter((t) => t.inclinacaoMensal > 0).slice(0, 4),
      ...candidatas.filter((t) => t.inclinacaoMensal < 0).slice(-2)
    ]

    // ===== Hábitos que deveriam ser recorrentes =====
    const habitos = detectarHabitos(
      despesas
        .filter((t) => !t.recorrencia && !t.parcela)
        .map((t) => ({
          descricao: t.descricao,
          categoriaId: t.categoriaId,
          pessoaId: t.pessoaId,
          valorCentavos: t.valorCentavos,
          data: t.data.toISOString().slice(0, 10)
        })),
      periodo,
      new Set(recorrencias.map((r) => assinaturaDe(r.categoriaId, r.descricao)))
    ).map(({ assinatura: _assinatura, ...habito }) => habito)

    const resultado = {
      periodo: { inicio: periodo[0], fim: periodo[n - 1], meses: n },
      totalDespesas,
      mediaMensal,
      rendaMediaMensal,
      porPessoa,
      porNatureza,
      serieNatureza,
      tendenciaGeral,
      tendenciasCategorias,
      habitos
    }

    return { dadosSuficientes: true, ...resultado, insights: gerarInsightsAnalise(resultado, categoriaPorId) }
  }
}

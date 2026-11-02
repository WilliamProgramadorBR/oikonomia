import type { NaturezaDespesa } from './categoria'
import type { InsightDTO, StatusIndicador } from './saude'

export interface FiltroAnalise {
  pessoaId: string | null
  mesFinal: string // AAAA-MM (o período usa só meses completos até ele)
  meses: number // tamanho da janela
}

export interface FatiaSimples {
  id: string
  nome: string
  cor: string
  total: number
}

export interface GastoPessoaDTO {
  pessoaId: string | null // null = da casa
  nome: string
  cor: string
  total: number
  mediaMensal: number
  participacao: number // fração do total da família
  lancamentos: number
  ticketMedio: number
  variacaoUltimoMes: number | null // último mês x média dos anteriores
  topCategorias: FatiaSimples[]
  topEstiloVida: FatiaSimples | null // maior gasto ajustável (onde um teto faz sentido)
  topEstabelecimentos: { nome: string; total: number; vezes: number }[]
  porNatureza: Record<NaturezaDespesa, number>
}

export interface NaturezaResumoDTO {
  natureza: NaturezaDespesa
  nome: string
  total: number
  mediaMensal: number
  participacaoDespesas: number
  participacaoRenda: number | null // null sem renda no período
  referencia: string | null // ex.: "até 50% da renda"
  status: StatusIndicador | null
}

export type PontoNatureza = { mes: string } & Record<NaturezaDespesa, number>

export interface TendenciaDTO {
  id: string
  nome: string
  cor: string
  inclinacaoMensal: number // centavos por mês
  variacaoMensal: number // inclinação ÷ média
  r2: number
  confiavel: boolean
  serie: { mes: string; valor: number; ajustado: number }[]
  projecao: { mes: string; valor: number }[]
}

export interface HabitoDTO {
  descricao: string
  categoriaId: string
  pessoaId: string | null
  valorMedio: number
  diaTipico: number
  mesesComOcorrencia: number
  ultimaData: string
}

export type AnaliseDTO =
  | { dadosSuficientes: false; motivo: string }
  | {
      dadosSuficientes: true
      periodo: { inicio: string; fim: string; meses: number }
      totalDespesas: number
      mediaMensal: number
      rendaMediaMensal: number
      porPessoa: GastoPessoaDTO[]
      porNatureza: NaturezaResumoDTO[]
      serieNatureza: PontoNatureza[]
      tendenciaGeral: TendenciaDTO
      tendenciasCategorias: TendenciaDTO[]
      habitos: HabitoDTO[]
      insights: InsightDTO[]
    }

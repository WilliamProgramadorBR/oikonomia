import type { ClassificacaoSaude, IndicadorSaudeDTO } from '@compartilhado/dtos/saude'
import { formatarPercentual } from './moeda'

export const NOMES_CLASSIFICACAO: Record<ClassificacaoSaude, string> = {
  excelente: 'Excelente',
  boa: 'Boa',
  atencao: 'Atenção',
  critica: 'Crítica'
}

export const CORES_CLASSIFICACAO: Record<ClassificacaoSaude, string> = {
  excelente: 'var(--receita)',
  boa: '#84cc16',
  atencao: 'var(--alerta)',
  critica: 'var(--despesa)'
}

export function formatarIndicador(indicador: IndicadorSaudeDTO): string {
  switch (indicador.unidade) {
    case 'percentual':
      return formatarPercentual(indicador.valor)
    case 'meses':
      return `${indicador.valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${indicador.valor >= 1 && indicador.valor < 2 ? 'mês' : 'meses'}`
    case 'quantidade':
      return String(indicador.valor)
  }
}

import { estimarProximoValor } from '@compartilhado/financeiro/estimativa'
import { dataDeVencimento, mesDaPrimeiraFatura } from '@compartilhado/financeiro/parcelamento'
import type { Cartao } from '../../dominio/entidades/Cartao'
import type { Recorrencia } from '../../dominio/entidades/Recorrencia'
import type { Transacao } from '../../dominio/entidades/Transacao'

// Regras compartilhadas pelos casos de uso de recorrência.

// Valores confirmados das ocorrências, da competência mais recente para a mais antiga.
export function valoresConfirmados(ocorrencias: Transacao[]): number[] {
  return ocorrencias
    .filter((t) => t.status === 'confirmada' && t.recorrencia)
    .sort((a, b) => b.recorrencia!.competencia.localeCompare(a.recorrencia!.competencia))
    .map((t) => t.valorCentavos)
}

// Valor para as próximas ocorrências: fixo, ou aprendido com o histórico se variável.
export function estimativaDa(recorrencia: Recorrencia, ocorrencias: Transacao[]): number {
  return recorrencia.valorVariavel
    ? estimarProximoValor(valoresConfirmados(ocorrencias), recorrencia.valorCentavos)
    : recorrencia.valorCentavos
}

// Data do lançamento da ocorrência de `mes`. Se for cobrada no cartão, cai no vencimento
// da fatura correspondente (mesma regra das compras), e não no dia da cobrança.
export function dataDaOcorrencia(recorrencia: Recorrencia, mes: string, cartao: Cartao | null): string {
  const dataCobranca = dataDeVencimento(mes, recorrencia.diaDoMes)
  if (!cartao) return dataCobranca
  const fatura = mesDaPrimeiraFatura(dataCobranca, cartao.diaFechamento, cartao.diaVencimento)
  return dataDeVencimento(fatura, cartao.diaVencimento)
}

import type { ModalidadeCredito } from '@compartilhado/dtos/taxa'
import type { FiltroTransacoes } from '@compartilhado/dtos/transacao'
import { useVisao } from '../contextos/VisaoContexto'
import { analiseServico } from '../servicos/analiseServico'
import { cartaoServico } from '../servicos/cartaoServico'
import { contaServico } from '../servicos/contaServico'
import { categoriaServico } from '../servicos/categoriaServico'
import { dividaServico } from '../servicos/dividaServico'
import { iaServico } from '../servicos/iaServico'
import { painelServico } from '../servicos/painelServico'
import { objetivoServico, perfilServico } from '../servicos/objetivoServico'
import { pessoaServico } from '../servicos/pessoaServico'
import { previsaoServico } from '../servicos/previsaoServico'
import { recorrenciaServico } from '../servicos/recorrenciaServico'
import { saudeServico } from '../servicos/saudeServico'
import { taxaServico } from '../servicos/taxaServico'
import { transacaoServico } from '../servicos/transacaoServico'
import { useConsulta } from './useConsulta'

export function usePessoas() {
  return useConsulta(() => pessoaServico.listar(), [])
}

export function useCategorias() {
  return useConsulta(() => categoriaServico.listar(), [])
}

export function useTransacoes(filtro: FiltroTransacoes) {
  return useConsulta(() => transacaoServico.listar(filtro), [filtro.pessoaId, filtro.mes])
}

// Painel da visão atual (família ou pessoa, no mês selecionado).
export function usePainel() {
  const { pessoaId, mes } = useVisao()
  return useConsulta(() => painelServico.obter({ pessoaId, mes }), [pessoaId, mes])
}

export function useContas() {
  return useConsulta(() => contaServico.listar(), [])
}

export function useCartoes() {
  return useConsulta(() => cartaoServico.listar(), [])
}

// Faturas e limites dos cartões na visão atual.
export function useResumoCartoes() {
  const { pessoaId, mes } = useVisao()
  return useConsulta(() => cartaoServico.resumo({ pessoaId, mes }), [pessoaId, mes])
}

export function useRecorrencias() {
  return useConsulta(() => recorrenciaServico.listar(), [])
}

// Provisão a partir do mês selecionado.
export function usePrevisao() {
  const { pessoaId, mes } = useVisao()
  return useConsulta(() => previsaoServico.obter({ pessoaId, mesInicial: mes }), [pessoaId, mes])
}

// Saúde financeira da visão atual (sempre avalia o próximo mês a partir de hoje).
export function useSaude() {
  const { pessoaId } = useVisao()
  return useConsulta(() => saudeServico.obter(pessoaId), [pessoaId])
}

// Análises dos `meses` completos até o mês selecionado.
export function useAnalise(meses: number) {
  const { pessoaId, mes } = useVisao()
  return useConsulta(
    () => analiseServico.obter({ pessoaId, mesFinal: mes, meses }),
    [pessoaId, mes, meses]
  )
}

export function useObjetivos() {
  return useConsulta(() => objetivoServico.listar(), [])
}

export function usePerfil() {
  return useConsulta(() => perfilServico.obter(), [])
}

// Plano de quitação; `extraMensal` null = usar a folga do orçamento.
export function usePlanoDividas(extraMensal: number | null) {
  return useConsulta(() => dividaServico.plano(extraMensal), [extraMensal])
}

export function useConfiguracaoIA() {
  return useConsulta(() => iaServico.obterConfiguracao(), [])
}

export function useTaxas(modalidade?: ModalidadeCredito) {
  return useConsulta(() => taxaServico.listar(modalidade), [modalidade])
}

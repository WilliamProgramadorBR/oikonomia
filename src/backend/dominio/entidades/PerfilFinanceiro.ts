import { ErroDominio } from '../erros/ErroDominio'

export type EstiloPerfil = 'conservador' | 'equilibrado' | 'arrojado'
export type PrioridadePerfil = 'guardar_primeiro' | 'quitar_primeiro' | 'equilibrio'

export interface PerfilFinanceiro {
  estilo: EstiloPerfil
  prioridade: PrioridadePerfil
  rendimentoMensal: number // percentual ao mês esperado para o dinheiro guardado
}

export interface ParametrosFinanceiros {
  metaPoupanca: number
  margemSeguranca: number
  tetoParcelas: number
  parcelasConfortaveis: number
  metaReservaMeses: number
}

export const PERFIL_PADRAO: PerfilFinanceiro = {
  estilo: 'equilibrado',
  prioridade: 'equilibrio',
  rendimentoMensal: 0.9
}

// Conservador: mais folga e reserva maior. Arrojado: aceita apertar mais para chegar antes.
const PARAMETROS_POR_ESTILO: Record<EstiloPerfil, ParametrosFinanceiros> = {
  conservador: {
    metaPoupanca: 0.25,
    margemSeguranca: 0.15,
    tetoParcelas: 0.2,
    parcelasConfortaveis: 0.1,
    metaReservaMeses: 9
  },
  equilibrado: {
    metaPoupanca: 0.2,
    margemSeguranca: 0.1,
    tetoParcelas: 0.3,
    parcelasConfortaveis: 0.15,
    metaReservaMeses: 6
  },
  arrojado: {
    metaPoupanca: 0.15,
    margemSeguranca: 0.05,
    tetoParcelas: 0.35,
    parcelasConfortaveis: 0.2,
    metaReservaMeses: 4
  }
}

export function parametrosDoPerfil(perfil: PerfilFinanceiro): ParametrosFinanceiros {
  return PARAMETROS_POR_ESTILO[perfil.estilo]
}

export function validarPerfil(perfil: PerfilFinanceiro): PerfilFinanceiro {
  if (!(perfil.estilo in PARAMETROS_POR_ESTILO)) throw new ErroDominio('Estilo de perfil inválido.')
  if (!['guardar_primeiro', 'quitar_primeiro', 'equilibrio'].includes(perfil.prioridade)) {
    throw new ErroDominio('Prioridade de perfil inválida.')
  }
  if (!(perfil.rendimentoMensal >= 0 && perfil.rendimentoMensal <= 5)) {
    throw new ErroDominio('O rendimento esperado deve estar entre 0% e 5% ao mês.')
  }
  return perfil
}

// Perfil financeiro da família: muda os parâmetros usados na saúde financeira e nos planos.

export type EstiloPerfil = 'conservador' | 'equilibrado' | 'arrojado'
export type PrioridadePerfil = 'guardar_primeiro' | 'quitar_primeiro' | 'equilibrio'

export interface ParametrosFinanceirosDTO {
  metaPoupanca: number // fração da renda
  margemSeguranca: number
  tetoParcelas: number
  parcelasConfortaveis: number
  metaReservaMeses: number
}

export interface PerfilDTO {
  estilo: EstiloPerfil
  prioridade: PrioridadePerfil
  rendimentoMensal: number // percentual ao mês esperado para o dinheiro guardado
  definido: boolean // false enquanto o usuário não responder (usa o padrão)
  parametros: ParametrosFinanceirosDTO
}

export interface SalvarPerfilEntrada {
  estilo: EstiloPerfil
  prioridade: PrioridadePerfil
  rendimentoMensal: number
}

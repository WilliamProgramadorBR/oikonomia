import {
  Car,
  CircleDollarSign,
  Home,
  Landmark,
  Plane,
  ShieldCheck,
  type LucideIcon
} from 'lucide-react'
import type { TipoObjetivo, ViabilidadeObjetivo } from '@compartilhado/dtos/objetivo'
import type { EstiloPerfil, PrioridadePerfil } from '@compartilhado/dtos/perfil'

export const TIPOS_OBJETIVO: Record<TipoObjetivo, { nome: string; icone: LucideIcon; cor: string }> = {
  reserva: { nome: 'Reserva de emergência', icone: ShieldCheck, cor: '#0ea5e9' },
  viagem: { nome: 'Viagem', icone: Plane, cor: '#f59e0b' },
  compra: { nome: 'Compra', icone: Car, cor: '#8b5cf6' },
  casa: { nome: 'Casa / imóvel', icone: Home, cor: '#10b981' },
  quitar_divida: { nome: 'Quitar dívida', icone: Landmark, cor: '#ef4444' },
  outro: { nome: 'Outro objetivo', icone: CircleDollarSign, cor: '#6366f1' }
}

export const VIABILIDADES: Record<ViabilidadeObjetivo, { rotulo: string; cor: string }> = {
  concluido: { rotulo: 'Concluído', cor: 'var(--receita)' },
  no_caminho: { rotulo: 'No caminho', cor: 'var(--receita)' },
  viavel: { rotulo: 'Cabe no orçamento', cor: 'var(--receita)' },
  apertado: { rotulo: 'Exige cortes', cor: 'var(--alerta)' },
  inviavel_no_prazo: { rotulo: 'Não dá no prazo', cor: 'var(--despesa)' },
  aguardando: { rotulo: 'Na fila', cor: 'var(--primaria)' },
  sem_capacidade: { rotulo: 'Sem folga', cor: 'var(--despesa)' }
}

export const PRIORIDADES = { 1: 'Alta', 2: 'Média', 3: 'Baixa' } as const

export const ESTILOS: Record<EstiloPerfil, { nome: string; frase: string }> = {
  conservador: { nome: 'Conservador', frase: 'Prefiro segurança, mesmo que demore mais para chegar.' },
  equilibrado: { nome: 'Equilibrado', frase: 'Quero avançar sem abrir mão de uma boa margem.' },
  arrojado: { nome: 'Arrojado', frase: 'Aceito apertar agora para chegar antes.' }
}

export const PRIORIDADES_PERFIL: Record<PrioridadePerfil, { nome: string; frase: string }> = {
  quitar_primeiro: { nome: 'Quitar primeiro', frase: 'Sobrando dinheiro, primeiro me livro das dívidas.' },
  equilibrio: { nome: 'Equilibrar', frase: 'Divido entre quitar dívidas e guardar.' },
  guardar_primeiro: { nome: 'Guardar primeiro', frase: 'Sobrando dinheiro, primeiro garanto o guardado.' }
}

// Rendimento sugerido (% ao mês) para quem ainda não informou.
export const RENDIMENTO_SUGERIDO: Record<EstiloPerfil, number> = {
  conservador: 0.85,
  equilibrado: 0.9,
  arrojado: 1
}

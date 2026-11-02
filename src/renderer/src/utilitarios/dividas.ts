import {
  Banknote,
  Car,
  CircleDollarSign,
  CreditCard,
  HandCoins,
  Home,
  Landmark,
  type LucideIcon
} from 'lucide-react'
import type { TipoDivida } from '@compartilhado/dtos/divida'
import type { ModalidadeCredito } from '@compartilhado/dtos/taxa'

export const TIPOS_DIVIDA: Record<
  TipoDivida,
  { nome: string; icone: LucideIcon; cor: string; semParcela?: boolean; modalidade: ModalidadeCredito | null }
> = {
  emprestimo_pessoal: { nome: 'Empréstimo pessoal', icone: HandCoins, cor: '#f97316', modalidade: 'credito_pessoal' },
  consignado: { nome: 'Consignado', icone: Landmark, cor: '#6366f1', modalidade: 'consignado_privado' },
  financiamento_imovel: { nome: 'Financiamento imóvel', icone: Home, cor: '#10b981', modalidade: 'imobiliario_tr' },
  financiamento_veiculo: { nome: 'Financiamento veículo', icone: Car, cor: '#0ea5e9', modalidade: 'veiculos' },
  cheque_especial: { nome: 'Cheque especial', icone: Banknote, cor: '#ef4444', semParcela: true, modalidade: 'cheque_especial' },
  rotativo_cartao: { nome: 'Rotativo do cartão', icone: CreditCard, cor: '#dc2626', semParcela: true, modalidade: 'cartao_rotativo' },
  outro: { nome: 'Outra dívida', icone: CircleDollarSign, cor: '#64748b', semParcela: true, modalidade: null }
}

export const formatarTaxaCurta = (percentual: number) =>
  `${percentual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

import type { ApiFinanceiro } from '../compartilhado/contratos/api'

declare global {
  interface Window {
    api: ApiFinanceiro
  }
}

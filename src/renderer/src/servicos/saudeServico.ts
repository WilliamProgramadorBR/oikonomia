import type { SaudeFinanceiraDTO } from '@compartilhado/dtos/saude'
import { api, desembrulhar } from './api'

export const saudeServico = {
  obter(pessoaId: string | null): Promise<SaudeFinanceiraDTO> {
    return desembrulhar(api.saude.obter(pessoaId))
  }
}

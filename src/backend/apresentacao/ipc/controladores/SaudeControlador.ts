import type { SaudeFinanceiraDTO } from '@compartilhado/dtos/saude'
import type { ObterSaudeFinanceira } from '../../../aplicacao/casos-de-uso/saude/ObterSaudeFinanceira'

export class SaudeControlador {
  constructor(private readonly obterSaude: ObterSaudeFinanceira) {}

  obter(pessoaId: string | null): Promise<SaudeFinanceiraDTO> {
    return this.obterSaude.executar(pessoaId)
  }
}

export interface ConfiguracaoIA {
  chave: string | null
  modelo: string
  usarNosTextos: boolean
}

export const MODELO_PADRAO = 'gemini-2.5-flash'

export interface IConfiguracaoIARepositorio {
  obter(): Promise<ConfiguracaoIA>
  salvar(configuracao: { chave?: string | null; modelo: string; usarNosTextos: boolean }): Promise<void>
  criptografiaDisponivel(): boolean
}

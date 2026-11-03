// Open Finance via Pluggy (opcional). Cada usuário usa a própria conta Pluggy.

export interface ContaRemotaDTO {
  id: string // id da conta na Pluggy
  itemId: string
  nome: string
  tipo: 'corrente' | 'poupanca' | 'cartao' | 'outra'
  finalNumero: string | null
  saldoCentavos: number
  contaId: string | null // conta local vinculada (null = não importar)
  ultimaSincronizacao: string | null // AAAA-MM-DD
}

export interface ConexaoBancariaDTO {
  itemId: string
  instituicao: string
  cor: string | null
  situacao: 'atualizada' | 'atualizando' | 'precisa_autorizar' | 'erro'
  mensagem: string | null
  conectadoEm: string
  contas: ContaRemotaDTO[]
}

export interface EstadoOpenFinanceDTO {
  termo: {
    versaoAtual: string
    versaoAceita: string | null
    aceitoEm: string | null
    precisaAceitar: boolean // nunca aceitou ou o termo mudou de versão
  }
  credenciaisConfiguradas: boolean
  criptografiaDisponivel: boolean
  conexoes: ConexaoBancariaDTO[]
}

export interface CredenciaisOpenFinanceEntrada {
  clientId: string
  clientSecret: string
}

export interface VincularContaRemotaEntrada {
  contaRemotaId: string
  // contaId: liga a uma conta que já existe; nova: cria a conta local a partir da remota; null: não importar
  destino: { contaId: string } | { nova: { nome: string; pessoaId: string | null } } | null
}

export interface ConectarBancoEntrada {
  itemId?: string // reautorizar/atualizar uma conexão existente
  incluirSandbox?: boolean // mostra os bancos de teste da Pluggy (para experimentar sem dados reais)
}

export interface DesativarOpenFinanceEntrada {
  apagarCredenciais: boolean
}

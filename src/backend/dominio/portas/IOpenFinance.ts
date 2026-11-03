// Porta para um agregador de Open Finance (hoje a Pluggy). O domínio não conhece a API dele.

export interface CredenciaisAgregador {
  clientId: string
  clientSecret: string
}

export interface ItemConectado {
  id: string
  instituicao: string
  cor: string | null
  situacao: 'atualizada' | 'atualizando' | 'precisa_autorizar' | 'erro'
  mensagem: string | null
}

export interface ContaAgregador {
  id: string
  itemId: string
  nome: string
  tipo: 'corrente' | 'poupanca' | 'cartao' | 'outra'
  finalNumero: string | null
  saldoCentavos: number
}

export interface TransacaoAgregador {
  id: string
  data: string // AAAA-MM-DD
  valorCentavos: number // positivo entrou, negativo saiu
  descricao: string
}

export interface IAgregadorOpenFinance {
  testarCredenciais(credenciais: CredenciaisAgregador): Promise<void>
  criarTokenConexao(credenciais: CredenciaisAgregador, itemId?: string): Promise<string>
  obterItem(credenciais: CredenciaisAgregador, itemId: string): Promise<ItemConectado>
  listarContas(credenciais: CredenciaisAgregador, itemId: string): Promise<ContaAgregador[]>
  listarTransacoes(credenciais: CredenciaisAgregador, contaId: string, de: string, ate: string): Promise<TransacaoAgregador[]>
  apagarItem(credenciais: CredenciaisAgregador, itemId: string): Promise<void>
}

export interface ResultadoJanelaConexao {
  itemId: string | null // item conectado com sucesso
  itemComErro: string | null // a Pluggy criou o item, mas a conexão falhou (aparece com o motivo)
  erros: string[] // mensagens de erro informadas pelo widget
  eventos: string[] // passos percorridos (para diagnóstico)
}

// Onde o usuário escolhe o banco e autoriza (implementada pelo processo principal: hoje, no navegador do sistema).
export interface IJanelaConexaoBancaria {
  abrir(connectToken: string, opcoes: { itemId?: string; incluirSandbox?: boolean }): Promise<ResultadoJanelaConexao>
  cancelar?(): void // desiste da conexão em andamento (abrir resolve sem item)
  reabrir?(): void // abre de novo a página da conexão em andamento (se a pessoa fechou a aba)
}

import type { ContaAgregador, CredenciaisAgregador, ItemConectado } from '../portas/IOpenFinance'

export interface ConexaoSalva extends ItemConectado {
  conectadoEm: Date
}

export interface ContaRemotaSalva extends ContaAgregador {
  contaId: string | null // conta local vinculada
  ultimaSincronizacao: string | null // AAAA-MM-DD
}

export interface IOpenFinanceRepositorio {
  salvarConexao(conexao: ConexaoSalva): Promise<void>
  listarConexoes(): Promise<ConexaoSalva[]>
  removerConexao(itemId: string): Promise<void> // remove também as contas remotas dela
  salvarContaRemota(conta: ContaRemotaSalva): Promise<void>
  listarContasRemotas(): Promise<ContaRemotaSalva[]>
  buscarContaRemota(id: string): Promise<ContaRemotaSalva | null>
  buscarPorContaLocal(contaId: string): Promise<ContaRemotaSalva | null>
}

export interface AceiteTermo {
  versao: string
  aceitoEm: Date
  usuarioId: string | null
}

// Credenciais da Pluggy (cifradas) e registro do aceite do termo de ciência.
export interface IConfiguracaoOpenFinance {
  criptografiaDisponivel(): boolean
  credenciais(): CredenciaisAgregador | null
  salvarCredenciais(credenciais: CredenciaisAgregador): void
  apagarCredenciais(): void
  aceite(): AceiteTermo | null
  registrarAceite(aceite: AceiteTermo): void
  revogarAceite(revogadoEm: Date): void
}

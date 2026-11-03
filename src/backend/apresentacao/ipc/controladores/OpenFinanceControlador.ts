import type { PreviaImportacaoDTO } from '@compartilhado/dtos/conta'
import type {
  ConectarBancoEntrada,
  CredenciaisOpenFinanceEntrada,
  DesativarOpenFinanceEntrada,
  EstadoOpenFinanceDTO,
  VincularContaRemotaEntrada
} from '@compartilhado/dtos/openFinance'
import type {
  AceitarTermoOpenFinance,
  AtualizarConexao,
  ConcluirSincronizacao,
  ConectarBanco,
  DesativarOpenFinance,
  DesconectarBanco,
  ObterEstadoOpenFinance,
  SalvarCredenciaisOpenFinance,
  SincronizarContaOpenFinance,
  VerificarConexoes,
  VincularContaRemota
} from '../../../aplicacao/casos-de-uso/openfinance/OpenFinance'

export class OpenFinanceControlador {
  constructor(
    private readonly casos: {
      estado: ObterEstadoOpenFinance
      aceitarTermo: AceitarTermoOpenFinance
      salvarCredenciais: SalvarCredenciaisOpenFinance
      conectar: ConectarBanco
      atualizar: AtualizarConexao
      vincular: VincularContaRemota
      sincronizar: SincronizarContaOpenFinance
      concluir: ConcluirSincronizacao
      desconectar: DesconectarBanco
      desativar: DesativarOpenFinance
      verificar: VerificarConexoes
    }
  ) {}

  estado(): Promise<EstadoOpenFinanceDTO> {
    return this.casos.estado.executar()
  }
  aceitarTermo(versao: string): Promise<void> {
    return this.casos.aceitarTermo.executar(versao)
  }
  salvarCredenciais(entrada: CredenciaisOpenFinanceEntrada): Promise<void> {
    return this.casos.salvarCredenciais.executar(entrada)
  }
  conectar(entrada?: ConectarBancoEntrada): Promise<boolean> {
    return this.casos.conectar.executar(entrada)
  }
  atualizar(itemId: string): Promise<void> {
    return this.casos.atualizar.executar(itemId)
  }
  vincular(entrada: VincularContaRemotaEntrada): Promise<void> {
    return this.casos.vincular.executar(entrada)
  }
  sincronizar(contaId: string): Promise<PreviaImportacaoDTO> {
    return this.casos.sincronizar.executar(contaId)
  }
  concluirSincronizacao(contaId: string): Promise<void> {
    return this.casos.concluir.executar(contaId)
  }
  desconectar(itemId: string): Promise<{ apagadoNaPluggy: boolean }> {
    return this.casos.desconectar.executar(itemId)
  }
  verificarConexoes(): Promise<void> {
    return this.casos.verificar.executar()
  }
  desativar(entrada: DesativarOpenFinanceEntrada): Promise<{ mensagem: string }> {
    return this.casos.desativar.executar(entrada)
  }
}

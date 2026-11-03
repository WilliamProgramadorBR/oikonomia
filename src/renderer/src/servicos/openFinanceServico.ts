import type { PreviaImportacaoDTO } from '@compartilhado/dtos/conta'
import type {
  ConectarBancoEntrada,
  CredenciaisOpenFinanceEntrada,
  DesativarOpenFinanceEntrada,
  EstadoOpenFinanceDTO,
  VincularContaRemotaEntrada
} from '@compartilhado/dtos/openFinance'
import { api, desembrulhar } from './api'

export const openFinanceServico = {
  estado: (): Promise<EstadoOpenFinanceDTO> => desembrulhar(api.openFinance.estado()),
  aceitarTermo: (versao: string): Promise<void> => desembrulhar(api.openFinance.aceitarTermo(versao)),
  salvarCredenciais: (entrada: CredenciaisOpenFinanceEntrada): Promise<void> => desembrulhar(api.openFinance.salvarCredenciais(entrada)),
  conectar: (entrada?: ConectarBancoEntrada): Promise<boolean> => desembrulhar(api.openFinance.conectar(entrada)),
  atualizar: (itemId: string): Promise<void> => desembrulhar(api.openFinance.atualizar(itemId)),
  vincular: (entrada: VincularContaRemotaEntrada): Promise<void> => desembrulhar(api.openFinance.vincular(entrada)),
  sincronizar: (contaId: string): Promise<PreviaImportacaoDTO> => desembrulhar(api.openFinance.sincronizar(contaId)),
  concluirSincronizacao: (contaId: string): Promise<void> => desembrulhar(api.openFinance.concluirSincronizacao(contaId)),
  desconectar: (itemId: string): Promise<{ apagadoNaPluggy: boolean }> => desembrulhar(api.openFinance.desconectar(itemId)),
  desativar: (entrada: DesativarOpenFinanceEntrada): Promise<{ mensagem: string }> => desembrulhar(api.openFinance.desativar(entrada)),
  verificarConexoes: (): Promise<void> => desembrulhar(api.openFinance.verificarConexoes()),
  conexaoEmAndamento: (acao: 'cancelar' | 'reabrir'): Promise<void> => desembrulhar(api.openFinance.conexaoEmAndamento(acao))
}

import { join } from 'node:path'
import { app, BrowserWindow, dialog } from 'electron'
import { criarContainer, type Container } from '@backend/principal/container'
import { registrarHandlersIpc } from '@backend/apresentacao/ipc/registrarHandlersIpc'
import { iniciarAtualizador } from './atualizador'
import { criarJanelaConexaoBancaria } from './conexaoBancaria'
import { criarJanelaPrincipal } from './janela'

let container: Container | null = null

// Uma instância só: o banco vive em memória e duas cópias abertas sobrescreveriam os dados uma da outra.
if (!app.requestSingleInstanceLock()) app.quit()

app.on('second-instance', () => {
  const janela = BrowserWindow.getAllWindows()[0]
  if (janela?.isMinimized()) janela.restore()
  janela?.focus()
})

app.whenReady().then(async () => {
  try {
    container = criarContainer(join(app.getPath('userData'), 'financeiro.db'), {
      desenvolvimento: !app.isPackaged,
      versao: app.getVersion(),
      janelaConexaoBancaria: criarJanelaConexaoBancaria()
    })
  } catch (erro) {
    dialog.showErrorBox('Não foi possível abrir os dados', (erro as Error).message)
    app.quit()
    return
  }
  registrarHandlersIpc(container)
  iniciarAtualizador(() => container?.armazenamento.persistir(true))

  // Completa as previsões das contas recorrentes (ex.: o mês virou desde a última abertura).
  await container.recorrenciaControlador
    .sincronizar()
    .catch((erro) => console.error('[recorrências] falha ao sincronizar:', erro))
  container.armazenamento.persistir()

  criarJanelaPrincipal()

  // Em segundo plano: sem internet, o app segue com as últimas taxas salvas.
  container.taxaControlador
    .atualizarSeNecessario()
    .catch((erro) => console.warn('[taxas] não foi possível atualizar:', erro.message))
    .finally(() => container?.armazenamento.persistir())

  // Rede de segurança para alterações feitas fora do IPC (ex.: atualização de taxas em segundo plano).
  setInterval(() => container?.armazenamento.persistir(), 15_000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanelaPrincipal()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  container?.armazenamento.fechar()
})

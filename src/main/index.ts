import { join } from 'node:path'
import { app, BrowserWindow, dialog } from 'electron'
import { criarContainer, type Container } from '@backend/principal/container'
import { registrarHandlersIpc } from '@backend/apresentacao/ipc/registrarHandlersIpc'
import { iniciarAtualizador } from './atualizador'
import { criarConexaoNoNavegador } from './conexaoNoNavegador'
import { criarJanelaPrincipal } from './janela'

let container: Container | null = null
let encerramentoIniciado = false
let armazenamentoFechado = false

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
      janelaConexaoBancaria: criarConexaoNoNavegador()
    })
  } catch (erro) {
    dialog.showErrorBox('Não foi possível abrir os dados', (erro as Error).message)
    app.quit()
    return
  }
  registrarHandlersIpc(container)
  iniciarAtualizador(async () => {
    await container?.armazenamento.persistirQuandoDisponivel(true)
  })

  // Completa as previsões das contas recorrentes (ex.: o mês virou desde a última abertura).
  await container.armazenamento
    .executarAtomico(() => container!.recorrenciaControlador.sincronizar())
    .catch((erro) => console.error(`[recorrências] falha ao sincronizar (${(erro as Error).name})`))

  criarJanelaPrincipal()

  // Em segundo plano: sem internet, o app segue com as últimas taxas salvas.
  void container.armazenamento
    .executarAtomico(() => container!.taxaControlador.atualizarSeNecessario())
    .catch((erro) => console.warn(`[taxas] não foi possível atualizar (${(erro as Error).name})`))

  // Rede de segurança para alterações feitas fora do IPC (ex.: atualização de taxas em segundo plano).
  setInterval(() => {
    void container?.armazenamento
      .persistirQuandoDisponivel()
      .catch((erro) => console.error(`[banco] falha na gravação periódica (${(erro as Error).name})`))
  }, 15_000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanelaPrincipal()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Espera uma operação IPC em andamento terminar (ou ser revertida) antes de encerrar o banco.
app.on('before-quit', (evento) => {
  if (!container || armazenamentoFechado) return
  evento.preventDefault()
  if (encerramentoIniciado) return
  encerramentoIniciado = true
  void container.armazenamento
    .fecharQuandoDisponivel()
    .catch((erro) => {
      console.error(`[banco] falha ao fechar (${(erro as Error).name})`)
      dialog.showErrorBox(
        'Não foi possível salvar os dados',
        'O aplicativo não conseguiu confirmar a última gravação. Uma versão anterior cifrada foi preservada.'
      )
    })
    .finally(() => {
      armazenamentoFechado = true
      app.quit()
    })
})

import { app, BrowserWindow, ipcMain } from 'electron'
import electronUpdater from 'electron-updater'
import { CANAIS } from '@compartilhado/contratos/canais'
import type { Resposta } from '@compartilhado/contratos/resposta'
import type { EstadoAtualizacaoDTO } from '@compartilhado/dtos/atualizacao'

const { autoUpdater } = electronUpdater

const INTERVALO_VERIFICACAO = 4 * 60 * 60 * 1000
const ATRASO_PRIMEIRA_VERIFICACAO = 10_000

// Atualização automática pelas Releases do GitHub (configuradas em `publish` no electron-builder.yml).
// Baixa em segundo plano, avisa a tela e instala ao fechar o app ou quando o usuário pedir.
export function iniciarAtualizador(antesDeInstalar: () => void): void {
  let estado: EstadoAtualizacaoDTO = {
    fase: app.isPackaged ? 'atualizado' : 'inativo',
    versaoAtual: app.getVersion(),
    versaoNova: null,
    progresso: null,
    mensagem: app.isPackaged ? null : 'A atualização automática funciona só no app instalado.'
  }

  const mudar = (parcial: Partial<EstadoAtualizacaoDTO>) => {
    estado = { ...estado, ...parcial }
    for (const janela of BrowserWindow.getAllWindows()) janela.webContents.send(CANAIS.atualizacao.mudou, estado)
  }
  const responder = <T>(dados: T): Resposta<T> => ({ sucesso: true, dados })

  ipcMain.handle(CANAIS.atualizacao.obter, () => responder(estado))
  ipcMain.handle(CANAIS.atualizacao.verificar, async () => {
    if (app.isPackaged && !['baixando', 'pronta'].includes(estado.fase)) await verificar()
    return responder(estado)
  })
  ipcMain.handle(CANAIS.atualizacao.instalar, () => {
    if (estado.fase !== 'pronta') return { sucesso: false, erro: 'Nenhuma atualização pronta para instalar.' }
    antesDeInstalar() // grava o banco cifrado antes de fechar
    setImmediate(() => autoUpdater.quitAndInstall(true, true))
    return responder(estado)
  })

  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = null

  autoUpdater.on('checking-for-update', () => mudar({ fase: 'verificando', mensagem: null }))
  autoUpdater.on('update-not-available', () => mudar({ fase: 'atualizado', versaoNova: null, progresso: null }))
  autoUpdater.on('update-available', (info) => mudar({ fase: 'baixando', versaoNova: info.version, progresso: 0 }))
  autoUpdater.on('download-progress', (p) => mudar({ fase: 'baixando', progresso: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (info) => mudar({ fase: 'pronta', versaoNova: info.version, progresso: 100 }))
  autoUpdater.on('error', (erro) => {
    // Sem internet ou GitHub fora do ar não é problema: tenta de novo na próxima rodada.
    console.warn('[atualização]', erro.message)
    mudar({ fase: 'erro', progresso: null, mensagem: 'Não foi possível verificar atualizações agora.' })
  })

  async function verificar() {
    try {
      await autoUpdater.checkForUpdates()
    } catch {
      // o evento 'error' já atualizou o estado
    }
  }

  setTimeout(verificar, ATRASO_PRIMEIRA_VERIFICACAO)
  setInterval(() => {
    if (estado.fase !== 'pronta' && estado.fase !== 'baixando') void verificar()
  }, INTERVALO_VERIFICACAO)
}

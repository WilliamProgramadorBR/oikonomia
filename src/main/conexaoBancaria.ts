import { join } from 'node:path'
import { BrowserWindow, ipcMain, shell } from 'electron'
import type { IJanelaConexaoBancaria } from '@backend/dominio/portas/IOpenFinance'

const CANAL_RESULTADO = 'conexao-bancaria:resultado'
const ORIGENS_PLUGGY = /^https:\/\/([a-z0-9-]+\.)*pluggy\.ai(\/|$)/i

const hostDe = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

// Pop-ups da autorização (site do banco): só https (ou a página em branco que o widget abre primeiro),
// sem preload/ponte, sandbox e a mesma sessão isolada. O título mostra o endereço real, para conferir
// que é o domínio do banco. A regra vale também para pop-ups abertos a partir do pop-up.
function aplicarPoliticaDePopups(janela: BrowserWindow) {
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (url !== 'about:blank' && !url.startsWith('https://')) return { action: 'deny' }
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        parent: janela,
        width: 520,
        height: 760,
        autoHideMenuBar: true,
        title: 'Autorização segura',
        webPreferences: {
          preload: undefined,
          partition: 'conexao-bancaria',
          contextIsolation: true,
          sandbox: true,
          nodeIntegration: false,
          webSecurity: true
        }
      }
    }
  })
  janela.webContents.on('did-create-window', (popup, { url: urlInicial }) => {
    const atualizarTitulo = (url = popup.webContents.getURL()) => {
      const host = hostDe(url)
      if (host && !popup.isDestroyed()) popup.setTitle(`Autorização segura · ${host}`)
    }
    atualizarTitulo(urlInicial) // já na criação: a primeira navegação pode ocorrer antes dos ouvintes
    popup.webContents.on('page-title-updated', (evento) => {
      evento.preventDefault()
      atualizarTitulo()
    })
    popup.webContents.on('did-navigate', (_evento, url) => atualizarTitulo(url))
    popup.webContents.on('did-redirect-navigation', (_evento, url) => atualizarTitulo(url))
    popup.webContents.on('did-finish-load', () => atualizarTitulo())
    popup.webContents.on('will-navigate', (evento, url) => {
      if (!url.startsWith('https://')) evento.preventDefault() // nada de file://, javascript:, esquemas de app
    })
    aplicarPoliticaDePopups(popup)
  })
}

// Janela isolada para o widget oficial da Pluggy:
// - sessão própria (partition) e sandbox: o widget não enxerga cookies, armazenamento nem a ponte do app;
// - a ponte desta janela só sabe dizer "concluiu (itemId)", "cancelou" ou "erro";
// - a autorização no banco (OAuth do Open Finance) abre no navegador do sistema, fora do app.
export function criarJanelaConexaoBancaria(): IJanelaConexaoBancaria {
  return {
    abrir: (connectToken, { itemId, incluirSandbox }) =>
      new Promise((resolver) => {
        const pai = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
        const janela = new BrowserWindow({
          parent: pai,
          modal: true,
          width: 520,
          height: 760,
          minWidth: 420,
          title: 'Conectar banco · Pluggy',
          autoHideMenuBar: true,
          show: false,
          webPreferences: {
            preload: join(__dirname, '../preload/conexaoBancaria.js'),
            partition: 'conexao-bancaria',
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
            webSecurity: true
          }
        })
        let concluido = false
        const terminar = (resultado: string | null) => {
          if (concluido) return
          concluido = true
          ipcMain.removeListener(CANAL_RESULTADO, aoReceber)
          resolver(resultado)
          if (!janela.isDestroyed()) janela.close()
        }
        const aoReceber = (evento: Electron.IpcMainEvent, dados: { itemId?: string | null; erro?: string }) => {
          if (evento.sender !== janela.webContents) return // só aceita mensagens desta janela
          if (dados.erro) console.warn('[open finance] widget:', dados.erro)
          terminar(typeof dados.itemId === 'string' && /^[\w-]{8,64}$/.test(dados.itemId) ? dados.itemId : null)
        }
        ipcMain.on(CANAL_RESULTADO, aoReceber)

        // A autorização do banco (OAuth do Open Finance) acontece num pop-up que o widget acompanha.
        // O pop-up é permitido, mas como janela isolada: sem ponte, mesma sessão separada, só https.
        aplicarPoliticaDePopups(janela)
        janela.webContents.on('will-navigate', (evento, url) => {
          if (!url.startsWith('file://') && !(process.env['ELECTRON_RENDERER_URL'] && url.startsWith(process.env['ELECTRON_RENDERER_URL']))) {
            evento.preventDefault()
            if (ORIGENS_PLUGGY.test(url) || url.startsWith('https://')) void shell.openExternal(url)
          }
        })
        // Sem câmera, microfone, localização etc.
        janela.webContents.session.setPermissionRequestHandler((_wc, _permissao, responder) => responder(false))

        janela.once('ready-to-show', () => janela.show())
        janela.on('closed', () => terminar(null))

        const parametros = new URLSearchParams({ token: connectToken, ...(itemId ? { item: itemId } : {}), ...(incluirSandbox ? { sandbox: '1' } : {}) })
        if (process.env['ELECTRON_RENDERER_URL']) void janela.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/conexao-bancaria.html#${parametros}`)
        else void janela.loadFile(join(__dirname, '../renderer/conexao-bancaria.html'), { hash: parametros.toString() })
      })
  }
}

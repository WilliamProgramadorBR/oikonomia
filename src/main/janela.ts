import { join } from 'node:path'
import { app, BrowserWindow, shell } from 'electron'

export function criarJanelaPrincipal(): BrowserWindow {
  const janela = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Projeto Financeiro',
    // Empacotado, o ícone vem do próprio executável; em desenvolvimento usa o da pasta resources.
    ...(app.isPackaged ? {} : { icon: join(__dirname, '../../resources/icon-256.png') }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Sem barra de menu. (O autoHideMenuBar tem um bug no Windows: ao maximizar, o conteúdo pode ficar
  // preso no tamanho antigo, deixando uma faixa vazia embaixo.) Ao mudar o tamanho, força o redesenho.
  janela.removeMenu()
  const redesenhar = () => setTimeout(() => !janela.isDestroyed() && janela.webContents.invalidate(), 60)
  janela.on('maximize', redesenhar)
  janela.on('unmaximize', redesenhar)
  janela.on('restore', redesenhar)
  janela.on('enter-full-screen', redesenhar)
  janela.on('leave-full-screen', redesenhar)
  janela.on('ready-to-show', () => janela.show())

  // Links externos (só https) abrem no navegador padrão, nunca dentro do app.
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // A janela nunca sai do próprio app (protege a ponte `window.api` de páginas externas).
  janela.webContents.on('will-navigate', (evento, url) => {
    const local = url.startsWith('file://') || (process.env['ELECTRON_RENDERER_URL'] && url.startsWith(process.env['ELECTRON_RENDERER_URL']))
    if (!local) evento.preventDefault()
  })

  // Em desenvolvimento o electron-vite expõe a URL do servidor do Vite (hot reload).
  if (process.env['ELECTRON_RENDERER_URL']) {
    janela.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    janela.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return janela
}

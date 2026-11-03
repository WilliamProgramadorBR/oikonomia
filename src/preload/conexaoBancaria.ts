import { contextBridge, ipcRenderer } from 'electron'

// Ponte mínima da janela da Pluggy: só devolve o resultado ao processo principal.
// Nada de banco de dados, sessão ou credenciais por aqui.
const CANAL = 'conexao-bancaria:resultado'
const CANAL_EVENTO = 'conexao-bancaria:evento'

// Só a página do próprio app recebe a ponte; o site do banco (no pop-up de autorização) não.
const local = (globalThis as { location?: { protocol: string; hostname: string } }).location
const paginaDoApp = local?.protocol === 'file:' || local?.hostname === 'localhost'

if (paginaDoApp) contextBridge.exposeInMainWorld('ponteConexao', {
  concluir: (itemId: string) => ipcRenderer.send(CANAL, { itemId }),
  cancelar: () => ipcRenderer.send(CANAL, { itemId: null }),
  erro: (mensagem: string) => ipcRenderer.send(CANAL, { itemId: null, erro: String(mensagem).slice(0, 300) }),
  // Diagnóstico: passos do widget e erros informados pela Pluggy (sem dados pessoais).
  registrar: (tipo: string, detalhe?: string, itemId?: string) =>
    ipcRenderer.send(CANAL_EVENTO, { tipo: String(tipo).slice(0, 40), detalhe: detalhe ? String(detalhe).slice(0, 300) : undefined, itemId })
})

import { contextBridge, ipcRenderer } from 'electron'

// Ponte mínima da janela da Pluggy: só devolve o resultado ao processo principal.
// Nada de banco de dados, sessão ou credenciais por aqui.
const CANAL = 'conexao-bancaria:resultado'

contextBridge.exposeInMainWorld('ponteConexao', {
  concluir: (itemId: string) => ipcRenderer.send(CANAL, { itemId }),
  cancelar: () => ipcRenderer.send(CANAL, { itemId: null }),
  erro: (mensagem: string) => ipcRenderer.send(CANAL, { itemId: null, erro: String(mensagem).slice(0, 300) })
})

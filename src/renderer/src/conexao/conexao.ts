import { PluggyConnect } from 'pluggy-connect-sdk'

// Página da janela isolada: abre o widget oficial da Pluggy e devolve só o id do item conectado.
interface PonteConexao {
  concluir(itemId: string): void
  cancelar(): void
  erro(mensagem: string): void
}
const ponte = (window as unknown as { ponteConexao: PonteConexao }).ponteConexao

const parametros = new URLSearchParams(location.hash.slice(1))
const connectToken = parametros.get('token')
history.replaceState(null, '', location.pathname) // o token não fica na barra/histórico

if (!connectToken) {
  ponte.erro('Token de conexão ausente.')
} else {
  const widget = new PluggyConnect({
    connectToken,
    updateItem: parametros.get('item') ?? undefined,
    includeSandbox: parametros.get('sandbox') === '1',
    // Minimização de dados: só contas e transações.
    products: ['ACCOUNTS', 'TRANSACTIONS'] as never,
    countries: ['BR'] as never,
    language: 'pt',
    theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    // Login/consentimento do banco no navegador do sistema, nunca dentro do app.
    forceOauthInBrowser: true,
    allowFullscreen: true,
    onSuccess: ({ item }) => ponte.concluir(item.id),
    onError: ({ message }) => console.warn('[pluggy]', message), // o widget mostra o erro; a pessoa fecha quando quiser
    onClose: () => ponte.cancelar()
  })
  widget
    .init()
    .then(() => document.getElementById('aviso')?.remove())
    .catch((erro: Error) => ponte.erro(erro.message))
}

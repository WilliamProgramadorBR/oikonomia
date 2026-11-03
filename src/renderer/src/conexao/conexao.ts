import { PluggyConnect } from 'pluggy-connect-sdk'

// Página da janela isolada: abre o widget oficial da Pluggy e devolve só o id do item conectado.
interface PonteConexao {
  concluir(itemId: string): void
  cancelar(): void
  erro(mensagem: string): void
  registrar(tipo: string, detalhe?: string, itemId?: string): void
}

interface ItemPluggy {
  id?: string
  status?: string
  executionStatus?: string
  error?: { code?: string; message?: string } | null
}

// Resumo do item para o diagnóstico: situação e código de erro, nunca dados da conta.
const resumir = (item?: ItemPluggy) =>
  item ? [item.status, item.executionStatus, item.error?.code, item.error?.message].filter(Boolean).join(' / ') : undefined
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
    // Login/consentimento do banco num pop-up isolado (sem ponte com o app), que o widget acompanha até concluir.
    forceOauthInBrowser: false,
    allowFullscreen: true,
    onSuccess: ({ item }) => ponte.concluir(item.id),
    onError: ({ message, data }) => {
      const item = data?.item as ItemPluggy | undefined
      // O widget mostra o erro; a pessoa fecha quando quiser. O motivo volta para o app mostrar.
      ponte.registrar('ERRO', [message, resumir(item)].filter(Boolean).join(' | '), item?.id)
    },
    onEvent: (evento) => {
      const item = 'item' in evento ? (evento.item as ItemPluggy) : undefined
      const instituicao = 'connector' in evento ? evento.connector?.name : undefined
      ponte.registrar(evento.event, instituicao ?? resumir(item), item?.id)
    },
    onClose: () => ponte.cancelar()
  })
  widget
    .init()
    .then(() => document.getElementById('aviso')?.remove())
    .catch((erro: Error) => ponte.erro(erro.message))
}

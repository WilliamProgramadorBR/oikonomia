import { PluggyConnect } from 'pluggy-connect-sdk'

// Página da conexão, aberta no navegador do sistema: abre o widget oficial da Pluggy e devolve ao app
// (servidor local temporário em 127.0.0.1, endereço com código secreto) só o id do item conectado.
interface ItemPluggy {
  id?: string
  status?: string
  executionStatus?: string
  error?: { code?: string; message?: string } | null
}

// Resumo do item para o diagnóstico: situação e código de erro, nunca dados da conta.
const resumir = (item?: ItemPluggy) =>
  item ? [item.status, item.executionStatus, item.error?.code, item.error?.message].filter(Boolean).join(' / ') : undefined

const parametros = new URLSearchParams(location.hash.slice(1))
const connectToken = parametros.get('token')
const retorno = parametros.get('retorno') ?? ''
history.replaceState(null, '', location.pathname) // o token não fica na barra/histórico

// Só devolve para o servidor local do app.
const retornoValido = /^http:\/\/127\.0\.0\.1:\d+\/[\w-]+$/.test(retorno)

const enviar = (rota: 'evento' | 'resultado', dados: Record<string, unknown>) =>
  retornoValido
    ? fetch(`${retorno}/${rota}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) }).catch(
        () => undefined
      )
    : Promise.resolve(undefined)

const registrar = (tipo: string, detalhe?: string, itemId?: string) =>
  void enviar('evento', { tipo: String(tipo).slice(0, 40), detalhe: detalhe ? String(detalhe).slice(0, 300) : undefined, itemId })

function mostrar(titulo: string, texto: string) {
  document.body.innerHTML = ''
  const aviso = document.createElement('div')
  aviso.className = 'aviso'
  const forte = document.createElement('strong')
  forte.textContent = titulo
  const pequeno = document.createElement('small')
  pequeno.textContent = texto
  aviso.append(forte, pequeno)
  document.body.append(aviso)
}

async function concluir(dados: { itemId: string | null; erro?: string }) {
  await enviar('resultado', dados)
  if (dados.itemId) mostrar('Banco conectado!', 'Pode fechar esta aba e voltar ao Projeto Financeiro.')
  else if (dados.erro) mostrar('Não foi possível conectar.', `${dados.erro} Pode fechar esta aba e voltar ao app.`)
  else mostrar('Conexão cancelada.', 'Pode fechar esta aba e voltar ao Projeto Financeiro.')
}

if (!connectToken || !retornoValido) {
  mostrar('Link de conexão inválido ou expirado.', 'Volte ao Projeto Financeiro e clique em "Conectar banco" de novo.')
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
    // Num navegador de verdade, o login/consentimento do banco segue o fluxo padrão da Pluggy.
    allowFullscreen: true,
    onSuccess: ({ item }) => void concluir({ itemId: item.id }),
    onError: ({ message, data }) => {
      const item = data?.item as ItemPluggy | undefined
      // O widget mostra o erro; a pessoa fecha quando quiser. O motivo volta para o app mostrar.
      registrar('ERRO', [message, resumir(item)].filter(Boolean).join(' | '), item?.id)
    },
    onEvent: (evento) => {
      const item = 'item' in evento ? (evento.item as ItemPluggy) : undefined
      const instituicao = 'connector' in evento ? evento.connector?.name : undefined
      registrar(evento.event, instituicao ?? resumir(item), item?.id)
    },
    onClose: () => void concluir({ itemId: null })
  })
  widget
    .init()
    .then(() => document.getElementById('aviso')?.remove())
    .catch((erro: Error) => void concluir({ itemId: null, erro: erro.message }))
}

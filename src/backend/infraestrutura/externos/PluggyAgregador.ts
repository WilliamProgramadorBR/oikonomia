import { ErroDominio } from '../../dominio/erros/ErroDominio'
import type {
  ContaAgregador,
  CredenciaisAgregador,
  IAgregadorOpenFinance,
  ItemConectado,
  TransacaoAgregador
} from '../../dominio/portas/IOpenFinance'

// Cliente da API da Pluggy (https://docs.pluggy.ai). Chamado só pelo processo principal:
// as credenciais nunca chegam à tela. A apiKey dura 2 h; guardamos em memória por menos tempo.
const VALIDADE_API_KEY = 100 * 60 * 1000
const TEMPO_LIMITE = 30_000

interface ItemPluggy {
  id: string
  status: string
  executionStatus?: string
  error?: { message?: string } | null
  connector?: { name?: string; primaryColor?: string }
}

interface ContaPluggy {
  id: string
  itemId: string
  type: string
  subtype?: string
  name?: string
  marketingName?: string
  number?: string
  balance?: number
}

interface TransacaoPluggy {
  id: string
  date: string
  description?: string
  descriptionRaw?: string
  amount: number
  type?: 'DEBIT' | 'CREDIT'
  status?: string
}

export class PluggyAgregador implements IAgregadorOpenFinance {
  private cache: { clientId: string; apiKey: string; expiraEm: number } | null = null

  constructor(private readonly url = 'https://api.pluggy.ai') {}

  async testarCredenciais(credenciais: CredenciaisAgregador): Promise<void> {
    this.cache = null
    await this.apiKey(credenciais)
  }

  async criarTokenConexao(credenciais: CredenciaisAgregador, itemId?: string): Promise<string> {
    const resposta = await this.chamar<{ accessToken: string }>(credenciais, 'POST', '/connect_token', {
      ...(itemId ? { itemId } : {}),
      options: { avoidDuplicates: true }
    })
    return resposta.accessToken
  }

  async obterItem(credenciais: CredenciaisAgregador, itemId: string): Promise<ItemConectado> {
    const item = await this.chamar<ItemPluggy>(credenciais, 'GET', `/items/${encodeURIComponent(itemId)}`)
    return {
      id: item.id,
      instituicao: item.connector?.name ?? 'Banco',
      cor: item.connector?.primaryColor ? `#${item.connector.primaryColor.replace(/^#/, '')}` : null,
      situacao:
        item.status === 'UPDATED'
          ? 'atualizada'
          : item.status === 'UPDATING'
            ? 'atualizando'
            : ['LOGIN_ERROR', 'OUTDATED', 'WAITING_USER_INPUT'].includes(item.status)
              ? 'precisa_autorizar'
              : 'erro',
      mensagem: item.error?.message ?? null
    }
  }

  async listarContas(credenciais: CredenciaisAgregador, itemId: string): Promise<ContaAgregador[]> {
    const { results } = await this.chamar<{ results: ContaPluggy[] }>(credenciais, 'GET', `/accounts?itemId=${encodeURIComponent(itemId)}`)
    return results.map((c) => ({
      id: c.id,
      itemId: c.itemId ?? itemId,
      nome: c.marketingName || c.name || 'Conta',
      tipo:
        c.subtype === 'CHECKING_ACCOUNT' ? 'corrente' : c.subtype === 'SAVINGS_ACCOUNT' ? 'poupanca' : c.type === 'CREDIT' ? 'cartao' : 'outra',
      finalNumero: c.number ? c.number.replace(/\D/g, '').slice(-4) || null : null,
      saldoCentavos: Math.round((c.balance ?? 0) * 100)
    }))
  }

  async listarTransacoes(credenciais: CredenciaisAgregador, contaId: string, de: string, ate: string): Promise<TransacaoAgregador[]> {
    const todas: TransacaoAgregador[] = []
    for (let pagina = 1; pagina <= 20; pagina++) {
      const consulta = new URLSearchParams({ accountId: contaId, from: de, to: ate, pageSize: '500', page: String(pagina) })
      const resposta = await this.chamar<{ results: TransacaoPluggy[]; totalPages?: number }>(credenciais, 'GET', `/transactions?${consulta}`)
      for (const t of resposta.results) {
        if (t.status === 'PENDING') continue // só o que já foi efetivado
        const valor = Math.round(Math.abs(t.amount) * 100)
        if (!valor) continue
        const saiu = t.type ? t.type === 'DEBIT' : t.amount < 0
        todas.push({ id: t.id, data: t.date.slice(0, 10), valorCentavos: saiu ? -valor : valor, descricao: (t.descriptionRaw || t.description || 'Lançamento').trim() })
      }
      if (!resposta.totalPages || pagina >= resposta.totalPages) break
    }
    return todas
  }

  async apagarItem(credenciais: CredenciaisAgregador, itemId: string): Promise<void> {
    await this.chamar(credenciais, 'DELETE', `/items/${encodeURIComponent(itemId)}`)
  }

  private async apiKey(credenciais: CredenciaisAgregador): Promise<string> {
    if (this.cache && this.cache.clientId === credenciais.clientId && this.cache.expiraEm > Date.now()) return this.cache.apiKey
    const resposta = await this.requisitar('POST', '/auth', { clientId: credenciais.clientId, clientSecret: credenciais.clientSecret })
    if (resposta.status === 401 || resposta.status === 403 || resposta.status === 400) {
      throw new ErroDominio('A Pluggy recusou as credenciais. Confira o Client ID e o Client Secret da sua aplicação.')
    }
    const corpo = (await this.lerJson(resposta)) as { apiKey?: string }
    if (!corpo.apiKey) throw new ErroDominio('A Pluggy não devolveu a chave de acesso.')
    this.cache = { clientId: credenciais.clientId, apiKey: corpo.apiKey, expiraEm: Date.now() + VALIDADE_API_KEY }
    return corpo.apiKey
  }

  private async chamar<T>(credenciais: CredenciaisAgregador, metodo: string, caminho: string, corpo?: unknown, tentouDeNovo = false): Promise<T> {
    const resposta = await this.requisitar(metodo, caminho, corpo, await this.apiKey(credenciais))
    if (resposta.status === 401 && !tentouDeNovo) {
      this.cache = null // apiKey expirou antes do previsto
      return this.chamar(credenciais, metodo, caminho, corpo, true)
    }
    if (resposta.status === 404) throw new ErroDominio('A conexão não existe mais na Pluggy. Conecte o banco de novo.')
    if (!resposta.ok) {
      const detalhe = ((await this.lerJson(resposta).catch(() => ({}))) as { message?: string }).message
      throw new ErroDominio(`A Pluggy respondeu com erro (${resposta.status})${detalhe ? `: ${detalhe}` : ''}.`)
    }
    return (resposta.status === 204 ? {} : await this.lerJson(resposta)) as T
  }

  private async requisitar(metodo: string, caminho: string, corpo?: unknown, apiKey?: string): Promise<Response> {
    try {
      return await fetch(`${this.url}${caminho}`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(apiKey ? { 'X-API-KEY': apiKey } : {}) },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        signal: AbortSignal.timeout(TEMPO_LIMITE)
      })
    } catch {
      throw new ErroDominio('Não foi possível falar com a Pluggy. Verifique a internet e tente de novo.')
    }
  }

  private async lerJson(resposta: Response): Promise<unknown> {
    return resposta.json()
  }
}

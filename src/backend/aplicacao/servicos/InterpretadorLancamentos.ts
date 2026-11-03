import type { FormaLancamento, PropostaLancamentoDTO } from '@compartilhado/dtos/lancamentosTexto'
import type { Cartao } from '../../dominio/entidades/Cartao'
import type { Categoria } from '../../dominio/entidades/Categoria'
import type { Pessoa } from '../../dominio/entidades/Pessoa'

// Interpretação de lançamentos sem IA (e o "saneamento" das propostas vindas da IA).
// Cobre as frases do dia a dia: "gastei 85 no mercado", "recebi 300 de freela ontem",
// "aluguel 1500 todo dia 10 pra casa", "comprei um tênis de 600 em 3x no Nubank".

export interface ContextoInterpretacao {
  hoje: string // AAAA-MM-DD
  categorias: Categoria[]
  pessoas: Pessoa[]
  cartoes: Cartao[]
  pessoaDoUsuario: string | null // membro ligado a quem está conectado ("eu")
}

export type PropostaBruta = Partial<Omit<PropostaLancamentoDTO, 'chave'>> & { valorCentavos?: number }

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const DIA = 24 * 60 * 60 * 1000
const somarDias = (iso: string, dias: number) =>
  new Date(new Date(`${iso}T00:00:00Z`).getTime() + dias * DIA).toISOString().slice(0, 10)
const dataValida = (iso: unknown): iso is string =>
  typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(new Date(`${iso}T00:00:00Z`).getTime())

const VERBOS_DESPESA = /\b(gastei|paguei|comprei|gastou|pagou|comprou|pago|gasto|gastamos|pagamos|compramos|conta de|parcela)\b/
const VERBOS_RECEITA = /\b(recebi|ganhei|recebeu|ganhou|recebemos|ganhamos|entrou|entrada|salario|freela|freelance|reembolso|pix recebido)\b/
const VERBOS_GUARDADO = /\b(guardei|investi|apliquei|poupei|guardou|investiu|guardamos|investimos|aporte|reserva)\b/
const RECORRENTE = /\b(todo mes|todos os meses|todo dia \d{1,2}|mensal|mensalmente|por mes|ao mes|assinatura)\b/
const CASA = /\b(casa|todos|familia|nos dois|da gente|pra gente|para gente)\b/

// Palavras que indicam a categoria (pelo id das categorias padrão).
const PALAVRAS_CATEGORIA: [RegExp, string][] = [
  [/\b(aluguel|condominio|iptu|financiamento da casa|reforma|moveis)\b/, 'cat-moradia'],
  [/\b(luz|energia|agua|internet|telefone|celular|gas|conta de)\b/, 'cat-contas'],
  [/\b(mercado|supermercado|feira|hortifruti|acougue|padaria|atacadao)\b/, 'cat-mercado'],
  [/\b(restaurante|lanche|ifood|almoco|jantar|pizza|hamburguer|cafe|delivery|comida)\b/, 'cat-alimentacao'],
  [/\b(uber|99|gasolina|combustivel|onibus|metro|estacionamento|pedagio|oficina|carro|moto)\b/, 'cat-transporte'],
  [/\b(farmacia|remedio|medico|consulta|exame|dentista|plano de saude|academia)\b/, 'cat-saude'],
  [/\b(faculdade|curso|escola|mensalidade|livro|material escolar|pos)\b/, 'cat-educacao'],
  [/\b(netflix|spotify|chatgpt|gemini|claude|assinatura|streaming|youtube premium|amazon prime|disney)\b/, 'cat-assinaturas'],
  [/\b(cinema|show|viagem|bar|passeio|jogo|lazer|festa)\b/, 'cat-lazer'],
  [/\b(roupa|tenis|sapato|eletronico|fones?|headset|notebook|computador|tv|televisao|videogame|celular novo|presente|shopping|compra)\b/, 'cat-compras'],
  [/\b(pet|racao|veterinario|banho e tosa)\b/, 'cat-pets'],
  [/\b(juros|tarifa|anuidade|multa|iof)\b/, 'cat-juros'],
  [/\b(salario|holerite|pagamento do trabalho)\b/, 'cat-salario'],
  [/\b(freela|freelance|bico|servico extra)\b/, 'cat-freelance'],
  [/\b(rendimento|dividendo|juros recebidos|cashback)\b/, 'cat-investimentos'],
  [/\b(reserva|emergencia)\b/, 'cat-reserva'],
  [/\b(investi|investimento|tesouro|cdb|acoes|apliquei)\b/, 'cat-investimentos-guardado']
]

const PADRAO_POR_TIPO = { despesa: 'cat-outros-despesa', receita: 'cat-outros-receita', guardado: 'cat-reserva' } as const

// "1.500,00", "1500", "R$ 85,90", "85 reais" → centavos.
function extrairValor(texto: string): number | null {
  const limpo = texto
    .replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, ' ') // datas
    .replace(/\bdia\s+\d{1,2}\b/gi, ' ')
    .replace(/\b\d{1,2}\s*(x|vezes)\b/gi, ' ')
  const comMoeda = limpo.match(/r\$\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/i)
  const qualquer = limpo.match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?(?:\s*(?:reais|real|conto|contos|pila))?/i)
  const m = comMoeda ?? qualquer
  if (!m) return null
  const inteiro = Number(m[1].replace(/\./g, ''))
  const centavos = m[2] ? Number(m[2].padEnd(2, '0')) : 0
  const valor = inteiro * 100 + centavos
  return valor > 0 ? valor : null
}

function extrairData(texto: string, hoje: string): { data: string; suposicao: string | null } {
  const t = normalizar(texto)
  if (/\banteontem\b/.test(t)) return { data: somarDias(hoje, -2), suposicao: null }
  if (/\bontem\b/.test(t)) return { data: somarDias(hoje, -1), suposicao: null }
  if (/\bhoje\b/.test(t)) return { data: hoje, suposicao: null }
  const completa = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (completa) {
    const ano = completa[3] ? (completa[3].length === 2 ? `20${completa[3]}` : completa[3]) : hoje.slice(0, 4)
    const iso = `${ano}-${completa[2].padStart(2, '0')}-${completa[1].padStart(2, '0')}`
    if (dataValida(iso)) return { data: iso, suposicao: null }
  }
  const dia = t.match(/\bdia\s+(\d{1,2})\b/)
  if (dia && !RECORRENTE.test(t)) {
    const iso = `${hoje.slice(0, 7)}-${dia[1].padStart(2, '0')}`
    if (dataValida(iso)) return { data: iso, suposicao: null }
  }
  return { data: hoje, suposicao: 'Sem data no texto: usei hoje.' }
}

// Descrição curta a partir da frase: tira valores, datas, verbos e quem fez (o nome vai em "Para quem").
function descreverTrecho(trecho: string, nomes: string[]): string {
  const semNomes = nomes.reduce((texto, nome) => texto.replace(new RegExp(`\\b${nome}\\b`, 'gi'), ' '), trecho)
  const texto = semNomes
    .replace(/r\$\s*[\d.,]+/gi, ' ')
    .replace(/\b[\d.,]+\s*(reais|real|contos?|pila)?\b/gi, ' ')
    .replace(/\b(\d{1,2}\s*(x|vezes)|dia\s+\d{1,2}|todos? os m[eê]ses|todo m[eê]s|todo dia|mensal(mente)?|por m[eê]s|ao m[eê]s|hoje|ontem|anteontem)(?=\s|$|[,.;!])/gi, ' ')
    .replace(/\b(eu|n[oó]s|gastei|paguei|comprei|recebi|ganhei|guardei|investi|apliquei|poupei|gastou|pagou|comprou|recebeu|ganhou|guardou|gastamos|pagamos|compramos|recebemos|ganhamos|lan[cç]a|lance|cadastra|registra|adiciona|anota|foi|de|do|da|no|na|em|com|um|uma|o|a|os|as|pra|para|pro|reais|no cart[aã]o|cart[aã]o|cr[eé]dito|d[eé]bito|pix|casa|todos)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!texto) return ''
  return (texto.charAt(0).toUpperCase() + texto.slice(1)).slice(0, 60)
}

// Divide o texto em frases de lançamento ("gastei 50 no mercado, Bruno pagou 64 de uber e 30 na farmácia").
// Vírgula seguida de palavra separa frases; um pedaço sem número volta para a frase anterior
// ("gastei 50 no mercado, com a Ana" continua um lançamento só). "1.500,00" não é cortado.
export function dividirEmTrechos(texto: string): string[] {
  const verbos = '(?:gastei|paguei|comprei|recebi|ganhei|guardei|investi|apliquei|gastou|pagou|comprou|recebeu|ganhou|guardou|gastamos|pagamos|compramos|recebemos|ganhamos)'
  const partes = texto.split(new RegExp(`\\n|;|\\.\\s+|\\s+e\\s+(?=${verbos}\\b|r\\$|\\d)|\\s+mais\\s+(?=\\d)|,\\s*(?=\\p{L})`, 'iu'))
  const trechos: string[] = []
  for (const parte of partes) {
    const trecho = parte.trim().replace(/^e\s+/i, '')
    if (!trecho) continue
    if (!/\d/.test(trecho) && trechos.length > 0) trechos[trechos.length - 1] += `, ${trecho}`
    else trechos.push(trecho)
  }
  return trechos.filter((t) => /\d/.test(t))
}

export function interpretarSemIA(texto: string, ctx: ContextoInterpretacao): { propostas: PropostaBruta[]; naoEntendido: string[] } {
  const propostas: PropostaBruta[] = []
  const naoEntendido: string[] = []

  for (const trecho of dividirEmTrechos(texto)) {
    const t = normalizar(trecho)
    const valor = extrairValor(trecho)
    if (!valor) {
      naoEntendido.push(trecho)
      continue
    }
    const tipo = VERBOS_GUARDADO.test(t) ? 'guardado' : VERBOS_RECEITA.test(t) && !VERBOS_DESPESA.test(t) ? 'receita' : 'despesa'
    const parcelas = Number(t.match(/\b(\d{1,2})\s*(x|vezes)\b/)?.[1] ?? 1)
    const cartaoCitado = ctx.cartoes.find(
      (c) => t.includes(normalizar(c.apelido)) || t.includes(normalizar(c.instituicao).split(' ')[0])
    )
    const noCartao = tipo === 'despesa' && (/\b(cartao|credito)\b/.test(t) || parcelas > 1 || !!cartaoCitado)
    const recorrente = RECORRENTE.test(t)
    const diaDoMes = Number(t.match(/\bdia\s+(\d{1,2})\b/)?.[1] ?? 0)
    const { data, suposicao } = extrairData(trecho, ctx.hoje)

    const categoriaId =
      PALAVRAS_CATEGORIA.find(([re, id]) => re.test(t) && ctx.categorias.some((c) => c.id === id && c.tipo === tipo))?.[1] ??
      ctx.categorias.find((c) => c.tipo === tipo && t.includes(normalizar(c.nome)))?.id ??
      null

    const pessoaCitada = ctx.pessoas.find((p) => new RegExp(`\\b${normalizar(p.nome).split(' ')[0]}\\b`).test(t))
    const pessoaId = pessoaCitada ? pessoaCitada.id : CASA.test(t) ? null : undefined

    propostas.push({
      forma: recorrente ? 'recorrente' : noCartao ? 'cartao' : 'avulso',
      tipo,
      descricao: descreverTrecho(trecho, ctx.pessoas.map((p) => p.nome.split(' ')[0])),
      valorCentavos: valor,
      data,
      diaDoMes: diaDoMes || Number(data.slice(8, 10)),
      valorVariavel: recorrente && /\b(luz|energia|agua|gas|conta de)\b/.test(t),
      categoriaId: categoriaId ?? undefined,
      pessoaId,
      cartaoId: noCartao ? (cartaoCitado?.id ?? null) : null,
      parcelas: noCartao ? parcelas : 1,
      estabelecimento: null,
      trecho,
      suposicoes: suposicao && !recorrente ? [suposicao] : []
    })
  }
  return { propostas, naoEntendido }
}

// Deixa qualquer proposta (da IA ou do interpretador) válida para gravar, explicando o que ajustou.
export function sanearProposta(bruta: PropostaBruta, ctx: ContextoInterpretacao, chave: string): PropostaLancamentoDTO | null {
  const valorCentavos = Math.round(Number(bruta.valorCentavos))
  if (!Number.isFinite(valorCentavos) || valorCentavos <= 0) return null

  const suposicoes = [...(bruta.suposicoes ?? [])]
  const tipo = bruta.tipo === 'receita' || bruta.tipo === 'guardado' ? bruta.tipo : 'despesa'

  let categoria = ctx.categorias.find((c) => c.id === bruta.categoriaId && c.tipo === tipo)
  if (!categoria) {
    categoria =
      ctx.categorias.find((c) => c.id === PADRAO_POR_TIPO[tipo]) ?? ctx.categorias.find((c) => c.tipo === tipo)
    if (bruta.categoriaId) suposicoes.push(`Categoria ajustada para ${categoria?.nome}.`)
    else suposicoes.push(`Não identifiquei a categoria: usei ${categoria?.nome}.`)
  }
  if (!categoria) return null

  // Sem pessoa no texto: contas essenciais são da casa; o resto, de quem escreveu.
  let pessoaId: string | null
  if (bruta.pessoaId === null) pessoaId = null
  else if (bruta.pessoaId && ctx.pessoas.some((p) => p.id === bruta.pessoaId)) pessoaId = bruta.pessoaId
  else {
    pessoaId = categoria.natureza === 'essencial' || !ctx.pessoaDoUsuario ? null : ctx.pessoaDoUsuario
  }

  let forma: FormaLancamento = bruta.forma === 'recorrente' || bruta.forma === 'cartao' ? bruta.forma : 'avulso'
  let cartaoId: string | null = null
  if (forma === 'cartao') {
    if (tipo !== 'despesa' || ctx.cartoes.length === 0) {
      forma = 'avulso'
      suposicoes.push(ctx.cartoes.length === 0 ? 'Nenhum cartão cadastrado: lancei como pagamento à vista.' : 'Só despesas vão no cartão.')
    } else {
      const cartao = ctx.cartoes.find((c) => c.id === bruta.cartaoId)
      cartaoId = (cartao ?? ctx.cartoes[0]).id
      if (!cartao) suposicoes.push(`Cartão não citado: usei o ${ctx.cartoes[0].apelido}.`)
    }
  }

  let data = dataValida(bruta.data) ? bruta.data : ctx.hoje
  if (!dataValida(bruta.data)) suposicoes.push('Sem data no texto: usei hoje.')
  const diaDoMes = Math.min(31, Math.max(1, Math.round(Number(bruta.diaDoMes) || Number(data.slice(8, 10)))))
  if (forma === 'recorrente') {
    // A primeira ocorrência é a próxima data com esse dia (este mês, se ainda não passou).
    const doMes = `${ctx.hoje.slice(0, 7)}-${String(diaDoMes).padStart(2, '0')}`
    data = dataValida(doMes) ? doMes : data
  }

  const descricao = (bruta.descricao ?? '').trim().slice(0, 80) || categoria.nome
  return {
    chave,
    forma,
    tipo,
    descricao,
    valorCentavos,
    data,
    diaDoMes,
    valorVariavel: forma === 'recorrente' && !!bruta.valorVariavel,
    categoriaId: categoria.id,
    pessoaId,
    cartaoId,
    parcelas: forma === 'cartao' ? Math.min(48, Math.max(1, Math.round(Number(bruta.parcelas) || 1))) : 1,
    estabelecimento: bruta.estabelecimento?.trim() || null,
    trecho: bruta.trecho ?? '',
    suposicoes: [...new Set(suposicoes)]
  }
}

// A frase parece um pedido de lançamento (e não uma pergunta)?
export function pareceLancamento(texto: string): boolean {
  const t = normalizar(texto).trim()
  if (!/\d/.test(t) || t.endsWith('?')) return false
  if (/^(quanto|qual|como|posso|devo|da pra|vale)\b/.test(t)) return false
  return (
    VERBOS_DESPESA.test(t) ||
    VERBOS_RECEITA.test(t) ||
    VERBOS_GUARDADO.test(t) ||
    /\b(lanca|lance|lancar|cadastra|cadastre|cadastrar|registra|registre|adiciona|adicione|anota|anote)\b/.test(t) ||
    RECORRENTE.test(t)
  )
}

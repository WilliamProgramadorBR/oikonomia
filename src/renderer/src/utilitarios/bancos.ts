// Catálogo dos emissores de cartão mais usados no Brasil: nome conhecido, apelidos para a busca,
// o CNPJ-base que liga à tabela de taxas do Banco Central (null quando o BC não publica a taxa
// de cartão dessa instituição) e a identidade visual do cartão (cores e texto, sem logotipos).

export interface MarcaCartao {
  id: string
  nome: string
  apelidos: string[]
  cnpj8: string | null
  fundo: [string, string] // gradiente do cartão
  texto: string // cor do texto sobre o cartão
  destaque?: string // faixa/acento opcional
}

export const BANCOS: MarcaCartao[] = [
  { id: 'nubank', nome: 'Nubank', apelidos: ['nu', 'roxinho', 'nu financeira', 'nu pagamentos'], cnpj8: '30680829', fundo: ['#9b1fe8', '#5a0b9e'], texto: '#ffffff' },
  { id: 'bb', nome: 'Banco do Brasil', apelidos: ['bb', 'ourocard', 'brasil'], cnpj8: '00000000', fundo: ['#fde100', '#f2c200'], texto: '#1b3a8f', destaque: '#1b3a8f' },
  { id: 'mercadopago', nome: 'Mercado Pago', apelidos: ['mercado pago', 'mercadopago', 'mercado livre', 'mercado credito', 'meli'], cnpj8: '37679449', fundo: ['#00b1ea', '#0072ce'], texto: '#ffffff', destaque: '#ffe600' },
  { id: 'caixa', nome: 'Caixa', apelidos: ['caixa economica', 'cef', 'caixa tem'], cnpj8: '00360305', fundo: ['#0070bf', '#00427a'], texto: '#ffffff', destaque: '#f39200' },
  { id: 'itau', nome: 'Itaú', apelidos: ['itau', 'itaucard', 'itau unibanco', 'personnalite', 'uniclass'], cnpj8: '60872504', fundo: ['#ff8a00', '#e55f00'], texto: '#ffffff', destaque: '#003a70' },
  { id: 'bradesco', nome: 'Bradesco', apelidos: ['bradesco cartoes', 'elo bradesco', 'prime'], cnpj8: '60746948', fundo: ['#e1173f', '#9e0b2b'], texto: '#ffffff' },
  { id: 'santander', nome: 'Santander', apelidos: ['santander brasil', 'sx', 'free'], cnpj8: '90400888', fundo: ['#ff1a1a', '#b30000'], texto: '#ffffff' },
  { id: 'inter', nome: 'Inter', apelidos: ['banco inter', 'inter gold', 'inter black'], cnpj8: '00416968', fundo: ['#ff8c1a', '#ff5f00'], texto: '#ffffff' },
  { id: 'c6', nome: 'C6 Bank', apelidos: ['c6', 'carbon', 'c6 carbon'], cnpj8: '31872495', fundo: ['#3a3a3a', '#0d0d0d'], texto: '#f2f2f2', destaque: '#bfbfbf' },
  { id: 'picpay', nome: 'PicPay', apelidos: ['pic pay', 'picpay card'], cnpj8: '09516419', fundo: ['#2bd46b', '#0f9e47'], texto: '#ffffff' },
  { id: 'pagbank', nome: 'PagBank', apelidos: ['pagseguro', 'pag seguro', 'pagbank'], cnpj8: null, fundo: ['#3ad18f', '#0b8f5c'], texto: '#ffffff', destaque: '#ffd400' },
  { id: 'neon', nome: 'Neon', apelidos: ['banco neon', 'neon financeira'], cnpj8: '11285104', fundo: ['#16e3ff', '#0089c9'], texto: '#06243a' },
  { id: 'will', nome: 'Will Bank', apelidos: ['will', 'willbank'], cnpj8: null, fundo: ['#ffe14d', '#ffc800'], texto: '#111111' },
  { id: 'next', nome: 'Next', apelidos: ['banco next', 'next bradesco'], cnpj8: '60746948', fundo: ['#22ff7a', '#00c853'], texto: '#062b14' },
  { id: 'btg', nome: 'BTG Pactual', apelidos: ['btg', 'btg banking'], cnpj8: '30306294', fundo: ['#123a6b', '#05172e'], texto: '#ffffff', destaque: '#8fb3e6' },
  { id: 'xp', nome: 'XP', apelidos: ['xp investimentos', 'banco xp', 'xp visa infinite'], cnpj8: '33264668', fundo: ['#262626', '#000000'], texto: '#ffffff', destaque: '#ffd200' },
  { id: 'sicredi', nome: 'Sicredi', apelidos: ['cooperativa sicredi'], cnpj8: null, fundo: ['#5cb82a', '#2f7d0c'], texto: '#ffffff' },
  { id: 'sicoob', nome: 'Sicoob', apelidos: ['bancoob', 'sicoobcard', 'cooperativa sicoob'], cnpj8: '02038232', fundo: ['#00a19a', '#003641'], texto: '#ffffff', destaque: '#c9d200' },
  { id: 'banrisul', nome: 'Banrisul', apelidos: ['banco do estado do rs', 'banricompras'], cnpj8: '92702067', fundo: ['#0a6cc2', '#003f7f'], texto: '#ffffff' },
  { id: 'pan', nome: 'Banco Pan', apelidos: ['pan', 'panamericano'], cnpj8: '59285411', fundo: ['#24c4ff', '#0077c8'], texto: '#ffffff' },
  { id: 'digio', nome: 'Digio', apelidos: ['banco digio'], cnpj8: '27098060', fundo: ['#1d5fe0', '#0a2f7a'], texto: '#ffffff' },
  { id: 'agibank', nome: 'Agibank', apelidos: ['agi', 'agiplan'], cnpj8: '10664513', fundo: ['#00b4e6', '#00609e'], texto: '#ffffff', destaque: '#8ee000' },
  { id: 'bmg', nome: 'Banco BMG', apelidos: ['bmg', 'meu bmg'], cnpj8: '61186680', fundo: ['#ff7a1a', '#d94f00'], texto: '#ffffff' },
  { id: 'porto', nome: 'Porto Bank', apelidos: ['porto seguro', 'portoseg', 'porto'], cnpj8: '04862600', fundo: ['#1a63e6', '#0a2f8c'], texto: '#ffffff', destaque: '#00c3ff' },
  { id: 'carrefour', nome: 'Cartão Carrefour', apelidos: ['carrefour', 'atacadao', 'csf'], cnpj8: '08357240', fundo: ['#1d5fbf', '#0b3a7d'], texto: '#ffffff', destaque: '#e2001a' },
  { id: 'renner', nome: 'Cartão Renner', apelidos: ['renner', 'realize', 'meu cartao renner'], cnpj8: '27351731', fundo: ['#e3132f', '#9c0a1e'], texto: '#ffffff' },
  { id: 'riachuelo', nome: 'Cartão Riachuelo', apelidos: ['riachuelo', 'midway'], cnpj8: '09464032', fundo: ['#3a3a3a', '#111111'], texto: '#ffffff', destaque: '#ffcc00' },
  { id: 'magalu', nome: 'Cartão Magalu', apelidos: ['magalu', 'magazine luiza', 'luizacred', 'luiza'], cnpj8: '02206577', fundo: ['#1a8cff', '#0058c7'], texto: '#ffffff', destaque: '#ffcc00' },
  { id: 'paodeacucar', nome: 'Cartão Pão de Açúcar', apelidos: ['pao de acucar', 'extra', 'itau cbd'], cnpj8: '06881898', fundo: ['#2a9b48', '#146b2c'], texto: '#ffffff' },
  { id: 'bradescard', nome: 'Bradescard', apelidos: ['amazon', 'cartao amazon', 'c&a', 'bradescard'], cnpj8: '04184779', fundo: ['#c4123a', '#6e0a22'], texto: '#ffffff' },
  { id: 'credicard', nome: 'Credicard', apelidos: ['credicard zero', 'credicard'], cnpj8: '60872504', fundo: ['#4b525c', '#1e2227'], texto: '#ffffff', destaque: '#ff7a00' },
  { id: 'hipercard', nome: 'Hipercard', apelidos: ['hiper', 'hipercard'], cnpj8: '60872504', fundo: ['#c91d23', '#7d0e12'], texto: '#ffffff' },
  { id: 'safra', nome: 'Safra', apelidos: ['banco safra', 'safrapay'], cnpj8: '58160789', fundo: ['#0d2c5a', '#04132b'], texto: '#e9c46a' },
  { id: 'bv', nome: 'Banco BV', apelidos: ['bv', 'votorantim'], cnpj8: '01858774', fundo: ['#2f5ff0', '#1230a3'], texto: '#ffffff' },
  { id: 'original', nome: 'Banco Original', apelidos: ['original'], cnpj8: null, fundo: ['#1fc27a', '#078c52'], texto: '#ffffff' },
  { id: 'mercantil', nome: 'Mercantil do Brasil', apelidos: ['mercantil', 'banco mercantil'], cnpj8: '17184037', fundo: ['#0a4a8f', '#03264d'], texto: '#ffffff' },
  { id: 'daycoval', nome: 'Daycoval', apelidos: ['banco daycoval'], cnpj8: '62232889', fundo: ['#0b4f9c', '#05284f'], texto: '#ffffff' },
  { id: 'brb', nome: 'BRB', apelidos: ['banco de brasilia', 'brb card'], cnpj8: '00000208', fundo: ['#1576c2', '#0a4778'], texto: '#ffffff' },
  { id: 'bnb', nome: 'Banco do Nordeste', apelidos: ['bnb', 'nordeste'], cnpj8: '07237373', fundo: ['#b51f36', '#6f0f1f'], texto: '#ffffff' },
  { id: 'banestes', nome: 'Banestes', apelidos: ['banco do espirito santo'], cnpj8: '28127603', fundo: ['#0a5cd6', '#063a8a'], texto: '#ffffff' },
  { id: 'banpara', nome: 'Banpará', apelidos: ['banpara', 'banco do para'], cnpj8: '04913711', fundo: ['#1c63b7', '#0a3570'], texto: '#ffffff' },
  { id: 'banese', nome: 'Banese', apelidos: ['banco de sergipe'], cnpj8: '13009717', fundo: ['#1d4f9c', '#0c2b5c'], texto: '#ffffff' },
  { id: 'efi', nome: 'Efí', apelidos: ['efi bank', 'gerencianet'], cnpj8: '37229413', fundo: ['#f37021', '#c74a07'], texto: '#ffffff' },
  { id: 'genial', nome: 'Banco Genial', apelidos: ['genial investimentos'], cnpj8: '45246410', fundo: ['#2b2e83', '#14164a'], texto: '#ffffff' },
  { id: 'crefisa', nome: 'Crefisa', apelidos: ['banco crefisa'], cnpj8: '61033106', fundo: ['#0d3f8c', '#062352'], texto: '#ffffff' }
]

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9& ]/g, ' ').replace(/\s+/g, ' ').trim()

const termos = (b: MarcaCartao) => [b.nome, ...b.apelidos].map(normalizar)

// Emissores do catálogo que combinam com a busca (vazia = os mais populares, na ordem da lista).
export function buscarBancos(busca: string): MarcaCartao[] {
  const termo = normalizar(busca)
  if (!termo) return BANCOS
  return BANCOS.filter((b) => termos(b).some((t) => t.includes(termo) || (termo.length >= 3 && termo.includes(t))))
}

// Identidade visual pelo nome salvo no cartão (ou, para cartões antigos, pelo CNPJ do Banco Central).
export function marcaDe(instituicao: string, cnpj8?: string | null): MarcaCartao | null {
  const nome = normalizar(instituicao)
  if (nome) {
    const exato = BANCOS.find((b) => termos(b).includes(nome))
    if (exato) return exato
  }
  if (cnpj8) return BANCOS.find((b) => b.cnpj8 === cnpj8) ?? null
  return null
}

// Cnpj-bases que o catálogo já cobre (para não repetir na lista "Outras instituições").
export const CNPJS_DO_CATALOGO = new Set(BANCOS.map((b) => b.cnpj8).filter((c): c is string => c !== null))

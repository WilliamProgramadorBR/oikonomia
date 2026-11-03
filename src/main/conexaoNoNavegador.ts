import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { extname, join, normalize, sep } from 'node:path'
import { BrowserWindow, shell } from 'electron'
import type { IJanelaConexaoBancaria, ResultadoJanelaConexao } from '@backend/dominio/portas/IOpenFinance'

// Conexão do Open Finance no navegador do sistema (Chrome, Edge...), não no Chromium embutido:
// o vaivém de redirecionamentos entre a Pluggy e o banco (OAuth) funciona como a Pluggy e os bancos
// esperam. O app sobe uma página local temporária com o widget oficial e espera o resultado.
//
// Segurança do servidor local:
// - escuta só em 127.0.0.1, em porta aleatória, e confere o cabeçalho Host (contra DNS rebinding);
// - todas as rotas levam um código secreto aleatório (256 bits); qualquer outra coisa é 404;
// - aceita um único resultado, corpo pequeno, e se desliga ao concluir, ao cancelar ou em 15 minutos;
// - o connect token vai no "#" do endereço, que o navegador nunca envia a servidor nenhum.

const PRAZO = 15 * 60 * 1000
const TAMANHO_MAXIMO_CORPO = 16 * 1024
const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
}
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.pluggy.ai; " +
  "frame-src https://connect.pluggy.ai https://*.pluggy.ai; connect-src 'self' https://*.pluggy.ai; font-src 'self' data:"

interface OpcoesConexaoNavegador {
  abrirNoNavegador?: (url: string) => Promise<void> // trocado nos testes
  pastaPagina?: string // onde estão conexao-bancaria.html e assets/
  urlPaginaDesenvolvimento?: string // em `npm run dev`, a página vem do servidor do Vite
}

export function criarConexaoNoNavegador({
  abrirNoNavegador = (url) => shell.openExternal(url),
  pastaPagina = join(__dirname, '../renderer'),
  urlPaginaDesenvolvimento = process.env['ELECTRON_RENDERER_URL']
}: OpcoesConexaoNavegador = {}): IJanelaConexaoBancaria {
  let atual: { cancelar: () => void; reabrir: () => void } | null = null

  return {
    cancelar: () => atual?.cancelar(),
    reabrir: () => atual?.reabrir(),
    abrir: (connectToken, { itemId, incluirSandbox }) =>
      new Promise<ResultadoJanelaConexao>((resolver) => {
        atual?.cancelar() // só uma conexão por vez
        const segredo = randomBytes(32).toString('base64url')
        const eventos: string[] = []
        const erros: string[] = []
        let itemComErro: string | null = null
        let concluido = false
        let enderecoPagina = ''
        const origemDesenvolvimento = urlPaginaDesenvolvimento ? new URL(urlPaginaDesenvolvimento).origin : null
        const idValido = (id: unknown): id is string => typeof id === 'string' && /^[\w-]{8,64}$/.test(id)

        const terminar = (itemConectado: string | null) => {
          if (concluido) return
          concluido = true
          clearTimeout(prazo)
          atual = null
          setTimeout(() => servidor.close(), 1500) // dá tempo de a página receber a confirmação
          resolver({ itemId: itemConectado, itemComErro: itemConectado ? null : itemComErro, erros, eventos })
          // Traz o app de volta para a frente.
          const janela = BrowserWindow.getAllWindows()[0]
          if (janela && itemConectado) {
            if (janela.isMinimized()) janela.restore()
            janela.focus()
          }
        }

        const servidor = createServer((req, res) => void atender(req, res))
        const prazo = setTimeout(() => {
          erros.push('Tempo esgotado: a conexão não foi concluída em 15 minutos.')
          terminar(null)
        }, PRAZO)

        async function atender(req: IncomingMessage, res: ServerResponse) {
          const porta = (servidor.address() as AddressInfo).port
          res.setHeader('X-Content-Type-Options', 'nosniff')
          res.setHeader('Referrer-Policy', 'no-referrer')
          res.setHeader('Cache-Control', 'no-store')
          if (req.headers.host !== `127.0.0.1:${porta}`) return responder(res, 403)
          if (origemDesenvolvimento && req.headers.origin === origemDesenvolvimento) {
            res.setHeader('Access-Control-Allow-Origin', origemDesenvolvimento)
            res.setHeader('Access-Control-Allow-Methods', 'POST')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          }
          const url = new URL(req.url ?? '/', `http://127.0.0.1:${porta}`)
          const partes = url.pathname.split('/').filter(Boolean) // [segredo, ...resto]
          if (partes[0] !== segredo) return responder(res, 404)
          const rota = partes.slice(1).join('/')

          if (req.method === 'OPTIONS') return responder(res, 204)
          if (req.method === 'POST' && (rota === 'evento' || rota === 'resultado')) {
            const dados = await lerCorpo(req).catch(() => null)
            if (!dados) return responder(res, 400)
            if (rota === 'evento' && !concluido && eventos.length < 60) {
              const tipo = String(dados.tipo ?? '').slice(0, 40)
              const detalhe = dados.detalhe ? String(dados.detalhe).slice(0, 300) : ''
              eventos.push(detalhe ? `${tipo} (${detalhe})` : tipo)
              if (tipo === 'ERRO' && detalhe) erros.push(detalhe)
              if (tipo === 'ERRO' && idValido(dados.itemId)) itemComErro = dados.itemId
            }
            if (rota === 'resultado') {
              if (dados.erro) erros.push(String(dados.erro).slice(0, 300))
              terminar(idValido(dados.itemId) ? dados.itemId : null)
            }
            return responder(res, 200, 'application/json', '{"ok":true}')
          }
          if (req.method !== 'GET' || origemDesenvolvimento) return responder(res, 404)

          // Página e arquivos do widget (só dentro da pasta da página).
          const arquivo = rota === '' ? 'conexao-bancaria.html' : rota
          const caminho = normalize(join(pastaPagina, arquivo))
          if (!caminho.startsWith(normalize(pastaPagina) + sep) || !(arquivo === 'conexao-bancaria.html' || arquivo.startsWith('assets/'))) {
            return responder(res, 404)
          }
          const conteudo = await readFile(caminho).catch(() => null)
          if (!conteudo) return responder(res, 404)
          if (arquivo.endsWith('.html')) res.setHeader('Content-Security-Policy', CSP)
          return responder(res, 200, TIPOS[extname(arquivo)] ?? 'application/octet-stream', conteudo)
        }

        const reabrir = () => void abrirNoNavegador(enderecoPagina).catch(() => undefined)
        atual = {
          cancelar: () => {
            erros.length = 0 // cancelar não é erro
            terminar(null)
          },
          reabrir
        }

        servidor.listen(0, '127.0.0.1', () => {
          const base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/${segredo}`
          const parametros = new URLSearchParams({
            token: connectToken,
            retorno: base,
            ...(itemId ? { item: itemId } : {}),
            ...(incluirSandbox ? { sandbox: '1' } : {})
          })
          enderecoPagina = urlPaginaDesenvolvimento
            ? `${urlPaginaDesenvolvimento}/conexao-bancaria.html#${parametros}`
            : `${base}/#${parametros}`
          reabrir()
        })
      })
  }
}

function responder(res: ServerResponse, status: number, tipo?: string, corpo?: string | Buffer) {
  if (tipo) res.setHeader('Content-Type', tipo)
  res.writeHead(status)
  res.end(corpo)
}

function lerCorpo(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolver, rejeitar) => {
    let tamanho = 0
    const pedacos: Buffer[] = []
    req.on('data', (pedaco: Buffer) => {
      tamanho += pedaco.length
      if (tamanho > TAMANHO_MAXIMO_CORPO) rejeitar(new Error('corpo grande demais')) // o resto é descartado
      else pedacos.push(pedaco)
    })
    req.on('end', () => {
      if (tamanho > TAMANHO_MAXIMO_CORPO) return
      try {
        const dados = JSON.parse(Buffer.concat(pedacos).toString('utf8'))
        if (dados && typeof dados === 'object') resolver(dados)
        else rejeitar(new Error('formato inválido'))
      } catch (erro) {
        rejeitar(erro)
      }
    })
    req.on('error', rejeitar)
  })
}

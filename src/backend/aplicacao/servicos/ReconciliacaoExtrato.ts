import type { LinhaImportacaoDTO, SituacaoLinhaExtrato } from '@compartilhado/dtos/conta'
import type { Categoria } from '../../dominio/entidades/Categoria'
import type { ContaBancaria } from '../../dominio/entidades/ContaBancaria'
import type { Pessoa } from '../../dominio/entidades/Pessoa'
import type { Transacao } from '../../dominio/entidades/Transacao'
import type { LinhaExtrato } from '../../dominio/servicos/ExtratoBancario'
import { categoriaPadrao, categoriaPorTexto } from './InterpretadorLancamentos'

// Cruza as linhas do extrato com o que já existe no app, para não duplicar nem contar duas vezes:
// confirma contas previstas, reconhece o que já foi lançado e deixa de fora pagamento de fatura
// (as compras já estão no cartão) e transferências entre contas da própria família.

export interface ContextoReconciliacao {
  conta: ContaBancaria
  candidatas: Transacao[] // lançamentos do período (± alguns dias), fora do cartão
  idsImportados: Set<string> // id_extrato já gravados nesta conta
  categorias: Categoria[]
  pessoas: Pessoa[]
}

const DIA = 24 * 60 * 60 * 1000
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
const distanciaDias = (a: string, b: string) => Math.abs(new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / DIA
const palavras = (texto: string) => new Set(normalizar(texto).split(/[^a-z0-9]+/).filter((p) => p.length >= 3))

const FATURA = /pagamento.{0,12}fatura|pgto.{0,6}fatura|fatura.{0,12}cart|pag(amento|to)?.{0,6}cart(ao)?.{0,6}credito|pagamento de cartao/
const TRANSFERENCIA = /mesma titularidade|entre contas|transf(erencia)? (entre|propria)|resgate|resg\b/
const APLICACAO = /aplicacao|aplic\b|investimento|poupanca|cdb|tesouro|caixinha|cofrinho|guardado/
const PREFIXOS =
  /^(compra (no )?(cartao )?(de )?debito|compra debito|debito (em conta|automatico)|deb(\.|ito)? aut(\.|omatico)?|pagamento (de )?(boleto|titulo|conta)|pag(to)? boleto|pix (enviado|recebido|transf(erencia)?( enviada| recebida)?|qr code)|transferencia (enviada|recebida|pix)|transf(\.)? (enviada|recebida)|ted (enviada|recebida)?|doc|pag\*|pg \*|ifd\*|compra|pagamento|recebimento)\s*[-:]*\s*/i

// "PIX ENVIADO - JOAO DA SILVA 123.456.789-00" → "Joao da Silva"
export function limparDescricao(original: string): string {
  const texto = original
    .replace(PREFIXOS, '')
    .replace(/\b\d{2}\/\d{2}(\/\d{2,4})?\b/g, ' ')
    .replace(/\b\d{2,3}\.?\d{3}\.?\d{3}[-/]?\d{0,4}-?\d{0,2}\b/g, ' ') // CPF/CNPJ e códigos
    .replace(/\b\d{5,}\b/g, ' ')
    .replace(/[*_|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!texto) return original.trim().slice(0, 50)
  return texto
    .toLowerCase()
    .split(' ')
    .map((p, i) => (i > 0 && ['de', 'da', 'do', 'das', 'dos', 'e'].includes(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')
    .slice(0, 50)
}

// Identificador estável da linha (o mesmo arquivo importado de novo gera os mesmos ids).
export function identificarLinhas(linhas: LinhaExtrato[]): string[] {
  const vistos = new Map<string, number>()
  return linhas.map((l) => {
    if (l.idOriginal) return `id:${l.idOriginal}`
    const base = `h:${l.data}|${l.valorCentavos}|${normalizar(l.descricao)}`
    const n = (vistos.get(base) ?? 0) + 1
    vistos.set(base, n)
    return `${base}|${n}`
  })
}

export function reconciliar(linhas: LinhaExtrato[], ctx: ContextoReconciliacao): LinhaImportacaoDTO[] {
  const ids = identificarLinhas(linhas)
  const usadas = new Set<string>()
  // Nomes completos da família ("ana souza"): Pix/TED para eles é dinheiro trocando de conta dentro de casa.
  const nomesFamilia = ctx.pessoas.map((p) => normalizar(p.nome)).filter((n) => n.includes(' '))

  return linhas.map((linha, i): LinhaImportacaoDTO => {
    const texto = normalizar(linha.descricao)
    const entrou = linha.valorCentavos > 0
    const valor = Math.abs(linha.valorCentavos)
    const aplicacao = !entrou && APLICACAO.test(texto) && !/resgate/.test(texto)
    const tipo = aplicacao ? 'guardado' : entrou ? 'receita' : 'despesa'
    const descricao = limparDescricao(linha.descricao)
    // Primeiro pela descrição limpa: o "COMPRA DEBITO" do banco não deve puxar para a categoria Compras.
    const categoriaId =
      categoriaPorTexto(descricao, tipo, ctx.categorias) ??
      categoriaPorTexto(texto.replace(PREFIXOS, ''), tipo, ctx.categorias) ??
      categoriaPadrao(tipo, ctx.categorias) ??
      ctx.categorias[0]?.id ??
      ''
    const base = {
      chave: `l${i + 1}`,
      idExtrato: ids[i],
      data: linha.data,
      valorCentavos: linha.valorCentavos,
      descricaoOriginal: linha.descricao,
      transacaoId: null as string | null,
      proposta: { tipo, descricao, categoriaId, pessoaId: ctx.conta.pessoaId } as LinhaImportacaoDTO['proposta']
    }
    const linhaCom = (situacao: SituacaoLinhaExtrato, incluir: boolean, explicacao: string, transacao?: Transacao): LinhaImportacaoDTO => {
      if (transacao) usadas.add(transacao.id)
      return {
        ...base,
        situacao,
        incluir,
        explicacao,
        transacaoId: transacao?.id ?? null,
        proposta: transacao
          ? { tipo: transacao.tipo, descricao: transacao.descricao, categoriaId: transacao.categoriaId, pessoaId: transacao.pessoaId }
          : base.proposta
      }
    }

    if (ctx.idsImportados.has(ids[i])) return linhaCom('ja_importada', false, 'Já veio num extrato importado antes.')
    if (!entrou && FATURA.test(texto)) {
      return linhaCom('fatura', false, 'Pagamento da fatura: as compras já estão lançadas no cartão. Lançar de novo contaria em dobro.')
    }
    if (TRANSFERENCIA.test(texto) || nomesFamilia.some((nome) => texto.includes(nome))) {
      return linhaCom('transferencia', false, 'Transferência entre contas da família (ou resgate): o dinheiro só mudou de lugar.')
    }

    const disponiveis = ctx.candidatas.filter((t) => !usadas.has(t.id) && t.tipo === tipo && !t.idExtrato)

    // Conta recorrente prevista: valor parecido, data próxima e alguma palavra em comum (ou valor quase igual).
    const prevista = disponiveis
      .filter((t) => t.status === 'prevista' && distanciaDias(t.data.toISOString().slice(0, 10), linha.data) <= 7)
      .map((t) => {
        const diferenca = Math.abs(t.valorCentavos - valor) / Math.max(t.valorCentavos, 1)
        const comum = [...palavras(t.descricao)].some((p) => palavras(linha.descricao).has(p))
        return { t, diferenca, comum }
      })
      .filter(({ diferenca, comum }) => (comum && diferenca <= 0.3) || diferenca <= 0.02)
      .sort((a, b) => Number(b.comum) - Number(a.comum) || a.diferenca - b.diferenca)[0]
    if (prevista) {
      return linhaCom('prevista', true, `Confirma "${prevista.t.descricao}", que estava previsto${prevista.diferenca > 0 ? ' com outro valor' : ''}.`, prevista.t)
    }

    // Já lançado à mão: mesmo valor, até 3 dias de diferença.
    const lancada = disponiveis.find(
      (t) => t.status === 'confirmada' && t.valorCentavos === valor && distanciaDias(t.data.toISOString().slice(0, 10), linha.data) <= 3 && (!t.contaId || t.contaId === ctx.conta.id)
    )
    if (lancada) return linhaCom('ja_lancada', true, `Já estava lançado como "${lancada.descricao}": só passa a contar nesta conta.`, lancada)

    return linhaCom(
      'nova',
      true,
      aplicacao ? 'Aplicação/investimento: entra como valor guardado, não como gasto.' : 'Não existe no app: vira um lançamento novo.'
    )
  })
}

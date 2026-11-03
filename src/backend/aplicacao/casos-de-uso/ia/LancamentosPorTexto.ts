import type {
  InterpretacaoLancamentosDTO,
  PropostaLancamentoDTO,
  ResultadoLancamentosDTO
} from '@compartilhado/dtos/lancamentosTexto'
import { hojeISO } from '@compartilhado/utilitarios/mes'
import type { IProvedorIA } from '../../../dominio/portas/IProvedorIA'
import type { ICartaoRepositorio } from '../../../dominio/repositorios/ICartaoRepositorio'
import type { ICategoriaRepositorio } from '../../../dominio/repositorios/ICategoriaRepositorio'
import type { IPessoaRepositorio } from '../../../dominio/repositorios/IPessoaRepositorio'
import {
  interpretarSemIA,
  sanearProposta,
  type ContextoInterpretacao,
  type PropostaBruta
} from '../../servicos/InterpretadorLancamentos'
import type { CriarCompraCartao } from '../cartao/CriarCompraCartao'
import type { CriarRecorrencia } from '../recorrencia/CriarRecorrencia'
import type { CriarTransacao } from '../transacao/CriarTransacao'

const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

const ESQUEMA = {
  type: 'OBJECT',
  properties: {
    itens: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          forma: { type: 'STRING', enum: ['avulso', 'recorrente', 'cartao'] },
          tipo: { type: 'STRING', enum: ['despesa', 'receita', 'guardado'] },
          descricao: { type: 'STRING', description: 'curta, como o usuário chamaria (ex.: "Conta de luz")' },
          valor: { type: 'NUMBER', description: 'em reais, com centavos' },
          data: { type: 'STRING', nullable: true, description: 'AAAA-MM-DD; null se não informada' },
          diaDoMes: { type: 'INTEGER', nullable: true },
          valorVariavel: { type: 'BOOLEAN' },
          categoriaId: { type: 'STRING' },
          paraQuem: { type: 'STRING', description: '"casa", o id de um membro, ou "nao_informado"' },
          cartaoId: { type: 'STRING', nullable: true },
          parcelas: { type: 'INTEGER' },
          estabelecimento: { type: 'STRING', nullable: true },
          trecho: { type: 'STRING', description: 'parte exata do texto que originou o item' },
          suposicoes: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: ['forma', 'tipo', 'descricao', 'valor', 'categoriaId', 'paraQuem', 'parcelas', 'trecho', 'suposicoes']
      }
    },
    naoEntendido: { type: 'STRING', nullable: true }
  },
  required: ['itens']
}

interface ItemIA {
  forma: string
  tipo: string
  descricao: string
  valor: number
  data: string | null
  diaDoMes: number | null
  valorVariavel?: boolean
  categoriaId: string
  paraQuem: string
  cartaoId: string | null
  parcelas: number
  estabelecimento: string | null
  trecho: string
  suposicoes: string[]
}

export class InterpretarLancamentos {
  constructor(
    private readonly ia: IProvedorIA,
    private readonly categoriaRepositorio: ICategoriaRepositorio,
    private readonly pessoaRepositorio: IPessoaRepositorio,
    private readonly cartaoRepositorio: ICartaoRepositorio,
    private readonly pessoaDoUsuario: () => Promise<string | null>
  ) {}

  async executar(texto: string): Promise<InterpretacaoLancamentosDTO> {
    const [categorias, pessoas, cartoes, pessoaDoUsuario] = await Promise.all([
      this.categoriaRepositorio.listar(),
      this.pessoaRepositorio.listar(),
      this.cartaoRepositorio.listar(),
      this.pessoaDoUsuario()
    ])
    const ctx: ContextoInterpretacao = { hoje: hojeISO(), categorias, pessoas, cartoes, pessoaDoUsuario }

    const nativo = (motivoFallback: string | null): InterpretacaoLancamentosDTO => {
      const { propostas, naoEntendido } = interpretarSemIA(texto, ctx)
      return this.finalizar(propostas, ctx, 'nativo', motivoFallback, naoEntendido.join(' | ') || null)
    }

    if (!(await this.ia.disponivel())) return nativo('Nenhuma chave do Gemini configurada.')
    try {
      const resposta = await this.ia.gerarJson<{ itens: ItemIA[]; naoEntendido: string | null }>({
        sistema: this.instrucoes(ctx),
        prompt: `Texto do usuário:\n"""${texto}"""`,
        esquema: ESQUEMA
      })
      const brutas: PropostaBruta[] = (resposta.itens ?? []).map((i) => ({
        forma: i.forma as PropostaBruta['forma'],
        tipo: i.tipo as PropostaBruta['tipo'],
        descricao: i.descricao,
        valorCentavos: Math.round(Number(i.valor) * 100),
        data: i.data ?? undefined,
        diaDoMes: i.diaDoMes ?? undefined,
        valorVariavel: !!i.valorVariavel,
        categoriaId: i.categoriaId,
        pessoaId: i.paraQuem === 'casa' ? null : pessoas.some((p) => p.id === i.paraQuem) ? i.paraQuem : undefined,
        cartaoId: i.cartaoId,
        parcelas: i.parcelas,
        estabelecimento: i.estabelecimento,
        trecho: i.trecho,
        suposicoes: i.suposicoes ?? []
      }))
      if (brutas.length === 0) return nativo('A IA não encontrou lançamentos no texto.')
      return this.finalizar(brutas, ctx, 'ia', null, resposta.naoEntendido ?? null)
    } catch (erro) {
      return nativo((erro as Error).message)
    }
  }

  private finalizar(
    brutas: PropostaBruta[],
    ctx: ContextoInterpretacao,
    fonte: 'ia' | 'nativo',
    motivoFallback: string | null,
    naoEntendido: string | null
  ): InterpretacaoLancamentosDTO {
    const propostas = brutas
      .map((b, i) => sanearProposta(b, ctx, `p${i + 1}`))
      .filter((p): p is PropostaLancamentoDTO => p !== null)
    return { propostas, fonte, motivoFallback, naoEntendido }
  }

  private instrucoes(ctx: ContextoInterpretacao): string {
    const dia = DIAS_SEMANA[new Date(`${ctx.hoje}T12:00:00Z`).getUTCDay()]
    return `Você transforma o que o usuário escreveu em lançamentos financeiros estruturados para um app de finanças da família.
Hoje é ${ctx.hoje} (${dia}). Responda só com o JSON do esquema.

Regras:
- Um item por gasto, ganho ou valor guardado citado. Não invente valores: se um item não tem valor, coloque o trecho em "naoEntendido".
- Valores em reais, com centavos ("1.500" = 1500; "85,90" = 85.9; "1,5 mil" = 1500).
- tipo: despesa (gastei, paguei, comprei, conta), receita (recebi, ganhei, salário, freela) ou guardado (guardei, investi, apliquei, reserva).
- forma: "recorrente" quando se repete (todo mês, todo dia N, mensal, assinatura); "cartao" quando citar cartão de crédito ou parcelas (Nx); senão "avulso".
- data: resolva datas relativas (hoje, ontem, anteontem, "dia 5" = dia 5 deste mês, "sexta passada"). null se não houver.
- diaDoMes: para recorrentes, o dia citado; senão o dia da data.
- valorVariavel: true para contas recorrentes que mudam de valor (luz, água, gás).
- categoriaId: obrigatoriamente um dos ids abaixo, com o mesmo tipo do item.
- paraQuem: "casa" para despesas de todos (aluguel, condomínio, luz, água, internet, mercado do mês) ou quando disser casa/todos/família; o id do membro quando citar o nome; "${ctx.pessoaDoUsuario ?? 'nao_informado'}" quando for algo pessoal de quem escreve (eu, minha, meu, gastei com um lanche); "nao_informado" se não der para saber.
- cartaoId: o id do cartão citado (pelo apelido ou banco); null se não citar.
- parcelas: número de parcelas no cartão (1 se à vista).
- suposicoes: liste em português curto o que você assumiu (ex.: "Sem data: considerei hoje").

Categorias: ${JSON.stringify(ctx.categorias.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo })))}
Membros da família: ${JSON.stringify(ctx.pessoas.map((p) => ({ id: p.id, nome: p.nome })))}
Cartões: ${JSON.stringify(ctx.cartoes.map((c) => ({ id: c.id, apelido: c.apelido, banco: c.instituicao })))}`
  }
}

// Grava as propostas confirmadas usando os mesmos casos de uso dos formulários (mesmas validações).
export class ConfirmarLancamentos {
  constructor(
    private readonly criarTransacao: CriarTransacao,
    private readonly criarRecorrencia: CriarRecorrencia,
    private readonly criarCompraCartao: CriarCompraCartao
  ) {}

  async executar(propostas: PropostaLancamentoDTO[]): Promise<ResultadoLancamentosDTO> {
    const falhas: ResultadoLancamentosDTO['falhas'] = []
    let criados = 0

    for (const p of propostas) {
      try {
        if (p.forma === 'recorrente') {
          await this.criarRecorrencia.executar({
            descricao: p.descricao,
            tipo: p.tipo,
            valorVariavel: p.valorVariavel,
            valorCentavos: p.valorCentavos,
            diaDoMes: p.diaDoMes,
            categoriaId: p.categoriaId,
            pessoaId: p.pessoaId,
            cartaoId: null,
            inicio: p.data.slice(0, 7)
          })
        } else if (p.forma === 'cartao' && p.cartaoId) {
          await this.criarCompraCartao.executar({
            cartaoId: p.cartaoId,
            descricao: p.descricao,
            valorCentavos: p.valorCentavos,
            quantidadeParcelas: p.parcelas,
            taxaMensal: 0,
            dataCompra: p.data,
            categoriaId: p.categoriaId,
            pessoaId: p.pessoaId,
            estabelecimento: p.estabelecimento ?? undefined
          })
        } else {
          await this.criarTransacao.executar({
            descricao: p.descricao,
            valorCentavos: p.valorCentavos,
            tipo: p.tipo,
            data: p.data,
            pessoaId: p.pessoaId,
            categoriaId: p.categoriaId,
            estabelecimento: p.estabelecimento ?? undefined
          })
        }
        criados++
      } catch (erro) {
        falhas.push({ descricao: p.descricao, erro: (erro as Error).message })
      }
    }

    const mensagem =
      falhas.length === 0
        ? `${criados} lançamento${criados === 1 ? '' : 's'} registrado${criados === 1 ? '' : 's'}.`
        : `${criados} registrado${criados === 1 ? '' : 's'}; ${falhas.length} com problema: ${falhas.map((f) => `${f.descricao} (${f.erro})`).join('; ')}.`
    return { criados, falhas, mensagem }
  }
}

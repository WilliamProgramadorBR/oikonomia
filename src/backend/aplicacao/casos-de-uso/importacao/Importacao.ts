import type {
  ArquivoEntrada,
  ConfirmarContrachequeEntrada,
  ContrachequeLidoDTO,
  NotaFiscalLidaDTO,
  ResultadoContrachequeDTO
} from '@compartilhado/dtos/importacao'
import { intervaloDoMes } from '@compartilhado/utilitarios/mes'
import { ErroDominio } from '../../../dominio/erros/ErroDominio'
import type { IConsultaNfce, NotaFiscal } from '../../../dominio/portas/IConsultaNfce'
import type { IProvedorIA } from '../../../dominio/portas/IProvedorIA'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'
import { extrairChave, formatarCnpj, interpretarChave } from '../../../dominio/servicos/ChaveNfce'
import { moeda, nomeMes } from '../../servicos/formatacao'
import type { ConfirmarTransacao } from '../transacao/ConfirmarTransacao'
import type { CriarTransacao } from '../transacao/CriarTransacao'

const TIPOS_ACEITOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const TAMANHO_MAXIMO = 15 * 1024 * 1024
const paraCentavos = (reais: unknown) =>
  typeof reais === 'number' && Number.isFinite(reais) ? Math.round(reais * 100) : null

// ===== Contracheque =====

const ESQUEMA_CONTRACHEQUE = {
  type: 'OBJECT',
  properties: {
    empresa: { type: 'STRING', nullable: true },
    competencia: { type: 'STRING', nullable: true, description: 'mês de referência no formato AAAA-MM' },
    salarioBruto: { type: 'NUMBER', nullable: true, description: 'total de vencimentos, em reais' },
    descontos: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { descricao: { type: 'STRING' }, valor: { type: 'NUMBER' } }, required: ['descricao', 'valor'] }
    },
    liquido: { type: 'NUMBER', nullable: true, description: 'valor líquido a receber, em reais' },
    dataPagamento: { type: 'STRING', nullable: true, description: 'AAAA-MM-DD, se constar' }
  },
  required: ['descontos']
}

interface ContrachequeIA {
  empresa: string | null
  competencia: string | null
  salarioBruto: number | null
  descontos: { descricao: string; valor: number }[]
  liquido: number | null
  dataPagamento: string | null
}

const vazio = (aviso: string, lidoPorIA = false): ContrachequeLidoDTO => ({
  lidoPorIA,
  aviso,
  empresa: null,
  competencia: null,
  salarioBrutoCentavos: null,
  descontos: [],
  liquidoCentavos: null,
  dataPagamento: null
})

export class LerContracheque {
  constructor(private readonly ia: IProvedorIA) {}

  async executar(arquivo: ArquivoEntrada): Promise<ContrachequeLidoDTO> {
    if (!TIPOS_ACEITOS.includes(arquivo.mime)) throw new ErroDominio('Envie um PDF ou uma foto (JPG, PNG ou WEBP).')
    if ((arquivo.base64.length * 3) / 4 > TAMANHO_MAXIMO) throw new ErroDominio('Arquivo muito grande (máximo de 15 MB).')

    if (!(await this.ia.disponivel())) {
      return vazio('Sem IA configurada, o app não lê o documento sozinho. Preencha os valores abaixo olhando o contracheque.')
    }
    try {
      const lido = await this.ia.gerarJson<ContrachequeIA>({
        sistema: 'Você extrai dados de contracheques (holerites) brasileiros com precisão. Não invente: use null quando não encontrar.',
        prompt: 'Extraia os dados deste contracheque. Valores em reais, com centavos.',
        esquema: ESQUEMA_CONTRACHEQUE,
        anexos: [{ mime: arquivo.mime, base64: arquivo.base64 }]
      })
      return {
        lidoPorIA: true,
        aviso: 'Lido pela IA: confira os valores antes de lançar.',
        empresa: lido.empresa ?? null,
        competencia: /^\d{4}-\d{2}$/.test(lido.competencia ?? '') ? lido.competencia : null,
        salarioBrutoCentavos: paraCentavos(lido.salarioBruto),
        descontos: (lido.descontos ?? []).map((d) => ({ descricao: d.descricao, valorCentavos: paraCentavos(d.valor) ?? 0 })),
        liquidoCentavos: paraCentavos(lido.liquido),
        dataPagamento: /^\d{4}-\d{2}-\d{2}$/.test(lido.dataPagamento ?? '') ? lido.dataPagamento : null
      }
    } catch (erro) {
      return vazio(`Não foi possível ler com a IA (${(erro as Error).message}). Preencha os valores manualmente.`)
    }
  }
}

// Se existe salário previsto (conta recorrente) no mês do pagamento ou da competência, confirma
// com o valor real; senão, cria a receita.
export class ConfirmarContracheque {
  constructor(
    private readonly transacaoRepositorio: ITransacaoRepositorio,
    private readonly confirmarTransacao: ConfirmarTransacao,
    private readonly criarTransacao: CriarTransacao
  ) {}

  async executar(e: ConfirmarContrachequeEntrada): Promise<ResultadoContrachequeDTO> {
    const mesPagamento = e.dataPagamento.slice(0, 7)
    for (const mes of [...new Set([mesPagamento, e.competencia])]) {
      const previstas = (await this.transacaoRepositorio.listar({ pessoaId: e.pessoaId, ...intervaloDoMes(mes) })).filter(
        (t) => t.tipo === 'receita' && t.status === 'prevista' && t.categoriaId === 'cat-salario'
      )
      if (previstas[0]) {
        await this.confirmarTransacao.executar({ id: previstas[0].id, valorCentavos: e.liquidoCentavos, data: e.dataPagamento })
        return {
          acao: 'confirmou_previsto',
          mensagem: `Salário previsto de ${nomeMes(mes)} confirmado com ${moeda(e.liquidoCentavos)}.`
        }
      }
    }

    await this.criarTransacao.executar({
      descricao: e.descricao,
      valorCentavos: e.liquidoCentavos,
      tipo: 'receita',
      data: e.dataPagamento,
      pessoaId: e.pessoaId,
      categoriaId: 'cat-salario'
    })
    return { acao: 'criou_receita', mensagem: `Receita de ${moeda(e.liquidoCentavos)} lançada.` }
  }
}

// ===== Nota fiscal (NFC-e) =====

const CATEGORIA_POR_PALAVRA: [RegExp, string][] = [
  [/SUPERMERC|MERCADO|ATACAD|HORTI|PADARIA|ACOUGUE|MERCEARIA/i, 'cat-mercado'],
  [/POSTO|COMBUST|AUTO ?POSTO/i, 'cat-transporte'],
  [/FARMA|DROGA/i, 'cat-saude'],
  [/RESTAUR|LANCHON|PIZZ|BURGER|CAFE|BAR\b|SORVET/i, 'cat-alimentacao'],
  [/PET\b|PETSHOP|VETERIN/i, 'cat-pets'],
  [/LIVRAR|PAPELAR|ESCOLA/i, 'cat-educacao']
]

const ESQUEMA_NOTA = {
  type: 'OBJECT',
  properties: {
    emitente: { type: 'STRING', nullable: true },
    cnpj: { type: 'STRING', nullable: true },
    data: { type: 'STRING', nullable: true, description: 'AAAA-MM-DD' },
    total: { type: 'NUMBER', nullable: true, description: 'valor total pago, em reais' },
    itens: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { descricao: { type: 'STRING' }, quantidade: { type: 'NUMBER' }, valor: { type: 'NUMBER' } },
        required: ['descricao', 'valor']
      }
    }
  },
  required: ['itens']
}

export class LerNotaFiscal {
  constructor(
    private readonly consulta: IConsultaNfce,
    private readonly ia: IProvedorIA
  ) {}

  async executar(endereco: string): Promise<NotaFiscalLidaDTO> {
    const url = endereco.trim()
    const dadosChave = interpretarChave(extrairChave(url) ?? '')
    if (!dadosChave && !/^https?:\/\//i.test(url)) {
      throw new ErroDominio('Não encontrei o endereço nem a chave de acesso da nota. Confira o QR code.')
    }

    const resultado = (nota: NotaFiscal, origem: NotaFiscalLidaDTO['origem'], aviso: string | null): NotaFiscalLidaDTO => ({
      origem,
      aviso,
      url,
      ...nota,
      cnpj: nota.cnpj ?? dadosChave?.cnpj ?? null,
      categoriaSugeridaId: CATEGORIA_POR_PALAVRA.find(([padrao]) => padrao.test(nota.emitente ?? ''))?.[1] ?? null
    })

    let motivo = 'o endereço não é de consulta'
    if (/^https?:\/\//i.test(url)) {
      try {
        const pagina = await this.consulta.consultar(url)
        if (pagina.nota) return resultado(pagina.nota, 'sefaz', null)
        motivo = 'a página da SEFAZ deste estado tem um formato diferente'

        if (await this.ia.disponivel()) {
          const lida = await this.ia.gerarJson<{ emitente: string | null; cnpj: string | null; data: string | null; total: number | null; itens: { descricao: string; quantidade?: number; valor: number }[] }>({
            sistema: 'Você extrai dados de notas fiscais de consumidor (NFC-e) brasileiras a partir do texto da página. Não invente: use null quando não houver.',
            prompt: `Texto da página da nota:\n${pagina.texto}`,
            esquema: ESQUEMA_NOTA
          })
          if (lida.total) {
            return resultado(
              {
                emitente: lida.emitente,
                cnpj: lida.cnpj?.replace(/\D/g, '') || null,
                data: /^\d{4}-\d{2}-\d{2}$/.test(lida.data ?? '') ? lida.data : null,
                totalCentavos: paraCentavos(lida.total),
                itens: (lida.itens ?? []).map((i) => ({ descricao: i.descricao, quantidade: i.quantidade ?? 1, valorCentavos: paraCentavos(i.valor) ?? 0 }))
              },
              'ia',
              'Lida pela IA a partir da página da SEFAZ: confira antes de lançar.'
            )
          }
        }
      } catch (erro) {
        motivo = (erro as Error).message
      }
    }

    // Última tentativa: o que a própria chave de acesso informa.
    return resultado(
      {
        emitente: dadosChave ? `CNPJ ${formatarCnpj(dadosChave.cnpj)}` : null,
        cnpj: dadosChave?.cnpj ?? null,
        data: null,
        totalCentavos: null,
        itens: []
      },
      'chave',
      `Não consegui ler os itens (${motivo}). ${dadosChave ? `Pela chave: emitida em ${nomeMes(dadosChave.anoMes)} de ${dadosChave.anoMes.slice(0, 4)}. ` : ''}Informe o valor e a data olhando a nota.`
    )
  }
}

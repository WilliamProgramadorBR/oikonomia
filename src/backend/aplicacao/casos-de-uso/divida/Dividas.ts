import type {
  CriarDividaEntrada,
  DividaDTO,
  MetodoQuitacao,
  PlanoDividasDTO,
  ResultadoQuitacaoDTO,
  SimulacaoCreditoDTO,
  SimularCreditoEntrada,
  SugestaoTrocaDTO
} from '@compartilhado/dtos/divida'
import { parcelaPrice, saldoApos, simularFinanciamento, valorPresente } from '@compartilhado/financeiro/credito'
import { deslocarMes, hojeISO, mesAtual } from '@compartilhado/utilitarios/mes'
import { Divida, type TipoDivida } from '../../../dominio/entidades/Divida'
import { PERFIL_PADRAO, parametrosDoPerfil } from '../../../dominio/entidades/PerfilFinanceiro'
import { Recorrencia } from '../../../dominio/entidades/Recorrencia'
import type { ModalidadeCredito, TaxaMercado } from '../../../dominio/entidades/TaxaMercado'
import { ErroDominio, ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { ICartaoRepositorio } from '../../../dominio/repositorios/ICartaoRepositorio'
import type { ICompraCartaoRepositorio } from '../../../dominio/repositorios/ICompraCartaoRepositorio'
import type { IDividaRepositorio } from '../../../dominio/repositorios/IDividaRepositorio'
import type { IPerfilRepositorio } from '../../../dominio/repositorios/IPerfilRepositorio'
import type { IPessoaRepositorio } from '../../../dominio/repositorios/IPessoaRepositorio'
import type { IRecorrenciaRepositorio } from '../../../dominio/repositorios/IRecorrenciaRepositorio'
import type { ITaxaMercadoRepositorio } from '../../../dominio/repositorios/ITaxaMercadoRepositorio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'
import { simularQuitacao, type DividaParaQuitar, type Metodo } from '../../../dominio/servicos/EstrategiaQuitacao'
import { moeda, nomeMes } from '../../servicos/formatacao'

const taxaTexto = (percentualMensal: number) =>
  `${percentualMensal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% a.m.`
import type { ObterPrevisao } from '../previsao/ObterPrevisao'
import type { EncerrarRecorrencia } from '../recorrencia/EncerrarRecorrencia'
import type { ObterSaudeFinanceira } from '../saude/ObterSaudeFinanceira'
import type { SincronizarRecorrencias } from '../recorrencia/SincronizarRecorrencias'

// Modalidade do Banco Central usada para comparar a taxa de cada tipo de dívida.
const MODALIDADE_DO_TIPO: Record<TipoDivida, ModalidadeCredito | null> = {
  emprestimo_pessoal: 'credito_pessoal',
  consignado: 'consignado_privado',
  financiamento_imovel: 'imobiliario_tr',
  financiamento_veiculo: 'veiculos',
  cheque_especial: 'cheque_especial',
  rotativo_cartao: 'cartao_rotativo',
  outro: null
}

const MESES_COMPARACAO_SEM_PARCELA = 12
const ECONOMIA_MINIMA = 5000 // R$ 50: abaixo disso a troca não compensa a burocracia

const mediana = (valores: number[]) => {
  if (valores.length === 0) return null
  const ordenados = [...valores].sort((a, b) => a - b)
  return ordenados[Math.floor(ordenados.length / 2)]
}

function medianasPorModalidade(taxas: TaxaMercado[]): Map<ModalidadeCredito, number> {
  const grupos = new Map<ModalidadeCredito, number[]>()
  for (const t of taxas) grupos.set(t.modalidade, [...(grupos.get(t.modalidade) ?? []), t.taxaMensal])
  return new Map([...grupos].map(([m, valores]) => [m, mediana(valores)!]))
}

// ===== Cadastro =====

export class CriarDivida {
  constructor(
    private readonly dividaRepositorio: IDividaRepositorio,
    private readonly pessoaRepositorio: IPessoaRepositorio,
    private readonly recorrenciaRepositorio: IRecorrenciaRepositorio,
    private readonly sincronizar: SincronizarRecorrencias
  ) {}

  async executar(entrada: CriarDividaEntrada): Promise<void> {
    if (!(await this.pessoaRepositorio.buscarPorId(entrada.pessoaId))) {
      throw new ErroNaoEncontrado('Pessoa', entrada.pessoaId)
    }

    const divida = Divida.criar({
      ...entrada,
      parcelasTotais: entrada.parcelasRestantes,
      saldoInicialCentavos: entrada.saldoDevedorCentavos
    })
    await this.dividaRepositorio.salvar(divida)
    if (divida.parcelaCentavos === 0) return

    // A parcela vira conta recorrente com fim definido. Se o vencimento deste mês já passou,
    // consideramos que a próxima parcela é a do mês que vem.
    const atual = mesAtual()
    const inicio = Number(hojeISO().slice(8, 10)) > divida.diaVencimento ? deslocarMes(atual, 1) : atual
    const recorrencia = Recorrencia.criar({
      descricao: `Parcela: ${divida.nome}`,
      tipo: 'despesa',
      valorVariavel: false,
      valorCentavos: divida.parcelaCentavos,
      diaDoMes: divida.diaVencimento,
      categoriaId: 'cat-emprestimos',
      pessoaId: divida.pessoaId,
      cartaoId: null,
      inicio,
      dividaId: divida.id
    })
    recorrencia.encerrar(deslocarMes(inicio, divida.parcelasTotais - 1))
    await this.recorrenciaRepositorio.salvar(recorrencia)
    await this.sincronizar.executar()
  }
}

export class RemoverDivida {
  constructor(
    private readonly dividaRepositorio: IDividaRepositorio,
    private readonly recorrenciaRepositorio: IRecorrenciaRepositorio,
    private readonly encerrarRecorrencia: EncerrarRecorrencia
  ) {}

  async executar(id: string): Promise<void> {
    if (!(await this.dividaRepositorio.buscarPorId(id))) throw new ErroNaoEncontrado('Dívida', id)
    const proximo = deslocarMes(mesAtual(), 1)
    for (const r of (await this.recorrenciaRepositorio.listar()).filter((r) => r.dividaId === id)) {
      await this.encerrarRecorrencia.executar({ id: r.id, aPartirDe: proximo })
    }
    await this.dividaRepositorio.remover(id)
  }
}

// ===== Plano de quitação =====

export class ObterPlanoDividas {
  constructor(
    private readonly dividaRepositorio: IDividaRepositorio,
    private readonly recorrenciaRepositorio: IRecorrenciaRepositorio,
    private readonly transacaoRepositorio: ITransacaoRepositorio,
    private readonly compraRepositorio: ICompraCartaoRepositorio,
    private readonly cartaoRepositorio: ICartaoRepositorio,
    private readonly taxaRepositorio: ITaxaMercadoRepositorio,
    private readonly perfilRepositorio: IPerfilRepositorio,
    private readonly obterPrevisao: ObterPrevisao
  ) {}

  async executar(extraInformado: number | null): Promise<PlanoDividasDTO> {
    const atual = mesAtual()
    const hoje = hojeISO()
    const [dividas, recorrencias, compras, cartoes, taxas, perfil, previsao, cobrancasFuturas] = await Promise.all([
      this.dividaRepositorio.listar(),
      this.recorrenciaRepositorio.listar(),
      this.compraRepositorio.listar(),
      this.cartaoRepositorio.listar(),
      this.taxaRepositorio.listar(),
      this.perfilRepositorio.obter(),
      this.obterPrevisao.executar({ pessoaId: null, mesInicial: deslocarMes(atual, 1) }),
      this.transacaoRepositorio.listar({ somenteCartao: true, inicio: hoje })
    ])
    const medianas = medianasPorModalidade(taxas)
    const lista: DividaDTO[] = []

    // Dívidas cadastradas: o saldo cai a cada parcela confirmada.
    for (const d of dividas) {
      const taxa = d.taxaMensal / 100
      const recorrencia = recorrencias.find((r) => r.dividaId === d.id)
      const pagas = recorrencia
        ? (await this.transacaoRepositorio.listar({ recorrenciaId: recorrencia.id })).filter(
            (t) => t.status === 'confirmada'
          ).length
        : 0
      const temParcela = d.parcelaCentavos > 0
      const restantes = temParcela ? Math.max(0, d.parcelasTotais - pagas) : 0
      const saldo = temParcela
        ? restantes === 0
          ? 0
          : Math.round(saldoApos(d.saldoInicialCentavos, d.parcelaCentavos, taxa, pagas))
        : d.saldoInicialCentavos
      const modalidade = MODALIDADE_DO_TIPO[d.tipo]

      lista.push({
        id: d.id,
        origem: 'cadastrada',
        nome: d.nome,
        tipo: d.tipo,
        credor: d.credor,
        taxaMensal: d.taxaMensal,
        taxaMercadoMediana: modalidade ? (medianas.get(modalidade) ?? null) : null,
        parcelaCentavos: d.parcelaCentavos,
        parcelasTotais: d.parcelasTotais,
        parcelasPagas: pagas,
        parcelasRestantes: restantes,
        saldoAtualCentavos: saldo,
        // Sem parcela fixa: quanto de juros correria em 12 meses se nada fosse pago.
        jurosRestantesCentavos: temParcela
          ? Math.max(0, d.parcelaCentavos * restantes - saldo)
          : Math.round(saldo * (Math.pow(1 + taxa, MESES_COMPARACAO_SEM_PARCELA) - 1)),
        quitacaoPrevista: temParcela && restantes > 0 ? deslocarMes(atual, restantes) : null,
        pessoaId: d.pessoaId
      })
    }

    // Compras parceladas COM juros no cartão também são dívida.
    for (const compra of compras.filter((c) => c.taxaMensal > 0 || c.natureza === 'parcelamento_fatura')) {
      const futuras = cobrancasFuturas.filter((t) => t.parcela?.compraId === compra.id)
      if (futuras.length === 0) continue
      const parcela = futuras[0].valorCentavos
      const taxa = compra.taxaMensal / 100
      const saldo = Math.round(valorPresente(parcela, taxa, futuras.length))
      lista.push({
        id: compra.id,
        origem: 'cartao',
        nome: compra.natureza === 'parcelamento_fatura' ? `${compra.descricao} (fatura parcelada)` : `${compra.descricao} (parcelado no cartão)`,
        tipo: 'outro',
        credor: cartoes.find((c) => c.id === compra.cartaoId)?.apelido ?? 'Cartão',
        taxaMensal: compra.taxaMensal,
        taxaMercadoMediana: medianas.get('cartao_parcelado') ?? null,
        parcelaCentavos: parcela,
        parcelasTotais: compra.quantidadeParcelas,
        parcelasPagas: compra.quantidadeParcelas - futuras.length,
        parcelasRestantes: futuras.length,
        saldoAtualCentavos: saldo,
        jurosRestantesCentavos: Math.max(0, parcela * futuras.length - saldo),
        quitacaoPrevista: futuras[0].data.toISOString().slice(0, 7), // lista vem da mais distante para a mais próxima
        pessoaId: compra.pessoaId
      })
    }

    const abertas = lista.filter((d) => d.saldoAtualCentavos > 0)
    const parametros = parametrosDoPerfil(perfil ?? PERFIL_PADRAO)
    const media = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0)
    const folgaMensal = Math.max(
      0,
      Math.round(
        media(previsao.meses.map((m) => m.saldoProjetado)) -
          media(previsao.meses.map((m) => m.receitas)) * parametros.margemSeguranca
      )
    )
    const extraMensal = Math.max(0, extraInformado ?? folgaMensal)

    const paraQuitar: DividaParaQuitar[] = abertas.map((d) => ({
      id: d.id,
      saldo: d.saldoAtualCentavos,
      taxaMensal: d.taxaMensal / 100,
      parcela: d.parcelaCentavos
    }))
    const resultado = (metodo: Metodo): ResultadoQuitacaoDTO => {
      const r = simularQuitacao(paraQuitar, extraMensal, metodo)
      return {
        meses: r.meses,
        livreEm: r.meses !== null ? deslocarMes(atual, r.meses) : null,
        totalJuros: r.totalJuros,
        ordem: abertas
          .map((d) => {
            const mes = r.quitadaEm.get(d.id) ?? null
            return { id: d.id, nome: d.nome, quitadaEm: mes !== null ? deslocarMes(atual, mes) : null, _mes: mes }
          })
          .sort((a, b) => (a._mes ?? Infinity) - (b._mes ?? Infinity))
          .map(({ _mes, ...item }) => item)
      }
    }
    const resultados = {
      minimo: resultado('minimo'),
      avalanche: resultado('avalanche'),
      bola_de_neve: resultado('bola_de_neve')
    }

    // Bola de neve só ganha se custar quase o mesmo (até 5% a mais de juros ou R$ 100).
    const jurosAvalanche = resultados.avalanche.totalJuros
    const jurosBola = resultados.bola_de_neve.totalJuros
    const recomendado: MetodoQuitacao =
      jurosAvalanche !== null && jurosBola !== null && jurosBola - jurosAvalanche <= Math.max(jurosAvalanche * 0.05, 10000)
        ? 'bola_de_neve'
        : 'avalanche'

    return {
      dividas: lista,
      totalDevido: abertas.reduce((s, d) => s + d.saldoAtualCentavos, 0),
      parcelasMensais: abertas.reduce((s, d) => s + d.parcelaCentavos, 0),
      jurosRestantes: abertas.reduce((s, d) => s + d.jurosRestantesCentavos, 0),
      extraMensal,
      folgaMensal,
      resultados,
      recomendado,
      explicacao: explicar(resultados, recomendado, extraMensal, abertas.length),
      trocas: sugerirTrocas(abertas, medianas)
    }
  }
}

function explicar(
  r: PlanoDividasDTO['resultados'],
  recomendado: MetodoQuitacao,
  extra: number,
  quantidade: number
): string {
  if (quantidade === 0) return 'Nenhuma dívida em aberto. Mantenha assim: guarde a folga para a reserva e os objetivos.'
  const escolhido = r[recomendado]
  if (escolhido.meses === null) {
    return 'Com os pagamentos atuais, nem todas as dívidas são quitadas: as que não têm parcela fixa (cheque especial, rotativo) crescem todo mês. É preciso direcionar um valor extra para elas, ou trocá-las por um crédito mais barato com parcelas.'
  }
  const prazo = `livres das dívidas em ${nomeMes(escolhido.livreEm!)} de ${escolhido.livreEm!.slice(0, 4)}`
  const comparacao =
    r.minimo.totalJuros === null
      ? ' Pagando só as parcelas, parte das dívidas nunca terminaria.'
      : ` Em relação a pagar só as parcelas, são ${moeda(Math.max(0, r.minimo.totalJuros - escolhido.totalJuros!))} a menos em juros.`
  const base =
    extra > 0
      ? `Colocando ${moeda(extra)} a mais por mês, vocês ficam ${prazo}.${comparacao}`
      : `Pagando só as parcelas, vocês ficam ${prazo}. Qualquer valor extra por mês antecipa a quitação e reduz os juros.`
  return recomendado === 'avalanche'
    ? `${base} A estratégia avalanche (maior juro primeiro) é a que mais economiza aqui.`
    : `${base} A bola de neve (menor saldo primeiro) custa praticamente o mesmo e quita a primeira dívida mais cedo, o que ajuda a manter o ritmo.`
}

function sugerirTrocas(dividas: DividaDTO[], medianas: Map<ModalidadeCredito, number>): SugestaoTrocaDTO[] {
  const sugestoes: SugestaoTrocaDTO[] = []
  const alternativas: { modalidade: ModalidadeCredito; nome: string; observacao: string }[] = [
    {
      modalidade: 'consignado_privado',
      nome: 'Crédito consignado',
      observacao: 'Exige vínculo (CLT, servidor ou aposentado do INSS) e margem consignável disponível.'
    },
    {
      modalidade: 'credito_pessoal',
      nome: 'Crédito pessoal',
      observacao: 'A taxa real depende do seu perfil de crédito: peça a simulação com CET ao banco.'
    }
  ]

  for (const d of dividas) {
    const taxaAtual = d.taxaMensal / 100
    const meses = d.parcelasRestantes || MESES_COMPARACAO_SEM_PARCELA
    const custoAtual = d.parcelaCentavos > 0 ? d.parcelaCentavos * meses : d.saldoAtualCentavos * Math.pow(1 + taxaAtual, meses)

    const economiaCom = (taxa: number) =>
      Math.round(custoAtual - parcelaPrice(d.saldoAtualCentavos, taxa / 100, meses) * meses)
    const opcoes = alternativas
      .map((a) => ({ ...a, taxa: medianas.get(a.modalidade) }))
      .filter((a): a is typeof a & { taxa: number } => a.taxa !== undefined && a.taxa < d.taxaMensal * 0.8)
      .map((a) => ({ ...a, economia: economiaCom(a.taxa) }))
      .filter((a) => a.economia >= ECONOMIA_MINIMA)
      .sort((a, b) => a.taxa - b.taxa)
    const [melhor, planoB] = opcoes
    if (melhor) {
      // Consignado exige vínculo: mostra também o plano B, se houver.
      const alternativaB = planoB
        ? ` Sem acesso a ele, ${planoB.nome.toLowerCase()} (${taxaTexto(planoB.taxa)}) ainda economizaria ${moeda(planoB.economia)}.`
        : ''
      sugestoes.push({
        dividaId: d.id,
        dividaNome: d.nome,
        taxaAtual: d.taxaMensal,
        alternativa: melhor.nome,
        taxaAlternativa: melhor.taxa,
        economiaCentavos: melhor.economia,
        observacao: `Quitar "${d.nome}" (${taxaTexto(d.taxaMensal)}) com ${melhor.nome.toLowerCase()} na mediana do mercado (${taxaTexto(melhor.taxa)}), no mesmo prazo. ${melhor.observacao}${alternativaB}`
      })
      continue
    }

    // Mesma modalidade, mas bem acima da mediana: portabilidade.
    if (d.taxaMercadoMediana !== null && d.taxaMensal > d.taxaMercadoMediana * 1.2 && d.origem === 'cadastrada') {
      const custoNovo = parcelaPrice(d.saldoAtualCentavos, d.taxaMercadoMediana / 100, meses) * meses
      const economia = Math.round(custoAtual - custoNovo)
      if (economia >= ECONOMIA_MINIMA) {
        sugestoes.push({
          dividaId: d.id,
          dividaNome: d.nome,
          taxaAtual: d.taxaMensal,
          alternativa: 'Portabilidade',
          taxaAlternativa: d.taxaMercadoMediana,
          economiaCentavos: economia,
          observacao: `A taxa de "${d.nome}" está bem acima da mediana do mercado para esse tipo de crédito. A portabilidade leva a dívida para outro banco com taxa menor, sem custo (é um direito garantido pelo Banco Central).`
        })
      }
    }
  }

  return sugestoes.sort((a, b) => b.economiaCentavos - a.economiaCentavos)
}

// ===== Simulador de crédito (ranking de bancos) =====

export class SimularCredito {
  constructor(
    private readonly taxaRepositorio: ITaxaMercadoRepositorio,
    private readonly obterSaude: ObterSaudeFinanceira
  ) {}

  async executar({ modalidade, valorCentavos, meses, sistema }: SimularCreditoEntrada): Promise<SimulacaoCreditoDTO> {
    if (!Number.isInteger(valorCentavos) || valorCentavos <= 0) throw new ErroDominio('Informe o valor do crédito.')
    if (!Number.isInteger(meses) || meses < 1 || meses > 420) throw new ErroDominio('O prazo deve estar entre 1 e 420 meses.')

    const [taxas, saude] = await Promise.all([this.taxaRepositorio.listar(modalidade), this.obterSaude.executar(null)])
    const limite = saude.dadosSuficientes ? saude.limiteCredito.parcelaMensalMaxima : null

    return {
      limiteSeguroMensal: limite,
      ofertas: taxas
        .map((t) => {
          const r = simularFinanciamento(valorCentavos, t.taxaMensal, meses, sistema)
          return {
            cnpj8: t.cnpj8,
            instituicao: t.instituicao,
            taxaMensal: t.taxaMensal,
            taxaAnual: t.taxaAnual,
            primeiraParcela: r.primeiraParcela,
            ultimaParcela: r.ultimaParcela,
            totalPago: r.totalPago,
            totalJuros: r.totalJuros,
            cabeNoOrcamento: limite !== null ? r.primeiraParcela <= limite : null
          }
        })
        .sort((a, b) => a.totalPago - b.totalPago)
    }
  }
}

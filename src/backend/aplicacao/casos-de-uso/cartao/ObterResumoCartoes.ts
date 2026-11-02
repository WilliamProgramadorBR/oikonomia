import type { FiltroResumoCartoes, ResumoCartaoDTO } from '@compartilhado/dtos/cartao'
import { deslocarMes, hojeISO } from '@compartilhado/utilitarios/mes'
import type { Transacao } from '../../../dominio/entidades/Transacao'
import type { ICartaoRepositorio } from '../../../dominio/repositorios/ICartaoRepositorio'
import type { ICompraCartaoRepositorio } from '../../../dominio/repositorios/ICompraCartaoRepositorio'
import type { ITaxaMercadoRepositorio } from '../../../dominio/repositorios/ITaxaMercadoRepositorio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'
import { CartaoMapeador, indexarTaxasDeCartao } from '../../mapeadores/CartaoMapeador'

const MESES_PROJETADOS = 6

const dataISO = (t: Transacao) => t.data.toISOString().slice(0, 10)
const somar = (cobrancas: Transacao[]) => cobrancas.reduce((soma, p) => soma + p.valorCentavos, 0)

// Fatura do mês, limite comprometido e próximas faturas de cada cartão.
// Uma fatura tem parcelas de compras e contas recorrentes cobradas no cartão.
// Limite comprometido: cobranças de valor certo que vencem a partir de hoje
// (contas recorrentes ainda previstas não ocupam limite: a cobrança não aconteceu).
export class ObterResumoCartoes {
  constructor(
    private readonly cartaoRepositorio: ICartaoRepositorio,
    private readonly compraRepositorio: ICompraCartaoRepositorio,
    private readonly transacaoRepositorio: ITransacaoRepositorio,
    private readonly taxaRepositorio: ITaxaMercadoRepositorio
  ) {}

  async executar({ pessoaId, mes }: FiltroResumoCartoes): Promise<ResumoCartaoDTO[]> {
    const hoje = hojeISO()
    const [cartoes, compras, cobrancas, taxas] = await Promise.all([
      this.cartaoRepositorio.listar(),
      this.compraRepositorio.listar(),
      this.transacaoRepositorio.listar({ somenteCartao: true }),
      this.taxaRepositorio.listar()
    ])

    const indiceTaxas = indexarTaxasDeCartao(taxas)
    const parcelasPorCompra = new Map<string, Transacao[]>()
    for (const t of cobrancas) {
      if (!t.parcela) continue
      parcelasPorCompra.set(t.parcela.compraId, [...(parcelasPorCompra.get(t.parcela.compraId) ?? []), t])
    }
    const meses = Array.from({ length: MESES_PROJETADOS }, (_, k) => deslocarMes(mes, k))

    return cartoes
      .filter((cartao) => !pessoaId || cartao.pessoaId === pessoaId)
      .map((cartao) => {
        const doCartao = cobrancas.filter((t) => t.cartaoId === cartao.id)
        const certas = doCartao.filter((t) => t.status === 'confirmada')
        const previstas = doCartao.filter((t) => t.status === 'prevista')
        const limiteUsado = somar(certas.filter((t) => dataISO(t) >= hoje))
        const doMes = (lista: Transacao[], m: string) => lista.filter((t) => dataISO(t).startsWith(m))

        return {
          cartao: CartaoMapeador.paraDTO(cartao, indiceTaxas),
          faturaDoMesCentavos: somar(doMes(doCartao, mes)),
          limiteUsadoCentavos: limiteUsado,
          limiteDisponivelCentavos: cartao.limiteCentavos - limiteUsado,
          proximasFaturas: meses.map((m) => ({
            mes: m,
            totalCentavos: somar(doMes(certas, m)),
            previstoCentavos: somar(doMes(previstas, m))
          })),
          comprasAtivas: compras
            .filter((compra) => compra.cartaoId === cartao.id)
            .map((compra) => ({ compra, suas: parcelasPorCompra.get(compra.id) ?? [] }))
            .filter(({ suas }) => suas.some((p) => dataISO(p) >= hoje))
            .map(({ compra, suas }) => CartaoMapeador.compraParaDTO(compra, suas, hoje))
        }
      })
  }
}

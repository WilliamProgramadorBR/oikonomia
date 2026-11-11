import type { CompraCartaoDTO, CriarCompraCartaoEntrada } from '@compartilhado/dtos/cartao'
import {
  calcularParcelamento,
  dataDeVencimento,
  mesDaPrimeiraFatura,
  taxaImplicita
} from '@compartilhado/financeiro/parcelamento'
import { deslocarMes, hojeISO } from '@compartilhado/utilitarios/mes'
import { CompraCartao } from '../../../dominio/entidades/CompraCartao'
import { Transacao } from '../../../dominio/entidades/Transacao'
import { ErroDominio, ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { ICartaoRepositorio } from '../../../dominio/repositorios/ICartaoRepositorio'
import type { ICategoriaRepositorio } from '../../../dominio/repositorios/ICategoriaRepositorio'
import type { ICompraCartaoRepositorio } from '../../../dominio/repositorios/ICompraCartaoRepositorio'
import type { IPessoaRepositorio } from '../../../dominio/repositorios/IPessoaRepositorio'
import { CartaoMapeador } from '../../mapeadores/CartaoMapeador'

// Registra a compra e gera uma transação de despesa por parcela, cada uma na fatura em que vence.
// Também registra compras que já estavam em andamento e parcelamentos de fatura (só as parcelas que faltam).
export class CriarCompraCartao {
  constructor(
    private readonly compraRepositorio: ICompraCartaoRepositorio,
    private readonly cartaoRepositorio: ICartaoRepositorio,
    private readonly pessoaRepositorio: IPessoaRepositorio,
    private readonly categoriaRepositorio: ICategoriaRepositorio
  ) {}

  async executar(entrada: CriarCompraCartaoEntrada): Promise<CompraCartaoDTO> {
    const [cartao, categoria] = await Promise.all([
      this.cartaoRepositorio.buscarPorId(entrada.cartaoId),
      this.categoriaRepositorio.buscarPorId(entrada.categoriaId)
    ])
    if (!cartao) throw new ErroNaoEncontrado('Cartão', entrada.cartaoId)
    if (entrada.pessoaId && !(await this.pessoaRepositorio.buscarPorId(entrada.pessoaId))) {
      throw new ErroNaoEncontrado('Pessoa', entrada.pessoaId)
    }
    if (!categoria) throw new ErroNaoEncontrado('Categoria', entrada.categoriaId)
    if (categoria.tipo !== 'despesa') {
      throw new ErroDominio('Compras no cartão precisam de uma categoria de despesa.')
    }

    const andamento = entrada.emAndamento ?? null
    const parcelamentoFatura = entrada.natureza === 'parcelamento_fatura'
    if (parcelamentoFatura && !andamento) throw new ErroDominio('Informe as parcelas do parcelamento da fatura.')

    let valorCentavos = entrada.valorCentavos
    let taxaMensal = entrada.taxaMensal
    let dataCompra = entrada.dataCompra
    if (andamento) {
      const restantes = Math.round(andamento.parcelasRestantes)
      if (!(restantes >= 1 && restantes <= entrada.quantidadeParcelas)) {
        throw new ErroDominio('As parcelas que faltam devem estar entre 1 e o total de parcelas.')
      }
      if (!Number.isInteger(andamento.valorParcelaCentavos) || andamento.valorParcelaCentavos <= 0) {
        throw new ErroDominio('Informe o valor da parcela.')
      }
      if (!/^\d{4}-\d{2}$/.test(andamento.proximaFatura)) throw new ErroDominio('Informe a fatura da próxima parcela.')
      // Sem o valor original, considera sem juros (soma das parcelas). Com ele, calcula a taxa embutida.
      const totalParcelas = andamento.valorParcelaCentavos * entrada.quantidadeParcelas
      if (!(valorCentavos > 0)) valorCentavos = totalParcelas
      if (valorCentavos > totalParcelas) throw new ErroDominio('O valor original não pode ser maior que a soma das parcelas.')
      if (!(taxaMensal > 0)) taxaMensal = taxaImplicita(valorCentavos, andamento.valorParcelaCentavos, entrada.quantidadeParcelas)
      // Data aproximada da compra: um mês antes da fatura da 1ª parcela.
      if (!dataCompra) dataCompra = `${deslocarMes(andamento.proximaFatura, -(entrada.quantidadeParcelas - restantes) - 1)}-01`
    }

    const compra = CompraCartao.criar({
      cartaoId: cartao.id,
      descricao: entrada.descricao,
      valorCentavos,
      quantidadeParcelas: entrada.quantidadeParcelas,
      taxaMensal,
      dataCompra: new Date(`${dataCompra}T00:00:00Z`),
      categoriaId: categoria.id,
      pessoaId: entrada.pessoaId ?? null,
      estabelecimento: entrada.estabelecimento ?? null,
      natureza: parcelamentoFatura ? 'parcelamento_fatura' : 'compra'
    })

    // Compra nova: todas as parcelas, a partir da fatura da compra. Em andamento: só as que faltam.
    const lancamentos = andamento
      ? Array.from({ length: Math.round(andamento.parcelasRestantes) }, (_, k) => ({
          valorCentavos: andamento.valorParcelaCentavos,
          mes: deslocarMes(andamento.proximaFatura, k),
          numero: compra.quantidadeParcelas - Math.round(andamento.parcelasRestantes) + k + 1
        }))
      : calcularParcelamento(compra.valorCentavos, compra.quantidadeParcelas, compra.taxaMensal).parcelas.map((valor, indice) => ({
          valorCentavos: valor,
          mes: deslocarMes(mesDaPrimeiraFatura(dataCompra, cartao.diaFechamento, cartao.diaVencimento), indice),
          numero: indice + 1
        }))

    const parcelas = lancamentos.map(({ valorCentavos: valor, mes, numero }) =>
      Transacao.criar({
        descricao: compra.descricao,
        valorCentavos: valor,
        tipo: 'despesa',
        data: new Date(`${dataDeVencimento(mes, cartao.diaVencimento)}T00:00:00Z`),
        pessoaId: compra.pessoaId,
        categoriaId: compra.categoriaId,
        estabelecimento: compra.estabelecimento,
        cartaoId: cartao.id,
        parcela: { compraId: compra.id, numero, total: compra.quantidadeParcelas }
      })
    )

    await this.compraRepositorio.salvar(compra, parcelas)
    return CartaoMapeador.compraParaDTO(compra, parcelas, hojeISO())
  }
}

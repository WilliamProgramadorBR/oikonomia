import type { CartaoDTO, CompraCartaoDTO } from '@compartilhado/dtos/cartao'
import type { Cartao } from '../../dominio/entidades/Cartao'
import type { CompraCartao } from '../../dominio/entidades/CompraCartao'
import type { TaxaMercado } from '../../dominio/entidades/TaxaMercado'
import type { Transacao } from '../../dominio/entidades/Transacao'

export interface TaxasDoBanco {
  parcelado: number | null
  rotativo: number | null
}

const dataISO = (data: Date) => data.toISOString().slice(0, 10)

// cnpj8 -> taxas de cartão daquela instituição
export function indexarTaxasDeCartao(taxas: TaxaMercado[]): Map<string, TaxasDoBanco> {
  const indice = new Map<string, TaxasDoBanco>()
  for (const taxa of taxas) {
    const atual = indice.get(taxa.cnpj8) ?? { parcelado: null, rotativo: null }
    if (taxa.modalidade === 'cartao_parcelado') atual.parcelado = taxa.taxaMensal
    if (taxa.modalidade === 'cartao_rotativo') atual.rotativo = taxa.taxaMensal
    indice.set(taxa.cnpj8, atual)
  }
  return indice
}

export const CartaoMapeador = {
  paraDTO(cartao: Cartao, taxas: Map<string, TaxasDoBanco>): CartaoDTO {
    const doBanco = cartao.cnpj8 ? taxas.get(cartao.cnpj8) : undefined
    return {
      id: cartao.id,
      apelido: cartao.apelido,
      instituicao: cartao.instituicao,
      cnpj8: cartao.cnpj8,
      limiteCentavos: cartao.limiteCentavos,
      diaFechamento: cartao.diaFechamento,
      diaVencimento: cartao.diaVencimento,
      pessoaId: cartao.pessoaId,
      cor: cartao.cor,
      taxaContratoMensal: cartao.taxaContratoMensal,
      taxaParceladoMercado: doBanco?.parcelado ?? null,
      taxaRotativoMercado: doBanco?.rotativo ?? null
    }
  },

  // `parcelas` são as transações geradas pela compra; `hoje` decide quais já venceram.
  compraParaDTO(compra: CompraCartao, parcelas: Transacao[], hoje: string): CompraCartaoDTO {
    const ordenadas = [...parcelas].sort(
      (a, b) => (a.parcela?.numero ?? 0) - (b.parcela?.numero ?? 0)
    )
    return {
      id: compra.id,
      cartaoId: compra.cartaoId,
      descricao: compra.descricao,
      valorCentavos: compra.valorCentavos,
      totalCentavos: ordenadas.reduce((soma, p) => soma + p.valorCentavos, 0),
      quantidadeParcelas: compra.quantidadeParcelas,
      valorParcelaCentavos: ordenadas[ordenadas.length - 1]?.valorCentavos ?? 0,
      taxaMensal: compra.taxaMensal,
      dataCompra: dataISO(compra.dataCompra),
      primeiraFatura: ordenadas[0] ? dataISO(ordenadas[0].data).slice(0, 7) : '',
      // Compras cadastradas já em andamento só têm as parcelas que faltavam.
      parcelasPagas: compra.quantidadeParcelas - ordenadas.length + ordenadas.filter((p) => dataISO(p.data) < hoje).length,
      categoriaId: compra.categoriaId,
      pessoaId: compra.pessoaId,
      estabelecimento: compra.estabelecimento,
      natureza: compra.natureza
    }
  }
}

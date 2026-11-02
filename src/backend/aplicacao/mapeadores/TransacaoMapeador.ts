import type { TransacaoDTO } from '@compartilhado/dtos/transacao'
import type { Transacao } from '../../dominio/entidades/Transacao'

export const TransacaoMapeador = {
  paraDTO(transacao: Transacao): TransacaoDTO {
    return {
      id: transacao.id,
      descricao: transacao.descricao,
      valorCentavos: transacao.valorCentavos,
      tipo: transacao.tipo,
      status: transacao.status,
      data: transacao.data.toISOString().slice(0, 10),
      pessoaId: transacao.pessoaId,
      categoriaId: transacao.categoriaId,
      estabelecimento: transacao.estabelecimento,
      cartaoId: transacao.cartaoId,
      parcela: transacao.parcela
        ? { numero: transacao.parcela.numero, total: transacao.parcela.total }
        : null,
      recorrenciaId: transacao.recorrencia?.recorrenciaId ?? null,
      objetivoId: transacao.objetivoId,
      criadoEm: transacao.criadoEm.toISOString()
    }
  }
}

import { deslocarMes, mesAtual } from '@compartilhado/utilitarios/mes'
import { Transacao } from '../../../dominio/entidades/Transacao'
import type { ICartaoRepositorio } from '../../../dominio/repositorios/ICartaoRepositorio'
import type { IRecorrenciaRepositorio } from '../../../dominio/repositorios/IRecorrenciaRepositorio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'
import { dataDaOcorrencia, estimativaDa } from '../../servicos/ocorrencias'

// Quantos meses à frente (contando o atual) mantemos lançamentos previstos.
export const HORIZONTE_MESES = 12

const dataUTC = (iso: string) => new Date(`${iso}T00:00:00Z`)

// Garante um lançamento previsto por recorrência em cada mês do horizonte e atualiza a
// estimativa dos que ainda não foram confirmados. Idempotente: pode rodar quantas vezes quiser.
export class SincronizarRecorrencias {
  constructor(
    private readonly recorrenciaRepositorio: IRecorrenciaRepositorio,
    private readonly transacaoRepositorio: ITransacaoRepositorio,
    private readonly cartaoRepositorio: ICartaoRepositorio
  ) {}

  async executar(): Promise<void> {
    const atual = mesAtual()
    const meses = Array.from({ length: HORIZONTE_MESES }, (_, k) => deslocarMes(atual, k))
    const [recorrencias, cartoes] = await Promise.all([
      this.recorrenciaRepositorio.listar(),
      this.cartaoRepositorio.listar()
    ])
    const cartaoPorId = new Map(cartoes.map((c) => [c.id, c]))

    for (const recorrencia of recorrencias) {
      const ocorrencias = await this.transacaoRepositorio.listar({
        recorrenciaId: recorrencia.id,
        incluirIgnoradas: true
      })
      const porCompetencia = new Map(ocorrencias.map((t) => [t.recorrencia!.competencia, t]))
      const valor = estimativaDa(recorrencia, ocorrencias)
      const cartao = recorrencia.cartaoId ? (cartaoPorId.get(recorrencia.cartaoId) ?? null) : null

      for (const mes of meses) {
        if (!recorrencia.ocorreEm(mes)) continue
        const data = dataUTC(dataDaOcorrencia(recorrencia, mes, cartao))
        const existente = porCompetencia.get(mes)

        if (existente) {
          const mudou =
            existente.valorCentavos !== valor || existente.data.getTime() !== data.getTime()
          const trocouConta = existente.status === 'prevista' && !cartao && existente.contaId !== recorrencia.contaId
          if (existente.status === 'prevista' && (mudou || trocouConta)) {
            existente.reestimar(valor, data)
            if (trocouConta) existente.vincularConta(recorrencia.contaId)
            await this.transacaoRepositorio.salvar(existente)
          }
          continue
        }

        await this.transacaoRepositorio.salvar(
          Transacao.criar({
            descricao: recorrencia.descricao,
            valorCentavos: valor,
            tipo: recorrencia.tipo,
            status: 'prevista',
            data,
            pessoaId: recorrencia.pessoaId,
            categoriaId: recorrencia.categoriaId,
            cartaoId: cartao?.id ?? null,
            contaId: cartao ? null : recorrencia.contaId,
            objetivoId: recorrencia.objetivoId,
            recorrencia: { recorrenciaId: recorrencia.id, competencia: mes }
          })
        )
      }
    }
  }
}

import type { ConfirmarTransacaoEntrada, TransacaoDTO } from '@compartilhado/dtos/transacao'
import { ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'
import { TransacaoMapeador } from '../../mapeadores/TransacaoMapeador'
import type { SincronizarRecorrencias } from '../recorrencia/SincronizarRecorrencias'

// A conta chegou: grava o valor real. Para contas variáveis, isso refina as próximas estimativas.
export class ConfirmarTransacao {
  constructor(
    private readonly repositorio: ITransacaoRepositorio,
    private readonly sincronizar: SincronizarRecorrencias
  ) {}

  async executar({ id, valorCentavos, data, contaId }: ConfirmarTransacaoEntrada): Promise<TransacaoDTO> {
    const transacao = await this.repositorio.buscarPorId(id)
    if (!transacao) throw new ErroNaoEncontrado('Lançamento', id)

    transacao.confirmar(valorCentavos, new Date(`${data}T00:00:00Z`))
    if (contaId !== undefined && !transacao.cartaoId) transacao.vincularConta(contaId)
    await this.repositorio.salvar(transacao)
    if (transacao.recorrencia) await this.sincronizar.executar()

    return TransacaoMapeador.paraDTO(transacao)
  }
}

import type { RecorrenciaDTO } from '@compartilhado/dtos/recorrencia'
import { hojeISO } from '@compartilhado/utilitarios/mes'
import type { Recorrencia } from '../../../dominio/entidades/Recorrencia'
import type { IRecorrenciaRepositorio } from '../../../dominio/repositorios/IRecorrenciaRepositorio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'
import { estimativaDa, valoresConfirmados } from '../../servicos/ocorrencias'

const dataISO = (data: Date) => data.toISOString().slice(0, 10)

export class ListarRecorrencias {
  constructor(
    private readonly recorrenciaRepositorio: IRecorrenciaRepositorio,
    private readonly transacaoRepositorio: ITransacaoRepositorio
  ) {}

  async executar(): Promise<RecorrenciaDTO[]> {
    const recorrencias = await this.recorrenciaRepositorio.listar()
    return Promise.all(recorrencias.map((r) => this.paraDTO(r)))
  }

  async buscar(id: string): Promise<RecorrenciaDTO | null> {
    const recorrencia = await this.recorrenciaRepositorio.buscarPorId(id)
    return recorrencia ? this.paraDTO(recorrencia) : null
  }

  private async paraDTO(r: Recorrencia): Promise<RecorrenciaDTO> {
    const hoje = hojeISO()
    const ocorrencias = await this.transacaoRepositorio.listar({ recorrenciaId: r.id })
    const proxima = ocorrencias
      .filter((t) => dataISO(t.data) >= hoje)
      .sort((a, b) => a.data.getTime() - b.data.getTime())[0]

    return {
      id: r.id,
      descricao: r.descricao,
      tipo: r.tipo,
      valorVariavel: r.valorVariavel,
      valorCentavos: r.valorCentavos,
      estimativaCentavos: estimativaDa(r, ocorrencias),
      diaDoMes: r.diaDoMes,
      categoriaId: r.categoriaId,
      pessoaId: r.pessoaId,
      cartaoId: r.cartaoId,
      contaId: r.contaId,
      inicio: r.inicio,
      fim: r.fim,
      objetivoId: r.objetivoId,
      historicoCentavos: valoresConfirmados(ocorrencias).slice(0, 6),
      proxima: proxima
        ? {
            data: dataISO(proxima.data),
            valorCentavos: proxima.valorCentavos,
            status: proxima.status === 'confirmada' ? 'confirmada' : 'prevista'
          }
        : null
    }
  }
}

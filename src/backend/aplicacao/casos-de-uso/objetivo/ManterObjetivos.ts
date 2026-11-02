import type {
  AportarObjetivoEntrada,
  AtualizarObjetivoEntrada,
  CriarObjetivoEntrada,
  ProgramarAporteEntrada
} from '@compartilhado/dtos/objetivo'
import { deslocarMes, mesAtual } from '@compartilhado/utilitarios/mes'
import { Objetivo } from '../../../dominio/entidades/Objetivo'
import { Transacao } from '../../../dominio/entidades/Transacao'
import { ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { IObjetivoRepositorio } from '../../../dominio/repositorios/IObjetivoRepositorio'
import type { IRecorrenciaRepositorio } from '../../../dominio/repositorios/IRecorrenciaRepositorio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'
import type { CriarRecorrencia } from '../recorrencia/CriarRecorrencia'
import type { EncerrarRecorrencia } from '../recorrencia/EncerrarRecorrencia'

// Aportes para reserva vão para a categoria de reserva; os demais, para "Objetivos".
const categoriaDoAporte = (objetivo: Objetivo) =>
  objetivo.tipo === 'reserva' ? 'cat-reserva' : 'cat-objetivos'

export class CriarObjetivo {
  constructor(private readonly repositorio: IObjetivoRepositorio) {}

  async executar(entrada: CriarObjetivoEntrada): Promise<void> {
    await this.repositorio.salvar(Objetivo.criar(entrada))
  }
}

export class AtualizarObjetivo {
  constructor(private readonly repositorio: IObjetivoRepositorio) {}

  async executar({ id, ...ajustes }: AtualizarObjetivoEntrada): Promise<void> {
    const objetivo = await this.repositorio.buscarPorId(id)
    if (!objetivo) throw new ErroNaoEncontrado('Objetivo', id)
    objetivo.ajustar(ajustes)
    await this.repositorio.salvar(objetivo)
  }
}

export class RemoverObjetivo {
  constructor(private readonly repositorio: IObjetivoRepositorio) {}

  async executar(id: string): Promise<void> {
    if (!(await this.repositorio.buscarPorId(id))) throw new ErroNaoEncontrado('Objetivo', id)
    await this.repositorio.remover(id)
  }
}

// Guardar um valor agora para o objetivo (lançamento "guardado" já confirmado).
export class AportarObjetivo {
  constructor(
    private readonly objetivoRepositorio: IObjetivoRepositorio,
    private readonly transacaoRepositorio: ITransacaoRepositorio
  ) {}

  async executar({ objetivoId, valorCentavos, data, pessoaId }: AportarObjetivoEntrada): Promise<void> {
    const objetivo = await this.objetivoRepositorio.buscarPorId(objetivoId)
    if (!objetivo) throw new ErroNaoEncontrado('Objetivo', objetivoId)

    await this.transacaoRepositorio.salvar(
      Transacao.criar({
        descricao: `Aporte: ${objetivo.nome}`,
        valorCentavos,
        tipo: 'guardado',
        data: new Date(`${data}T00:00:00Z`),
        pessoaId,
        categoriaId: categoriaDoAporte(objetivo),
        objetivoId
      })
    )
  }
}

// Programa (ou reprograma) o aporte mensal do objetivo como conta recorrente de "guardar".
export class ProgramarAporte {
  constructor(
    private readonly objetivoRepositorio: IObjetivoRepositorio,
    private readonly recorrenciaRepositorio: IRecorrenciaRepositorio,
    private readonly criarRecorrencia: CriarRecorrencia,
    private readonly encerrarRecorrencia: EncerrarRecorrencia
  ) {}

  async executar({ objetivoId, valorCentavos, diaDoMes, pessoaId }: ProgramarAporteEntrada): Promise<void> {
    const objetivo = await this.objetivoRepositorio.buscarPorId(objetivoId)
    if (!objetivo) throw new ErroNaoEncontrado('Objetivo', objetivoId)

    const atual = mesAtual()
    const existentes = (await this.recorrenciaRepositorio.listar()).filter(
      (r) => r.objetivoId === objetivoId && r.ocorreEm(atual)
    )
    // Havendo aporte programado, o novo valor vale a partir do mês seguinte (o deste mês fica).
    const inicio = existentes.length > 0 ? deslocarMes(atual, 1) : atual
    for (const r of existentes) await this.encerrarRecorrencia.executar({ id: r.id, aPartirDe: inicio })

    await this.criarRecorrencia.executar({
      descricao: `Aporte: ${objetivo.nome}`,
      tipo: 'guardado',
      valorVariavel: false,
      valorCentavos,
      diaDoMes,
      categoriaId: categoriaDoAporte(objetivo),
      pessoaId,
      cartaoId: null,
      inicio,
      objetivoId
    })
  }
}

import type {
  AjustarPrevistaEntrada,
  AplicarFeriasEntrada,
  FeriasEntrada,
  PlanoFeriasDTO,
  ResultadoAjusteDTO
} from '@compartilhado/dtos/ajustes'
import type { TransacaoDTO } from '@compartilhado/dtos/transacao'
import { hojeISO } from '@compartilhado/utilitarios/mes'
import { Transacao } from '../../../dominio/entidades/Transacao'
import { ErroDominio, ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { IRecorrenciaRepositorio } from '../../../dominio/repositorios/IRecorrenciaRepositorio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'
import { planejarFerias } from '../../../dominio/servicos/FeriasClt'
import { TransacaoMapeador } from '../../mapeadores/TransacaoMapeador'
import { moeda, nomeMes } from '../../servicos/formatacao'
import { estimativaDa } from '../../servicos/ocorrencias'

const MOTIVO_FERIAS = 'Férias'

// Um mês fora do normal, já conhecido antes de acontecer: valor diferente ou nenhum (0).
export class AjustarPrevista {
  constructor(private readonly transacaoRepositorio: ITransacaoRepositorio) {}

  async executar({ id, valorCentavos, motivo }: AjustarPrevistaEntrada): Promise<TransacaoDTO> {
    const transacao = await this.transacaoRepositorio.buscarPorId(id)
    if (!transacao) throw new ErroNaoEncontrado('Lançamento', id)
    if (!transacao.recorrencia) throw new ErroDominio('Só ocorrências de contas recorrentes podem ser ajustadas.')
    if (!motivo.trim()) throw new ErroDominio('Informe o motivo do ajuste.')

    if (valorCentavos === 0) transacao.ignorar(motivo)
    else transacao.ajustarPrevisao(valorCentavos, motivo)
    await this.transacaoRepositorio.salvar(transacao)
    return TransacaoMapeador.paraDTO(transacao)
  }
}

export class SimularFerias {
  constructor(
    private readonly recorrenciaRepositorio: IRecorrenciaRepositorio,
    private readonly transacaoRepositorio: ITransacaoRepositorio
  ) {}

  async executar(e: FeriasEntrada): Promise<PlanoFeriasDTO> {
    const recorrencia = await this.recorrenciaRepositorio.buscarPorId(e.recorrenciaId)
    if (!recorrencia) throw new ErroNaoEncontrado('Conta recorrente', e.recorrenciaId)
    if (recorrencia.tipo !== 'receita') throw new ErroDominio('Escolha a conta recorrente do salário (uma receita).')

    const ocorrencias = await this.transacaoRepositorio.listar({ recorrenciaId: recorrencia.id, incluirIgnoradas: true })
    const salario = estimativaDa(recorrencia, ocorrencias)
    const plano = planejarFerias({
      salarioMensalCentavos: salario,
      inicio: e.inicio,
      diasDescanso: e.diasDescanso,
      venderDias: e.venderDias,
      diaPagamento: recorrencia.diaDoMes,
      pagamentoNoMesSeguinte: e.pagamentoNoMesSeguinte
    })
    const porCompetencia = new Map(ocorrencias.map((t) => [t.recorrencia!.competencia, t]))

    const holerites = plano.holerites.map((h) => {
      const ocorrencia = porCompetencia.get(h.mesPagamento)
      return {
        ...h,
        data: ocorrencia ? ocorrencia.data.toISOString().slice(0, 10) : null,
        valorNormalCentavos: salario,
        valorComFeriasCentavos: h.valorCentavos,
        situacao: !ocorrencia
          ? ('sem_ocorrencia' as const)
          : ocorrencia.status === 'confirmada'
            ? ('ja_confirmado' as const)
            : ('ajustar' as const)
      }
    })
    const reservar = holerites.reduce((s, h) => s + (h.valorNormalCentavos - h.valorComFeriasCentavos), 0)
    const magro = holerites.find((h) => h.valorComFeriasCentavos < h.valorNormalCentavos)

    return {
      salarioCentavos: salario,
      descricaoSalario: recorrencia.descricao,
      inicio: plano.inicio,
      fim: plano.fim,
      retorno: plano.retorno,
      dataAdiantamento: plano.dataAdiantamento,
      valorFeriasCentavos: plano.valorFeriasCentavos,
      valorAbonoCentavos: plano.valorAbonoCentavos,
      adiantamentoCentavos: plano.adiantamentoCentavos,
      holerites,
      reservarDoAdiantamentoCentavos: reservar,
      explicacao: magro
        ? `O pagamento das férias (${moeda(plano.adiantamentoCentavos)}) chega antes de começar, e o salário de ${nomeMes(magro.mesPagamento)} vem com ${moeda(magro.valorComFeriasCentavos)}. Guarde ${moeda(reservar)} do adiantamento para atravessar esse mês sem aperto.`
        : `O pagamento das férias (${moeda(plano.adiantamentoCentavos)}) chega antes de começar; os salários seguintes não mudam.`
    }
  }
}

export class AplicarFerias {
  constructor(
    private readonly simular: SimularFerias,
    private readonly recorrenciaRepositorio: IRecorrenciaRepositorio,
    private readonly transacaoRepositorio: ITransacaoRepositorio
  ) {}

  async executar(e: AplicarFeriasEntrada): Promise<ResultadoAjusteDTO> {
    const plano = await this.simular.executar(e)
    const recorrencia = (await this.recorrenciaRepositorio.buscarPorId(e.recorrenciaId))!
    const ocorrencias = await this.transacaoRepositorio.listar({ recorrenciaId: recorrencia.id, incluirIgnoradas: true })
    const porCompetencia = new Map(ocorrencias.map((t) => [t.recorrencia!.competencia, t]))
    const partes: string[] = []

    for (const h of plano.holerites) {
      const ocorrencia = porCompetencia.get(h.mesPagamento)
      if (!ocorrencia || h.situacao !== 'ajustar') continue
      if (h.valorComFeriasCentavos === 0) ocorrencia.ignorar(MOTIVO_FERIAS)
      else ocorrencia.ajustarPrevisao(h.valorComFeriasCentavos, MOTIVO_FERIAS)
      await this.transacaoRepositorio.salvar(ocorrencia)
      partes.push(`salário de ${nomeMes(h.mesPagamento)}: ${moeda(h.valorComFeriasCentavos)}`)
    }

    if (!e.adiantamentoJaLancado) {
      const futuro = plano.dataAdiantamento > hojeISO()
      await this.transacaoRepositorio.salvar(
        Transacao.criar({
          descricao: plano.valorAbonoCentavos > 0 ? 'Férias + 1/3 e abono' : 'Férias + 1/3',
          valorCentavos: plano.adiantamentoCentavos,
          tipo: 'receita',
          status: futuro ? 'prevista' : 'confirmada',
          data: new Date(`${plano.dataAdiantamento}T00:00:00Z`),
          pessoaId: recorrencia.pessoaId,
          categoriaId: recorrencia.categoriaId,
          ajuste: MOTIVO_FERIAS
        })
      )
      partes.unshift(`pagamento das férias de ${moeda(plano.adiantamentoCentavos)} ${futuro ? 'previsto para' : 'lançado em'} ${plano.dataAdiantamento.split('-').reverse().join('/')}`)
    }

    if (partes.length === 0) return { mensagem: 'Nada a ajustar: esses salários já foram confirmados.' }
    return { mensagem: `Férias registradas: ${partes.join('; ')}.` }
  }
}

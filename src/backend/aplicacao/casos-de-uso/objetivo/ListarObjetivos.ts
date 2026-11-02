import type { ObjetivoDTO, ObjetivosDTO } from '@compartilhado/dtos/objetivo'
import { deslocarMes, hojeISO, intervaloDoMes, mesAtual } from '@compartilhado/utilitarios/mes'
import { PERFIL_PADRAO, parametrosDoPerfil } from '../../../dominio/entidades/PerfilFinanceiro'
import type { Transacao } from '../../../dominio/entidades/Transacao'
import type { ICategoriaRepositorio } from '../../../dominio/repositorios/ICategoriaRepositorio'
import type { ICompraCartaoRepositorio } from '../../../dominio/repositorios/ICompraCartaoRepositorio'
import type { IObjetivoRepositorio } from '../../../dominio/repositorios/IObjetivoRepositorio'
import type { IPerfilRepositorio } from '../../../dominio/repositorios/IPerfilRepositorio'
import type { IRecorrenciaRepositorio } from '../../../dominio/repositorios/IRecorrenciaRepositorio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'
import { planejarObjetivo, simularObjetivos } from '../../../dominio/servicos/PlanejadorObjetivos'
import { passosDoPlano } from '../../servicos/NarradorObjetivos'
import { perfilParaDTO } from '../perfil/Perfil'
import type { ObterPrevisao } from '../previsao/ObterPrevisao'

const CORTE_SUGERIDO = 0.2 // reduzir 20% das maiores categorias de estilo de vida
const MESES_DE_HISTORICO = 3

const soma = (lista: Transacao[]) => lista.reduce((total, t) => total + t.valorCentavos, 0)
const media = (valores: number[]) => (valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : 0)
const mesesEntre = (de: string, ate: string) =>
  (Number(ate.slice(0, 4)) - Number(de.slice(0, 4))) * 12 + Number(ate.slice(5, 7)) - Number(de.slice(5, 7))

// Lista os objetivos com um plano realista para cada um. A folga mensal (média da previsão dos
// próximos meses, menos a margem de segurança) é distribuída em cascata, por prioridade.
export class ListarObjetivos {
  constructor(
    private readonly objetivoRepositorio: IObjetivoRepositorio,
    private readonly transacaoRepositorio: ITransacaoRepositorio,
    private readonly recorrenciaRepositorio: IRecorrenciaRepositorio,
    private readonly categoriaRepositorio: ICategoriaRepositorio,
    private readonly compraRepositorio: ICompraCartaoRepositorio,
    private readonly perfilRepositorio: IPerfilRepositorio,
    private readonly obterPrevisao: ObterPrevisao
  ) {}

  async executar(): Promise<ObjetivosDTO> {
    const atual = mesAtual()
    const proximo = deslocarMes(atual, 1)
    const hoje = hojeISO()
    const historicoInicio = deslocarMes(atual, -MESES_DE_HISTORICO)

    const [objetivos, aportes, recorrencias, perfilSalvo, previsao, compras, cobrancasFuturas, historico, categorias, ateHoje] =
      await Promise.all([
        this.objetivoRepositorio.listar(),
        this.transacaoRepositorio.listar({ somenteObjetivos: true }),
        this.recorrenciaRepositorio.listar(),
        this.perfilRepositorio.obter(),
        this.obterPrevisao.executar({ pessoaId: null, mesInicial: proximo }),
        this.compraRepositorio.listar(),
        this.transacaoRepositorio.listar({ somenteCartao: true, inicio: hoje }),
        this.transacaoRepositorio.listar({
          inicio: intervaloDoMes(historicoInicio).inicio,
          fim: intervaloDoMes(deslocarMes(atual, -1)).fim
        }),
        this.categoriaRepositorio.listar(),
        this.transacaoRepositorio.listar({ fim: hoje })
      ])

    const perfil = perfilSalvo ?? PERFIL_PADRAO
    const parametros = parametrosDoPerfil(perfil)
    const rendimento = perfil.rendimentoMensal / 100

    // ===== Folga mensal para objetivos =====
    // A previsão já desconta aportes programados (inclusive os de objetivos): a folga é para aportes novos.
    const meses = previsao.meses
    const rendaMedia = media(meses.map((m) => m.receitas))
    const capacidadeMensal = Math.max(
      0,
      Math.round(media(meses.map((m) => m.saldoProjetado)) - rendaMedia * parametros.margemSeguranca)
    )
    const custoVida = media(
      meses.map(
        (m) => m.contasRecorrentes + m.parcelasCartao + m.parcelasDividas + m.avulsasLancadas + m.reservaImprevistos
      )
    )

    // ===== O que cada objetivo já tem e quanto está programado =====
    const aportadoPor = new Map<string, number>()
    for (const t of aportes) {
      if (t.status !== 'confirmada' || !t.objetivoId) continue
      aportadoPor.set(t.objetivoId, (aportadoPor.get(t.objetivoId) ?? 0) + t.valorCentavos)
    }
    const programadoPor = new Map<string, number>()
    for (const r of recorrencias) {
      if (!r.objetivoId || !r.ocorreEm(proximo)) continue
      programadoPor.set(r.objetivoId, (programadoPor.get(r.objetivoId) ?? 0) + r.valorCentavos)
    }

    // ===== Reserva mínima, dívida cara e cortes possíveis =====
    const totalGuardado = soma(ateHoje.filter((t) => t.tipo === 'guardado' && t.status === 'confirmada'))
    const reservaMeses = custoVida > 0 ? totalGuardado / custoVida : 0
    const temObjetivoReserva = objetivos.some((o) => o.tipo === 'reserva')
    const reservaMinimaPendente =
      perfil.estilo !== 'arrojado' && !temObjetivoReserva && reservaMeses < Math.min(3, parametros.metaReservaMeses)

    const comprasComJuros = new Map(compras.filter((c) => c.taxaMensal > 0).map((c) => [c.id, c]))
    const parcelasCaras = cobrancasFuturas.filter((t) => t.parcela && comprasComJuros.has(t.parcela.compraId))
    const dividaCara = parcelasCaras.length
      ? {
          saldo: soma(parcelasCaras),
          taxaMensal: Math.max(...parcelasCaras.map((t) => comprasComJuros.get(t.parcela!.compraId)!.taxaMensal)) / 100
        }
      : null

    const estiloVida = new Map(categorias.filter((c) => c.natureza === 'estilo_vida').map((c) => [c.id, c.nome]))
    const porCategoria = new Map<string, number>()
    for (const t of historico) {
      if (t.status !== 'confirmada' || t.tipo !== 'despesa' || !estiloVida.has(t.categoriaId)) continue
      porCategoria.set(t.categoriaId, (porCategoria.get(t.categoriaId) ?? 0) + t.valorCentavos)
    }
    const cortesPossiveis = [...porCategoria]
      .map(([id, total]) => ({
        nome: estiloVida.get(id)!,
        valorMensal: Math.round((total / MESES_DE_HISTORICO) * CORTE_SUGERIDO)
      }))
      .filter((c) => c.valorMensal > 0)
      .sort((a, b) => b.valorMensal - a.valorMensal)
      .slice(0, 3)

    // ===== Planos, do mais prioritário ao menos =====
    const ordenados = [...objetivos].sort(
      (a, b) => a.prioridade - b.prioridade || a.dataAlvo.localeCompare(b.dataAlvo)
    )
    const simulaveis = ordenados.map((o) => ({
      id: o.id,
      valorAlvo: o.valorAlvoCentavos,
      valorAtual: o.valorInicialCentavos + (aportadoPor.get(o.id) ?? 0),
      aporteProgramado: programadoPor.get(o.id) ?? 0,
      rendimentoMensal: o.tipo === 'quitar_divida' ? 0 : rendimento, // quitar dívida não "rende"
      prazoMeses: Math.max(1, mesesEntre(atual, o.dataAlvo))
    }))
    const simulacao = simularObjetivos(simulaveis, capacidadeMensal)
    const lista: ObjetivoDTO[] = []

    ordenados.forEach((objetivo, indice) => {
      const s = simulaveis[indice]
      const sim = simulacao.get(objetivo.id)!

      // Métricas do objetivo isolado (aporte necessário, cortes, dívida); prazo e projeção vêm da cascata.
      const base = planejarObjetivo({
        valorAlvo: s.valorAlvo,
        valorAtual: s.valorAtual,
        mesesAtePrazo: s.prazoMeses,
        aporteProgramado: s.aporteProgramado,
        capacidadeDisponivel: Math.max(0, sim.aporteInicial - s.aporteProgramado),
        rendimentoMensal: s.rendimentoMensal,
        cortesPossiveis,
        dividaCara: objetivo.tipo === 'quitar_divida' ? null : dividaCara,
        quitarAntes: perfil.prioridade !== 'guardar_primeiro',
        reservaMinimaPendente: objetivo.tipo !== 'reserva' && reservaMinimaPendente
      })
      const noPrazo = sim.conclusao !== null && sim.conclusao <= s.prazoMeses
      const viabilidade =
        base.viabilidade === 'concluido'
          ? 'concluido'
          : noPrazo
            ? s.aporteProgramado >= base.aporteNecessario
              ? 'no_caminho'
              : 'viavel'
            : base.viabilidade === 'apertado'
              ? 'apertado'
              : sim.aporteInicial === 0
                ? sim.conclusao !== null
                  ? 'aguardando'
                  : 'sem_capacidade'
                : 'inviavel_no_prazo'
      const plano = {
        ...base,
        viabilidade,
        aporteSugerido: viabilidade === 'apertado' ? base.aporteSugerido : sim.aporteInicial,
        prazoRealistaMeses: sim.conclusao,
        valorPossivelNoPrazo: sim.serie[s.prazoMeses] ?? base.valorPossivelNoPrazo,
        // Cada gráfico vai até um pouco depois do próprio prazo ou da conclusão (o que vier depois).
        projecao: sim.serie.slice(0, Math.max(s.prazoMeses, sim.conclusao ?? s.prazoMeses) + 4)
      } as const
      // Quem "segura" a folga: entre os mais prioritários em andamento, o último a terminar.
      const bloqueador = ordenados
        .slice(0, indice)
        .filter((o) => (simulacao.get(o.id)!.conclusao ?? Infinity) > 0)
        .sort(
          (a, b) =>
            (simulacao.get(b.id)!.conclusao ?? Infinity) - (simulacao.get(a.id)!.conclusao ?? Infinity)
        )[0]
      const inicioAportes = sim.inicioAportes !== null ? deslocarMes(atual, sim.inicioAportes) : null

      lista.push({
        id: objetivo.id,
        nome: objetivo.nome,
        tipo: objetivo.tipo,
        valorAlvoCentavos: objetivo.valorAlvoCentavos,
        valorAtualCentavos: s.valorAtual,
        progresso: Math.min(1, s.valorAtual / objetivo.valorAlvoCentavos),
        dataAlvo: objetivo.dataAlvo,
        prioridade: objetivo.prioridade,
        pessoaId: objetivo.pessoaId,
        aporteProgramadoCentavos: s.aporteProgramado,
        plano: {
          viabilidade: plano.viabilidade,
          aporteNecessario: plano.aporteNecessario,
          aporteSugerido: plano.aporteSugerido,
          prazoRealista: plano.prazoRealistaMeses !== null ? deslocarMes(atual, plano.prazoRealistaMeses) : null,
          inicioAportes,
          valorPossivelNoPrazo: plano.valorPossivelNoPrazo,
          passos: passosDoPlano(objetivo, plano, atual, s.aporteProgramado, {
            inicioAportes,
            bloqueador: bloqueador?.nome ?? null
          }),
          projecao: plano.projecao.map((valor, k) => ({ mes: deslocarMes(atual, k), valor }))
        }
      })
    })

    return {
      perfil: perfilParaDTO(perfilSalvo),
      capacidadeMensal,
      aportesProgramados: [...programadoPor.values()].reduce((s, v) => s + v, 0),
      sugestaoReserva: Math.round(custoVida * parametros.metaReservaMeses),
      objetivos: lista
    }
  }
}

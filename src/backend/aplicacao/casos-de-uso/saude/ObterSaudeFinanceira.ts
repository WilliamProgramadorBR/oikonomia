import type { SaudeFinanceiraDTO } from '@compartilhado/dtos/saude'
import { deslocarMes, hojeISO, intervaloDoMes, mesAtual } from '@compartilhado/utilitarios/mes'
import type { Transacao } from '../../../dominio/entidades/Transacao'
import type { ICategoriaRepositorio } from '../../../dominio/repositorios/ICategoriaRepositorio'
import type { IPessoaRepositorio } from '../../../dominio/repositorios/IPessoaRepositorio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'
import { PERFIL_PADRAO, parametrosDoPerfil } from '../../../dominio/entidades/PerfilFinanceiro'
import type { IPerfilRepositorio } from '../../../dominio/repositorios/IPerfilRepositorio'
import { avaliarSaude } from '../../../dominio/servicos/AvaliadorSaudeFinanceira'
import type { INarradorFinanceiro } from '../../portas/INarradorFinanceiro'
import type { ObterResumoCartoes } from '../cartao/ObterResumoCartoes'
import type { ObterPrevisao } from '../previsao/ObterPrevisao'

const MESES_DE_HISTORICO = 3

const soma = (lista: Transacao[]) => lista.reduce((total, t) => total + t.valorCentavos, 0)
const mesDe = (t: Transacao) => t.data.toISOString().slice(0, 7)

// Avalia o PRÓXIMO mês ("quanto crédito posso usar no mês que vem"), com base na previsão,
// no histórico recente e nos cartões.
export class ObterSaudeFinanceira {
  constructor(
    private readonly transacaoRepositorio: ITransacaoRepositorio,
    private readonly categoriaRepositorio: ICategoriaRepositorio,
    private readonly pessoaRepositorio: IPessoaRepositorio,
    private readonly obterPrevisao: ObterPrevisao,
    private readonly obterResumoCartoes: ObterResumoCartoes,
    private readonly perfilRepositorio: IPerfilRepositorio,
    private readonly narrador: INarradorFinanceiro
  ) {}

  async executar(pessoaId: string | null): Promise<SaudeFinanceiraDTO> {
    const atual = mesAtual()
    const proximo = deslocarMes(atual, 1)
    const historicoMeses = Array.from({ length: MESES_DE_HISTORICO }, (_, k) =>
      deslocarMes(atual, k - MESES_DE_HISTORICO)
    )
    const filtroPessoa = pessoaId ?? undefined

    const [previsao, historico, ateHoje, doProximo, cartoes, categorias, pessoa] = await Promise.all([
      this.obterPrevisao.executar({ pessoaId, mesInicial: atual }),
      this.transacaoRepositorio.listar({
        pessoaId: filtroPessoa,
        inicio: intervaloDoMes(historicoMeses[0]).inicio,
        fim: intervaloDoMes(historicoMeses[historicoMeses.length - 1]).fim
      }),
      this.transacaoRepositorio.listar({ pessoaId: filtroPessoa, fim: hojeISO() }),
      this.transacaoRepositorio.listar({ pessoaId: filtroPessoa, ...intervaloDoMes(proximo) }),
      this.obterResumoCartoes.executar({ pessoaId, mes: proximo }),
      this.categoriaRepositorio.listar(),
      pessoaId ? this.pessoaRepositorio.buscarPorId(pessoaId) : Promise.resolve(null)
    ])

    const confirmadasHistorico = historico.filter((t) => t.status === 'confirmada')
    const mesesComDados = new Set(confirmadasHistorico.map(mesDe)).size || 1
    const mesProximo = previsao.meses[1]

    // Renda: a prevista para o próximo mês (recorrências); sem ela, a média recente.
    const rendaHistorica = Math.round(
      soma(confirmadasHistorico.filter((t) => t.tipo === 'receita')) / mesesComDados
    )
    const renda = mesProximo.receitas > 0 ? mesProximo.receitas : rendaHistorica
    if (renda <= 0) {
      return {
        dadosSuficientes: false,
        motivo:
          'Para avaliar a saúde financeira, cadastre as receitas (o salário, de preferência como conta recorrente) e alguns gastos.'
      }
    }

    const categoriasJuros = new Set(categorias.filter((c) => c.natureza === 'juros').map((c) => c.id))
    const jurosMensais = Math.round(
      soma(confirmadasHistorico.filter((t) => categoriasJuros.has(t.categoriaId))) / mesesComDados
    )
    const totalGuardado = soma(ateHoje.filter((t) => t.tipo === 'guardado' && t.status === 'confirmada'))

    const limiteTotal = cartoes.reduce((total, r) => total + r.cartao.limiteCentavos, 0)
    const limiteUsado = cartoes.reduce((total, r) => total + r.limiteUsadoCentavos, 0)
    const limiteDisponivel = cartoes.reduce((total, r) => total + Math.max(0, r.limiteDisponivelCentavos), 0)

    const entrada = {
      renda,
      contasRecorrentes: mesProximo.contasRecorrentes,
      parcelas: mesProximo.parcelasCartao + mesProximo.parcelasDividas,
      imprevistos: mesProximo.avulsasLancadas + mesProximo.reservaImprevistos,
      guardadoPrevisto: mesProximo.guardado,
      // Mesmos gastos da previsão, mas sobre a renda de referência (pode ser a média histórica).
      saldoProjetado: renda - (mesProximo.receitas - mesProximo.saldoProjetado),
      totalGuardado,
      jurosMensais,
      usoLimiteCartoes: limiteTotal > 0 ? limiteUsado / limiteTotal : null,
      limiteDisponivelCartoes: limiteTotal > 0 ? limiteDisponivel : null,
      mesesNoVermelho: previsao.meses.filter((m) => m.saldoProjetado < 0).length
    }
    const parametros = parametrosDoPerfil((await this.perfilRepositorio.obter()) ?? PERFIL_PADRAO)
    const avaliacao = avaliarSaude(entrada, parametros)

    // Primeiro mês, depois do próximo, em que as parcelas voltam a um nível confortável.
    const alivio = previsao.meses
      .slice(2)
      .find((m) => m.parcelasCartao + m.parcelasDividas <= renda * parametros.parcelasConfortaveis)

    const narrativa = await this.narrador.narrar({
      sujeito: pessoa ? `de ${pessoa.nome.split(' ')[0]}` : 'da família',
      mesReferencia: proximo,
      avaliacao,
      entrada,
      mesesNegativos: previsao.meses
        .filter((m) => m.saldoProjetado < 0)
        .map((m) => ({ mes: m.mes, saldo: m.saldoProjetado })),
      recorrentesNoCartao: soma(
        doProximo.filter((t) => t.tipo === 'despesa' && t.recorrencia && t.cartaoId)
      ),
      mediaImprevistos: previsao.mediaImprevistosMensal,
      alivioParcelas: alivio ? { mes: alivio.mes, parcelas: alivio.parcelasCartao + alivio.parcelasDividas } : null
    })

    return {
      dadosSuficientes: true,
      mesReferencia: proximo,
      nota: avaliacao.nota,
      classificacao: avaliacao.classificacao,
      resumo: narrativa.resumo,
      indicadores: avaliacao.indicadores.map(({ peso: _peso, ...indicador }) => indicador),
      orcamento: { mes: proximo, ...avaliacao.orcamento },
      limiteCredito: {
        mes: proximo,
        ...avaliacao.limiteCredito,
        explicacao: narrativa.explicacaoLimite
      },
      insights: narrativa.insights,
      fonteTextos: narrativa.fonte
    }
  }
}

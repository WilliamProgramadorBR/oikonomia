import type { OfertaApertoEntrada, PlanoApertoDTO, TipoOferta } from '@compartilhado/dtos/aperto'
import { mesAtual } from '@compartilhado/utilitarios/mes'
import { ErroDominio } from '../../../dominio/erros/ErroDominio'
import type { IApertoRepositorio } from '../../../dominio/repositorios/IApertoRepositorio'
import { montarPlanoAperto } from '../../servicos/planoAperto'
import type { ObterPrevisao } from '../previsao/ObterPrevisao'

const MESES_ANALISADOS = 4
const TIPOS: TipoOferta[] = ['parcelar_fatura', 'credito_no_cartao', 'emprestimo', 'refinanciamento', 'antecipacao_fgts', 'custo_zero']

// Diagnóstico do mês apertado a partir da previsão (do mês atual em diante) + as ofertas cadastradas.
export class ObterPlanoAperto {
  constructor(
    private readonly obterPrevisao: ObterPrevisao,
    private readonly repositorio: IApertoRepositorio
  ) {}

  async executar(pessoaId: string | null): Promise<PlanoApertoDTO> {
    const previsao = await this.obterPrevisao.executar({ pessoaId, mesInicial: mesAtual() })
    const meses = previsao.meses.slice(0, MESES_ANALISADOS).map((m, k) => ({
      mes: m.mes,
      receitas: m.receitas,
      // Mês atual: o que já está lançado. Meses seguintes: inclui a reserva de imprevistos, para o plano
      // não contar com dinheiro que provavelmente vai embora (R3).
      despesas: m.contasRecorrentes + m.parcelasCartao + m.parcelasDividas + m.avulsasLancadas + (k > 0 ? m.reservaImprevistos : 0),
      avisos: m.avisos
    }))
    return montarPlanoAperto({
      meses,
      caixaExtraCentavos: this.repositorio.caixaExtra(),
      ofertas: await this.repositorio.listar(),
      passosFeitos: this.repositorio.passosFeitos()
    })
  }
}

export class SalvarOfertaAperto {
  constructor(private readonly repositorio: IApertoRepositorio) {}

  async executar(entrada: OfertaApertoEntrada): Promise<void> {
    const inteiro = (v: unknown, min = 0, max = 1e10) => Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max
    if (!TIPOS.includes(entrada.tipo)) throw new ErroDominio('Tipo de oferta inválido.')
    const descricao = String(entrada.descricao ?? '').trim().slice(0, 120)
    if (!descricao) throw new ErroDominio('Descreva a oferta (ex.: "Parcelar fatura do Nubank em 3x").')
    if (!inteiro(entrada.valorCentavos, 1)) throw new ErroDominio('Informe o valor.')
    const custoZero = entrada.tipo === 'custo_zero'
    if (!custoZero && (!inteiro(entrada.parcelas, 1, 120) || !inteiro(entrada.parcelaCentavos, 1))) {
      throw new ErroDominio('Informe o número de parcelas e o valor de cada uma.')
    }
    const refin = entrada.tipo === 'refinanciamento'
    await this.repositorio.salvar({
      id: entrada.id ?? crypto.randomUUID(),
      tipo: entrada.tipo,
      descricao,
      grupo: entrada.grupo?.trim().slice(0, 60) || null,
      valorCentavos: Math.round(entrada.valorCentavos),
      parcelas: custoZero ? 1 : Math.round(entrada.parcelas),
      parcelaCentavos: custoZero ? 0 : Math.round(entrada.parcelaCentavos),
      primeiraParcelaEmMeses: Math.min(12, Math.max(0, Math.round(entrada.primeiraParcelaEmMeses || 0))),
      saldoSubstituidoCentavos: refin ? Math.max(0, Math.round(entrada.saldoSubstituidoCentavos || 0)) : 0,
      parcelaSubstituidaCentavos: refin ? Math.max(0, Math.round(entrada.parcelaSubstituidaCentavos || 0)) : 0,
      parcelasSubstituidasRestantes: refin ? Math.max(0, Math.round(entrada.parcelasSubstituidasRestantes || 0)) : 0,
      situacao: ['avaliando', 'recusada', 'indisponivel'].includes(entrada.situacao) ? entrada.situacao : 'avaliando',
      motivo: entrada.motivo?.trim().slice(0, 200) || null
    })
  }
}

export class GerenciarPlanoAperto {
  constructor(private readonly repositorio: IApertoRepositorio) {}

  removerOferta(id: string): Promise<void> {
    return this.repositorio.remover(String(id))
  }
  async marcarPasso(chave: string, feito: boolean): Promise<void> {
    this.repositorio.marcarPasso(String(chave).slice(0, 120), !!feito)
  }
  async definirCaixaExtra(centavos: number): Promise<void> {
    this.repositorio.definirCaixaExtra(Number(centavos) || 0)
  }
}

import type { PassoPlanoDTO } from '@compartilhado/dtos/objetivo'
import { deslocarMes } from '@compartilhado/utilitarios/mes'
import type { Objetivo } from '../../dominio/entidades/Objetivo'
import type { PlanoObjetivo } from '../../dominio/servicos/PlanejadorObjetivos'
import { moeda, nomeMes, percentual } from './formatacao'

const mesAno = (mes: string) => `${nomeMes(mes)} de ${mes.slice(0, 4)}`

// Transforma o plano estruturado em etapas claras, na ordem em que devem ser feitas.
export function passosDoPlano(
  objetivo: Objetivo,
  plano: PlanoObjetivo,
  mesBase: string,
  aporteProgramado: number,
  cascata: { inicioAportes: string | null; bloqueador: string | null }
): PassoPlanoDTO[] {
  const passos: PassoPlanoDTO[] = []
  const prazoRealista =
    plano.prazoRealistaMeses !== null ? deslocarMes(mesBase, plano.prazoRealistaMeses) : null

  if (plano.viabilidade === 'concluido') {
    return [
      {
        tipo: 'concluido',
        titulo: 'Objetivo alcançado',
        descricao: `Você já tem ${moeda(objetivo.valorAlvoCentavos)} para "${objetivo.nome}". Se houver aporte programado, ele pode ir para o próximo objetivo.`
      }
    ]
  }

  if (plano.quitarDividaAntes) {
    const d = plano.quitarDividaAntes
    passos.push({
      tipo: 'divida',
      titulo: 'Primeiro, quite a dívida cara',
      descricao: `Há ${moeda(d.saldo)} em parcelas com juros de ${percentual(d.taxaMensal)} ao mês, mais do que qualquer aplicação rende. Direcionando a folga para antecipar essas parcelas, elas somem em cerca de ${d.mesesParaQuitar} ${d.mesesParaQuitar === 1 ? 'mês' : 'meses'}; depois, o mesmo valor vai para este objetivo.`
    })
  }

  if (plano.reservaAntes) {
    passos.push({
      tipo: 'reserva',
      titulo: 'Garanta a reserva mínima em paralelo',
      descricao:
        'Pelo seu perfil, uma reserva de emergência de pelo menos alguns meses evita que um imprevisto desmonte o plano. Se ainda não existe, crie o objetivo "Reserva de emergência" com prioridade alta.'
    })
  }

  switch (plano.viabilidade) {
    case 'no_caminho':
      passos.push({
        tipo: 'aporte',
        titulo: 'Você está no caminho',
        descricao: `O aporte programado de ${moeda(aporteProgramado)}/mês basta para chegar em ${mesAno(objetivo.dataAlvo)} (são necessários ${moeda(plano.aporteNecessario)}/mês). É só manter e confirmar os aportes todo mês.`
      })
      break
    case 'viavel':
      passos.push({
        tipo: 'aporte',
        titulo: `Guarde ${moeda(plano.aporteSugerido)} por mês`,
        descricao: `Cabe na folga do orçamento e chega em ${mesAno(objetivo.dataAlvo)}. Programar o aporte como conta recorrente transforma o plano em compromisso: ele entra na previsão e você só confirma.`,
        acao: { tipo: 'programar_aporte', valorCentavos: plano.aporteSugerido }
      })
      break
    case 'apertado':
      passos.push({
        tipo: 'corte',
        titulo: 'Dá, mas exige cortes',
        descricao: `São ${moeda(plano.aporteNecessario)}/mês e a folga atual não cobre tudo. Reduzindo ${plano.cortesSugeridos
          .map((c) => `${moeda(c.valorMensal)} em ${c.nome.toLowerCase()}`)
          .join(' e ')}, o objetivo cabe no prazo.`
      })
      passos.push({
        tipo: 'aporte',
        titulo: `Programe ${moeda(plano.aporteSugerido)} por mês`,
        descricao: 'Com os cortes combinados, programe o aporte para o valor não ficar para o fim do mês.',
        acao: { tipo: 'programar_aporte', valorCentavos: plano.aporteSugerido }
      })
      break
    case 'inviavel_no_prazo':
      passos.push({
        tipo: 'aporte',
        titulo: `Comece com ${moeda(plano.aporteSugerido)} por mês`,
        descricao: `É o que cabe hoje. Para chegar em ${mesAno(objetivo.dataAlvo)} seriam necessários ${moeda(plano.aporteNecessario)}/mês, o que o orçamento atual não comporta.`,
        acao: { tipo: 'programar_aporte', valorCentavos: plano.aporteSugerido }
      })
      if (prazoRealista) {
        passos.push({
          tipo: 'prazo',
          titulo: `Prazo realista: ${mesAno(prazoRealista)}`,
          descricao: `Mantendo ${moeda(plano.aporteSugerido)}/mês, o objetivo é alcançado em ${mesAno(prazoRealista)}. Ajustar o prazo deixa o acompanhamento honesto.`,
          acao: { tipo: 'ajustar_prazo', mes: prazoRealista }
        })
      }
      passos.push({
        tipo: 'meta',
        titulo: `Ou ajuste a meta para ${moeda(plano.valorPossivelNoPrazo)}`,
        descricao: `É quanto dá para juntar até ${mesAno(objetivo.dataAlvo)} com a folga atual. Útil quando a data não pode mudar (uma viagem marcada, por exemplo).`,
        acao: { tipo: 'ajustar_valor', valorCentavos: plano.valorPossivelNoPrazo }
      })
      break
    case 'aguardando': {
      const atrasa = prazoRealista !== null && prazoRealista > objetivo.dataAlvo
      passos.push({
        tipo: 'prazo',
        titulo: cascata.inicioAportes ? `Começa em ${mesAno(cascata.inicioAportes)}` : 'Aguardando',
        descricao: `Hoje a folga vai para "${cascata.bloqueador ?? 'objetivos mais prioritários'}", que tem prioridade maior. Quando ele estiver completo, o aporte passa para este objetivo${prazoRealista ? `, que fica pronto em ${mesAno(prazoRealista)}` : ''}${atrasa ? ` (depois do prazo de ${mesAno(objetivo.dataAlvo)})` : ''}.`,
        ...(atrasa && prazoRealista ? { acao: { tipo: 'ajustar_prazo' as const, mes: prazoRealista } } : {})
      })
      passos.push({
        tipo: 'meta',
        titulo: 'Quer antecipar?',
        descricao:
          'Aumente a prioridade deste objetivo (ele passa a receber antes dos outros) ou abra espaço no orçamento: cada real cortado no estilo de vida antecipa a data.'
      })
      break
    }
    case 'sem_capacidade':
      passos.push({
        tipo: 'corte',
        titulo: 'Hoje não sobra nada para este objetivo',
        descricao:
          'A previsão dos próximos meses não deixa folga depois das contas, parcelas, imprevistos e da margem de segurança (ou ela já está comprometida com objetivos mais prioritários). O primeiro passo é abrir espaço: rever contas recorrentes, evitar novos parcelamentos e cortar no estilo de vida.'
      })
      break
  }

  return passos
}

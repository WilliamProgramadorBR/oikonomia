// Ajustes de renda/contas fora do normal: um mês atípico ou as férias de quem é CLT.

export interface AjustarPrevistaEntrada {
  id: string // lançamento previsto de uma conta recorrente
  valorCentavos: number // 0 = não vai acontecer neste mês
  motivo: string // ex.: "Férias", "Licença", "Sem plantão"
}

export interface FeriasEntrada {
  recorrenciaId: string // conta recorrente do salário
  inicio: string // AAAA-MM-DD
  diasDescanso: number
  venderDias: boolean
  pagamentoNoMesSeguinte: boolean // salário do mês cai no mês seguinte (5º dia útil)
}

export interface AplicarFeriasEntrada extends FeriasEntrada {
  adiantamentoJaLancado: boolean // o pagamento das férias já entrou e já foi registrado
}

export interface HoleriteFeriasDTO {
  mesTrabalhado: string
  mesPagamento: string
  data: string | null // data prevista do salário nesse mês (null se a conta não tem ocorrência)
  diasFerias: number
  diasTrabalhados: number
  valorNormalCentavos: number
  valorComFeriasCentavos: number
  situacao: 'ajustar' | 'ja_confirmado' | 'sem_ocorrencia'
}

export interface PlanoFeriasDTO {
  salarioCentavos: number
  descricaoSalario: string
  inicio: string
  fim: string
  retorno: string
  dataAdiantamento: string
  valorFeriasCentavos: number
  valorAbonoCentavos: number
  adiantamentoCentavos: number
  holerites: HoleriteFeriasDTO[]
  // Quanto o caixa precisa segurar do adiantamento para cobrir os holerites menores.
  reservarDoAdiantamentoCentavos: number
  explicacao: string
}

export interface ResultadoAjusteDTO {
  mensagem: string
}

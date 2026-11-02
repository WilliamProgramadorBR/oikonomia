export interface PessoaDTO {
  id: string
  nome: string
  cor: string // hexadecimal, ex.: #6366f1
  criadoEm: string
}

export interface CriarPessoaEntrada {
  nome: string
  cor: string
}

export interface AtualizarPessoaEntrada extends CriarPessoaEntrada {
  id: string
}

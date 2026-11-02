// Erros de regra de negócio. A camada de apresentação devolve a mensagem ao usuário.
export class ErroDominio extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'ErroDominio'
  }
}

export class ErroNaoEncontrado extends ErroDominio {
  constructor(recurso: string, id: string) {
    super(`${recurso} não encontrado(a): ${id}`)
    this.name = 'ErroNaoEncontrado'
  }
}

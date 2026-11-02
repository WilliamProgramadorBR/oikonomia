// Portas de segurança: o domínio e os casos de uso não conhecem algoritmos nem bibliotecas.

// Hash de senha lento e com sal (ex.: scrypt). `verificar` deve comparar em tempo constante.
export interface IHashSenha {
  gerar(senha: string): Promise<string>
  verificar(senha: string, hash: string): Promise<boolean>
}

// Segredos aleatórios criptograficamente seguros e resumos para guardá-los no banco.
export interface IGeradorSegredos {
  token(): string // para sessões (alta entropia)
  codigoNumerico(digitos: number): string // para recuperação por e-mail
  resumo(valor: string): string // hash rápido (SHA-256): o banco nunca guarda o segredo em si
  iguais(a: string, b: string): boolean // comparação em tempo constante
}

// Guarda o token da sessão "manter conectado" cifrado pelo sistema operacional.
export interface IGuardaSessao {
  disponivel(): boolean
  guardar(token: string): void
  ler(): string | null
  limpar(): void
}

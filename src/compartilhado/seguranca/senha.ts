// Política de senha. Função pura: o backend usa para validar e a tela usa para o medidor de força.

export type ForcaSenha = 0 | 1 | 2 | 3 | 4

export interface AvaliacaoSenha {
  valida: boolean
  forca: ForcaSenha // 0 = inválida, 1 = fraca ... 4 = excelente
  rotulo: string
  problemas: string[] // o que impede a senha de ser aceita
  dicas: string[] // o que a deixaria mais forte
}

export const TAMANHO_MINIMO_SENHA = 8
export const TAMANHO_MAXIMO_SENHA = 128

const COMUNS = new Set([
  '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', 'password', 'password1',
  'senha123', 'senha1234', 'qwerty123', 'abc12345', 'abcd1234', 'iloveyou', 'admin123', 'brasil123',
  'mudar123', 'teste123', 'q1w2e3r4', '1q2w3e4r', 'a1b2c3d4', 'flamengo1', 'corinthians1', 'palmeiras1'
])

const ROTULOS = ['Inválida', 'Fraca', 'Razoável', 'Forte', 'Excelente']

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function avaliarSenha(senha: string, contexto: { nome?: string; email?: string } = {}): AvaliacaoSenha {
  const problemas: string[] = []
  const dicas: string[] = []
  const minuscula = normalizar(senha)

  if (senha.length < TAMANHO_MINIMO_SENHA) problemas.push(`Use pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`)
  if (senha.length > TAMANHO_MAXIMO_SENHA) problemas.push(`Use no máximo ${TAMANHO_MAXIMO_SENHA} caracteres.`)
  if (!/\p{L}/u.test(senha)) problemas.push('Inclua pelo menos uma letra.')
  if (!/\d/.test(senha)) problemas.push('Inclua pelo menos um número.')
  if (/^(.)\1+$/.test(senha)) problemas.push('Não repita o mesmo caractere.')
  if (COMUNS.has(minuscula)) problemas.push('Essa senha é muito comum.')

  const pessoais = [
    ...(contexto.nome ? normalizar(contexto.nome).split(/\s+/) : []),
    ...(contexto.email ? [normalizar(contexto.email).split('@')[0] ?? ''] : [])
  ].filter((parte) => parte.length >= 3)
  if (pessoais.some((parte) => minuscula.includes(parte))) problemas.push('Não use seu nome ou e-mail na senha.')

  const temMaiusculaEMinuscula = /\p{Lu}/u.test(senha) && /\p{Ll}/u.test(senha)
  const temSimbolo = /[^\p{L}\d]/u.test(senha)
  if (senha.length < 12) dicas.push('Com 12 caracteres ou mais ela fica bem mais difícil de adivinhar.')
  if (!temMaiusculaEMinuscula) dicas.push('Misture letras maiúsculas e minúsculas.')
  if (!temSimbolo) dicas.push('Inclua um símbolo (! @ # $ ...).')

  if (problemas.length > 0) return { valida: false, forca: 0, rotulo: ROTULOS[0], problemas, dicas }

  const pontos = 1 + Number(senha.length >= 12) + Number(senha.length >= 16) + Number(temMaiusculaEMinuscula) + Number(temSimbolo)
  const forca = Math.min(4, pontos) as ForcaSenha
  return { valida: true, forca, rotulo: ROTULOS[forca], problemas, dicas }
}

// Mensagem do primeiro problema ao criar/trocar senha (força + confirmação), ou null se está tudo certo.
export function problemaNovaSenha(avaliacao: AvaliacaoSenha, senha: string, confirmacao: string): string | null {
  if (!avaliacao.valida) return avaliacao.problemas[0] ?? 'Escolha uma senha mais forte.'
  if (senha !== confirmacao) return 'As senhas não conferem.'
  return null
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function emailValido(email: string): boolean {
  const limpo = normalizarEmail(email)
  return limpo.length <= 254 && EMAIL.test(limpo)
}

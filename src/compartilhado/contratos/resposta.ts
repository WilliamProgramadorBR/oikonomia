// Envelope padrão de toda resposta que atravessa o IPC.
// Erro devolvido por qualquer canal protegido quando não há sessão; a tela volta para o login.
export const ERRO_NAO_AUTENTICADO = 'Sua sessão terminou. Entre novamente.'

export type Resposta<T> = { sucesso: true; dados: T } | { sucesso: false; erro: string }

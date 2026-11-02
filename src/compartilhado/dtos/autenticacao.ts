export interface UsuarioDTO {
  id: string
  nome: string
  email: string
  pessoaId: string | null // membro da família ligado à conta
}

export interface EstadoAutenticacaoDTO {
  temUsuarios: boolean // false = primeiro uso: a tela abre direto no cadastro
  usuario: UsuarioDTO | null // conectado agora
  lembrarDisponivel: boolean // o sistema consegue guardar a sessão cifrada
  pessoasSemConta: { id: string; nome: string; cor: string }[] // para "quem é você na família?"
}

export interface CadastrarUsuarioEntrada {
  nome: string
  email: string
  senha: string
  pessoaId: string | null // null = cria um novo membro da família com o nome informado
  manterConectado: boolean
}

export interface EntrarEntrada {
  email: string
  senha: string
  manterConectado: boolean
}

export interface RedefinirSenhaEntrada {
  email: string
  codigo: string
  novaSenha: string
}

export interface AlterarSenhaEntrada {
  senhaAtual: string
  novaSenha: string
}

export interface MensagemDTO {
  mensagem: string
}

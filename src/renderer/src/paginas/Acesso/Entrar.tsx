import { useState, type FormEvent } from 'react'
import { LogIn, Mail } from 'lucide-react'
import { CampoSenha, Marcador } from '../../componentes/acesso/CamposAcesso'
import { Botao } from '../../componentes/ui/Botao'
import { Campo } from '../../componentes/ui/Campo'
import { autenticacaoServico } from '../../servicos/autenticacaoServico'
import estilos from './Acesso.module.css'

interface PropsEntrar {
  emailInicial: string
  lembrarDisponivel: boolean
  aoEntrar: () => Promise<void>
  aoEsquecer: (email: string) => void
}

export function Entrar({ emailInicial, lembrarDisponivel, aoEntrar, aoEsquecer }: PropsEntrar) {
  const [email, setEmail] = useState(emailInicial)
  const [senha, setSenha] = useState('')
  const [manterConectado, setManterConectado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0) // reinicia a animação de erro
  const [entrando, setEntrando] = useState(false)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setEntrando(true)
    setErro(null)
    try {
      await autenticacaoServico.entrar({ email, senha, manterConectado })
      await aoEntrar()
    } catch (e) {
      setErro((e as Error).message)
      setTentativa((t) => t + 1)
      setSenha('')
      setEntrando(false)
    }
  }

  return (
    <form className={estilos.formulario} onSubmit={enviar}>
      <div className={estilos.titulos}>
        <h1>Que bom te ver de novo</h1>
        <p>Entre para ver como estão as finanças da família.</p>
      </div>

      {erro && (
        <p key={tentativa} className={estilos.erro} role="alert">
          {erro}
        </p>
      )}

      <Campo
        rotulo="E-mail"
        icone={Mail}
        type="email"
        autoComplete="username"
        placeholder="voce@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoFocus={!emailInicial}
        required
      />
      <CampoSenha
        rotulo="Senha"
        autoComplete="current-password"
        placeholder="Sua senha"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        autoFocus={!!emailInicial}
        required
      />

      <div className={estilos.linhaOpcoes}>
        {lembrarDisponivel ? (
          <Marcador marcado={manterConectado} aoAlterar={setManterConectado}>
            Manter conectado
          </Marcador>
        ) : (
          <span />
        )}
        <button type="button" className={estilos.link} onClick={() => aoEsquecer(email)}>
          Esqueci minha senha
        </button>
      </div>

      <Botao type="submit" icone={LogIn} carregando={entrando} disabled={!email || !senha} className={estilos.botaoPrincipal}>
        Entrar
      </Botao>

      <p className={estilos.nota}>
        Para dar acesso a outra pessoa da família, entre e vá em <strong>Configurações</strong>.
      </p>
    </form>
  )
}

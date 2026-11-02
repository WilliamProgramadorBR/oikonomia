import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, CircleCheck, Mail, MailCheck, Send } from 'lucide-react'
import { avaliarSenha, emailValido, problemaNovaSenha } from '@compartilhado/seguranca/senha'
import { CampoCodigo, CampoSenha, MedidorSenha } from '../../componentes/acesso/CamposAcesso'
import { Botao } from '../../componentes/ui/Botao'
import { Campo } from '../../componentes/ui/Campo'
import { autenticacaoServico } from '../../servicos/autenticacaoServico'
import estilos from './Acesso.module.css'

type Etapa = 'email' | 'codigo' | 'pronto'
const ESPERA_REENVIO = 60

export function Recuperar({ emailInicial, aoVoltar }: { emailInicial: string; aoVoltar: (email: string) => void }) {
  const [etapa, setEtapa] = useState<Etapa>('email')
  const [email, setEmail] = useState(emailInicial)
  const [aviso, setAviso] = useState('')
  const [codigo, setCodigo] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [espera, setEspera] = useState(0)

  const avaliacao = useMemo(() => avaliarSenha(senha, { email }), [senha, email])

  useEffect(() => {
    if (espera <= 0) return
    const id = window.setTimeout(() => setEspera(espera - 1), 1000)
    return () => window.clearTimeout(id)
  }, [espera])

  async function pedirCodigo(evento?: FormEvent) {
    evento?.preventDefault()
    if (!emailValido(email)) {
      setErro('Informe um e-mail válido.')
      return
    }
    setCarregando(true)
    setErro(null)
    try {
      setAviso((await autenticacaoServico.solicitarRecuperacao(email)).mensagem)
      setEtapa('codigo')
      setEspera(ESPERA_REENVIO)
    } catch (e) {
      setErro((e as Error).message)
    }
    setCarregando(false)
  }

  async function redefinir(evento: FormEvent) {
    evento.preventDefault()
    if (codigo.length !== 6) return setErro('Digite os 6 números do código.')
    const problema = problemaNovaSenha(avaliacao, senha, confirmacao)
    if (problema) return setErro(problema)
    setCarregando(true)
    setErro(null)
    try {
      await autenticacaoServico.redefinirSenha({ email, codigo, novaSenha: senha })
      setEtapa('pronto')
    } catch (e) {
      setErro((e as Error).message)
      setCodigo('')
    }
    setCarregando(false)
  }

  const voltar = (
    <button type="button" className={estilos.voltar} onClick={() => aoVoltar(email)}>
      <ArrowLeft size={15} /> Voltar para o login
    </button>
  )

  if (etapa === 'pronto') {
    return (
      <div className={estilos.formulario}>
        <div className={estilos.sucesso}>
          <span className={estilos.sucessoIcone}>
            <CircleCheck size={30} />
          </span>
          <h1>Senha redefinida</h1>
          <p>Por segurança, todas as sessões abertas dessa conta foram encerradas. Entre com a nova senha.</p>
        </div>
        <Botao className={estilos.botaoPrincipal} onClick={() => aoVoltar(email)}>
          Ir para o login
        </Botao>
      </div>
    )
  }

  if (etapa === 'codigo') {
    return (
      <form className={estilos.formulario} onSubmit={redefinir}>
        {voltar}
        <div className={estilos.titulos}>
          <span className={estilos.iconeTitulo}>
            <MailCheck size={22} />
          </span>
          <h1>Confira seu e-mail</h1>
          <p>{aviso}</p>
        </div>
        {erro && (
          <p className={estilos.erro} role="alert">
            {erro}
          </p>
        )}
        <div className={estilos.blocoCodigo}>
          <span className={estilos.rotuloSolto}>Código enviado para {email.trim().toLowerCase()}</span>
          <CampoCodigo valor={codigo} aoAlterar={setCodigo} />
        </div>
        <CampoSenha rotulo="Nova senha" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        <MedidorSenha avaliacao={avaliacao} vazia={!senha} />
        <CampoSenha rotulo="Repita a nova senha" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
        <Botao type="submit" carregando={carregando} className={estilos.botaoPrincipal}>
          Redefinir senha
        </Botao>
        <p className={estilos.nota}>
          Não chegou? Veja o spam ou{' '}
          <button type="button" className={estilos.link} disabled={espera > 0 || carregando} onClick={() => pedirCodigo()}>
            {espera > 0 ? `reenvie em ${espera}s` : 'reenvie o código'}
          </button>
          .
        </p>
      </form>
    )
  }

  return (
    <form className={estilos.formulario} onSubmit={pedirCodigo}>
      {voltar}
      <div className={estilos.titulos}>
        <h1>Esqueceu a senha?</h1>
        <p>Informe o e-mail da conta. Vamos enviar um código de 6 dígitos para você criar uma senha nova.</p>
      </div>
      {erro && (
        <p className={estilos.erro} role="alert">
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
        autoFocus
      />
      <Botao type="submit" icone={Send} carregando={carregando} className={estilos.botaoPrincipal}>
        Enviar código
      </Botao>
    </form>
  )
}

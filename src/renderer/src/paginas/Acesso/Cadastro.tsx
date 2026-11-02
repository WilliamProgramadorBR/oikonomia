import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, Mail, PartyPopper, User } from 'lucide-react'
import type { EstadoAutenticacaoDTO } from '@compartilhado/dtos/autenticacao'
import { avaliarSenha, emailValido, problemaNovaSenha } from '@compartilhado/seguranca/senha'
import { CampoSenha, Marcador, MedidorSenha } from '../../componentes/acesso/CamposAcesso'
import { EscolhaPessoa } from '../../componentes/acesso/EscolhaPessoa'
import { Botao } from '../../componentes/ui/Botao'
import { Campo } from '../../componentes/ui/Campo'
import { autenticacaoServico } from '../../servicos/autenticacaoServico'
import { classes } from '../../utilitarios/classes'
import estilos from './Acesso.module.css'

interface PropsCadastro {
  pessoasSemConta: EstadoAutenticacaoDTO['pessoasSemConta']
  lembrarDisponivel: boolean
  aoConcluir: () => Promise<void>
}

const PASSOS = ['Você', 'E-mail', 'Senha', 'Pronto']

// Cadastro em carrossel: um assunto por passo, com validação antes de avançar.
export function Cadastro({ pessoasSemConta, lembrarDisponivel, aoConcluir }: PropsCadastro) {
  const [passo, setPasso] = useState(0)
  const [nome, setNome] = useState('')
  const [pessoaId, setPessoaId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [manterConectado, setManterConectado] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)

  const avaliacao = useMemo(() => avaliarSenha(senha, { nome, email }), [senha, nome, email])

  function validar(): string | null {
    if (passo === 0 && !nome.trim()) return 'Informe seu nome.'
    if (passo === 1 && !emailValido(email)) return 'Informe um e-mail válido.'
    if (passo === 2) return problemaNovaSenha(avaliacao, senha, confirmacao)
    return null
  }

  async function avancar(evento: FormEvent) {
    evento.preventDefault()
    const problema = validar()
    setErro(problema)
    if (problema) return
    if (passo < PASSOS.length - 1) {
      setPasso(passo + 1)
      return
    }
    setCriando(true)
    try {
      await autenticacaoServico.cadastrar({ nome, email, senha, pessoaId, manterConectado })
      await aoConcluir()
    } catch (e) {
      setErro((e as Error).message)
      setCriando(false)
    }
  }

  const etapa = (indice: number, conteudo: ReactNode) => (
    <div className={estilos.etapa} inert={indice !== passo}>
      {conteudo}
    </div>
  )

  return (
    <form className={estilos.formulario} onSubmit={avancar}>
      <div className={estilos.titulos}>
        <span className={estilos.sobretitulo}>Primeiro acesso</span>
        <h1>Crie sua conta</h1>
        <p>Leva menos de um minuto. Depois você pode dar acesso ao resto da família.</p>
      </div>

      <ol className={estilos.passos}>
        {PASSOS.map((rotulo, i) => (
          <li key={rotulo} className={classes(i === passo && estilos.passoAtual, i < passo && estilos.passoFeito)}>
            <span>{i < passo ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
            {rotulo}
          </li>
        ))}
      </ol>

      {erro && (
        <p className={estilos.erro} role="alert">
          {erro}
        </p>
      )}

      <div className={estilos.janelaEtapas}>
        <div className={estilos.trilhoEtapas} style={{ '--passo': passo } as CSSProperties}>
          {etapa(
            0,
            <>
              <h2 className={estilos.perguntaEtapa}>Como podemos te chamar?</h2>
              <EscolhaPessoa
                pergunta="Você já está na família cadastrada?"
                pessoas={pessoasSemConta}
                valor={pessoaId}
                rotuloNova="Não estou na lista"
                aoEscolher={(pessoa) => {
                  setPessoaId(pessoa?.id ?? null)
                  if (pessoa) setNome(pessoa.nome)
                }}
              />
              <Campo
                rotulo="Seu nome"
                icone={User}
                autoComplete="name"
                placeholder="Ex.: Ana Souza"
                maxLength={40}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoFocus
              />
            </>
          )}
          {etapa(
            1,
            <>
              <h2 className={estilos.perguntaEtapa}>Qual é o seu e-mail?</h2>
              <Campo
                rotulo="E-mail"
                icone={Mail}
                type="email"
                autoComplete="email"
                placeholder="voce@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className={estilos.nota}>Ele serve para entrar e para recuperar a senha se você esquecer.</p>
            </>
          )}
          {etapa(
            2,
            <>
              <h2 className={estilos.perguntaEtapa}>Crie uma senha forte</h2>
              <CampoSenha
                rotulo="Senha"
                autoComplete="new-password"
                placeholder="Pelo menos 8 caracteres, com letras e números"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <MedidorSenha avaliacao={avaliacao} vazia={!senha} />
              <CampoSenha
                rotulo="Repita a senha"
                autoComplete="new-password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
              />
              {confirmacao && senha === confirmacao && (
                <span className={estilos.confere}>
                  <Check size={13} /> As senhas conferem
                </span>
              )}
            </>
          )}
          {etapa(
            3,
            <>
              <div className={estilos.pronto}>
                <span className={estilos.prontoIcone}>
                  <PartyPopper size={24} />
                </span>
                <h2 className={estilos.perguntaEtapa}>Tudo certo, {nome.trim().split(/\s+/)[0] || 'por aqui'}!</h2>
              </div>
              <dl className={estilos.resumo}>
                <div>
                  <dt>Nome</dt>
                  <dd>{nome}</dd>
                </div>
                <div>
                  <dt>E-mail</dt>
                  <dd>{email.trim().toLowerCase()}</dd>
                </div>
                <div>
                  <dt>Na família</dt>
                  <dd>{pessoaId ? 'Ligada ao cadastro existente' : 'Novo membro'}</dd>
                </div>
              </dl>
              {lembrarDisponivel && (
                <Marcador marcado={manterConectado} aoAlterar={setManterConectado}>
                  Manter conectado neste computador
                </Marcador>
              )}
            </>
          )}
        </div>
      </div>

      <div className={estilos.acoesEtapa}>
        {passo > 0 ? (
          <Botao
            variante="fantasma"
            icone={ArrowLeft}
            onClick={() => {
              setErro(null)
              setPasso(passo - 1)
            }}
          >
            Voltar
          </Botao>
        ) : (
          <span />
        )}
        <Botao type="submit" carregando={criando} icone={passo === PASSOS.length - 1 ? Check : ArrowRight}>
          {passo === PASSOS.length - 1 ? 'Criar conta' : 'Continuar'}
        </Botao>
      </div>
    </form>
  )
}

import { useMemo, useState, type FormEvent } from 'react'
import { KeyRound, Mail, ShieldCheck, User, UserPlus } from 'lucide-react'
import { avaliarSenha, emailValido, problemaNovaSenha } from '@compartilhado/seguranca/senha'
import { useAutenticacao } from '../../contextos/AutenticacaoContexto'
import { useNotificar } from '../../contextos/NotificacaoContexto'
import { useAcao } from '../../hooks/useAcao'
import { useConsulta } from '../../hooks/useConsulta'
import { autenticacaoServico } from '../../servicos/autenticacaoServico'
import { Botao } from '../ui/Botao'
import { Campo } from '../ui/Campo'
import { Cartao } from '../ui/Cartao'
import { Etiqueta } from '../ui/Elementos'
import { Modal } from '../ui/Modal'
import { CampoSenha, MedidorSenha } from './CamposAcesso'
import { EscolhaPessoa } from './EscolhaPessoa'
import estilos from './ContaSeguranca.module.css'

export function ContaSeguranca() {
  const { usuario } = useAutenticacao()
  const { dados: usuarios } = useConsulta(() => autenticacaoServico.listarUsuarios(), [])
  const notificar = useNotificar()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [novaConta, setNovaConta] = useState(false)

  const avaliacao = useMemo(
    () => avaliarSenha(novaSenha, { nome: usuario?.nome, email: usuario?.email }),
    [novaSenha, usuario]
  )

  async function alterar(evento: FormEvent) {
    evento.preventDefault()
    const problema = problemaNovaSenha(avaliacao, novaSenha, confirmacao)
    if (problema) return notificar('erro', problema)
    setSalvando(true)
    try {
      notificar('sucesso', (await autenticacaoServico.alterarSenha({ senhaAtual, novaSenha })).mensagem)
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmacao('')
    } catch (e) {
      notificar('erro', (e as Error).message)
    }
    setSalvando(false)
  }

  return (
    <div className={estilos.grade}>
      <Cartao titulo="Alterar senha" subtitulo="Ao trocar, as outras sessões abertas são encerradas">
        <form className={estilos.formulario} onSubmit={alterar}>
          <CampoSenha rotulo="Senha atual" autoComplete="current-password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
          <CampoSenha rotulo="Nova senha" autoComplete="new-password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
          <MedidorSenha avaliacao={avaliacao} vazia={!novaSenha} />
          <CampoSenha rotulo="Repita a nova senha" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
          <div>
            <Botao type="submit" icone={KeyRound} carregando={salvando} disabled={!senhaAtual || !novaSenha || !confirmacao}>
              Alterar senha
            </Botao>
          </div>
        </form>
      </Cartao>

      <Cartao
        titulo="Acessos da família"
        subtitulo="Cada pessoa entra com o próprio e-mail; os dados são da casa"
        acao={
          <Botao tamanho="p" variante="secundario" icone={UserPlus} onClick={() => setNovaConta(true)}>
            Dar acesso
          </Botao>
        }
      >
        <ul className={estilos.contas}>
          {usuarios?.map((u) => (
            <li key={u.id}>
              <span className={estilos.inicial}>{u.nome.charAt(0).toUpperCase()}</span>
              <div>
                <strong>{u.nome}</strong>
                <span>{u.email}</span>
              </div>
              {u.id === usuario?.id && (
                <Etiqueta cor="var(--receita)">
                  <ShieldCheck size={11} /> você
                </Etiqueta>
              )}
            </li>
          ))}
        </ul>
        <p className={estilos.nota}>
          Senhas guardadas com scrypt (nunca em texto), bloqueio temporário após 5 tentativas erradas e recuperação por código
          de e-mail com validade de 15 minutos.
        </p>
      </Cartao>

      <ModalNovaConta aberto={novaConta} aoFechar={() => setNovaConta(false)} />
    </div>
  )
}

function ModalNovaConta({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { estado, recarregar } = useAutenticacao()
  const executar = useAcao()
  const [nome, setNome] = useState('')
  const [pessoaId, setPessoaId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const avaliacao = useMemo(() => avaliarSenha(senha, { nome, email }), [senha, nome, email])
  const pessoas = estado?.pessoasSemConta ?? []

  function fechar() {
    setNome('')
    setPessoaId(null)
    setEmail('')
    setSenha('')
    aoFechar()
  }

  async function criar(evento: FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    const ok = await executar(
      () => autenticacaoServico.cadastrar({ nome, email, senha, pessoaId, manterConectado: false }),
      `Acesso criado para ${nome.trim().split(/\s+/)[0]}`
    )
    setSalvando(false)
    if (ok) {
      await recarregar()
      fechar()
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={fechar}
      titulo="Dar acesso a alguém da família"
      descricao="Combine a senha inicial com a pessoa; ela pode trocá-la depois em Configurações."
      rodape={
        <>
          <Botao variante="fantasma" onClick={fechar}>
            Cancelar
          </Botao>
          <Botao
            type="submit"
            form="formulario-nova-conta"
            carregando={salvando}
            disabled={!nome.trim() || !emailValido(email) || !avaliacao.valida}
          >
            Criar acesso
          </Botao>
        </>
      }
    >
      <form id="formulario-nova-conta" className={estilos.formulario} onSubmit={criar}>
        <EscolhaPessoa
          pergunta="Quem é?"
          pessoas={pessoas}
          valor={pessoaId}
          rotuloNova="Outra pessoa"
          aoEscolher={(pessoa) => {
            setPessoaId(pessoa?.id ?? null)
            if (pessoa) setNome(pessoa.nome)
          }}
        />
        <Campo rotulo="Nome" icone={User} maxLength={40} value={nome} onChange={(e) => setNome(e.target.value)} />
        <Campo rotulo="E-mail" icone={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <CampoSenha rotulo="Senha inicial" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        <MedidorSenha avaliacao={avaliacao} vazia={!senha} />
      </form>
    </Modal>
  )
}

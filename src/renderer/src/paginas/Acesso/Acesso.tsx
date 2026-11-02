import { useState } from 'react'
import { Lock, Moon, Sun, Wallet } from 'lucide-react'
import { AUTORIA } from '@compartilhado/constantes/autoria'
import type { EstadoAutenticacaoDTO } from '@compartilhado/dtos/autenticacao'
import { useAutenticacao } from '../../contextos/AutenticacaoContexto'
import { useTema } from '../../contextos/TemaContexto'
import { Apresentacao } from './Apresentacao'
import { Cadastro } from './Cadastro'
import { Entrar } from './Entrar'
import { Recuperar } from './Recuperar'
import estilos from './Acesso.module.css'

type Modo = 'entrar' | 'cadastro' | 'recuperar'

// Tela inicial: apresentação à esquerda e, à direita, login, cadastro (só no primeiro uso)
// ou recuperação de senha.
export function Acesso({ estado }: { estado: EstadoAutenticacaoDTO }) {
  const { recarregar } = useAutenticacao()
  const { tema, alternarTema } = useTema()
  const [modo, setModo] = useState<Modo>(estado.temUsuarios ? 'entrar' : 'cadastro')
  const [email, setEmail] = useState('')

  return (
    <div className={estilos.tela}>
      <Apresentacao />

      <main className={estilos.lado}>
        <header className={estilos.topo}>
          <div className={estilos.marca}>
            <span className={estilos.marcaIcone}>
              <Wallet size={18} strokeWidth={2.2} />
            </span>
            <strong>Projeto Financeiro</strong>
          </div>
          <button className={estilos.botaoTema} onClick={alternarTema} aria-label="Alternar tema">
            {tema === 'claro' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </header>

        <div className={estilos.centro}>
          <div className={estilos.conteudo} key={modo}>
            {modo === 'entrar' && (
              <Entrar
                emailInicial={email}
                lembrarDisponivel={estado.lembrarDisponivel}
                aoEntrar={recarregar}
                aoEsquecer={(e) => {
                  setEmail(e)
                  setModo('recuperar')
                }}
              />
            )}
            {modo === 'cadastro' && (
              <Cadastro
                pessoasSemConta={estado.pessoasSemConta}
                lembrarDisponivel={estado.lembrarDisponivel}
                aoConcluir={recarregar}
              />
            )}
            {modo === 'recuperar' && (
              <Recuperar
                emailInicial={email}
                aoVoltar={(e) => {
                  setEmail(e)
                  setModo('entrar')
                }}
              />
            )}
          </div>
        </div>

        <footer className={estilos.rodape}>
          <span>
            <Lock size={13} /> Seus dados ficam guardados só neste computador, criptografados.
          </span>
          <a href={AUTORIA.site} target="_blank" rel="noreferrer">
            Feito por {AUTORIA.nome}
          </a>
        </footer>
      </main>
    </div>
  )
}

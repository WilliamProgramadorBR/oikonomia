import { useState } from 'react'
import { Cloud, CloudOff, KeyRound, LockKeyhole, ShieldCheck, UnlockKeyhole } from 'lucide-react'
import { useAcao } from '../../hooks/useAcao'
import { useConsulta } from '../../hooks/useConsulta'
import { sincronizacaoServico } from '../../servicos/sincronizacaoServico'
import { Botao } from '../ui/Botao'
import { Campo } from '../ui/Campo'
import { Cartao } from '../ui/Cartao'
import { Esqueleto, Etiqueta } from '../ui/Elementos'
import estilos from './SincronizacaoSegura.module.css'

export function SincronizacaoSegura() {
  const { dados: estado, carregando } = useConsulta(() => sincronizacaoServico.estado(), [])
  const executar = useAcao()
  const [frase, setFrase] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [fraseAtual, setFraseAtual] = useState('')
  const [fraseNova, setFraseNova] = useState('')
  const [confirmacaoNova, setConfirmacaoNova] = useState('')

  function limparCampos() {
    setFrase('')
    setConfirmacao('')
    setFraseAtual('')
    setFraseNova('')
    setConfirmacaoNova('')
  }

  if (carregando || !estado) return <Esqueleto altura={260} />

  const local = estado.modo === 'local'
  const etiqueta = local ? (
    <Etiqueta cor="var(--texto-fraco)"><CloudOff size={11} /> somente local</Etiqueta>
  ) : estado.bloqueado ? (
    <Etiqueta cor="var(--alerta)"><LockKeyhole size={11} /> cofre bloqueado</Etiqueta>
  ) : (
    <Etiqueta cor="var(--receita)"><ShieldCheck size={11} /> cofre desbloqueado</Etiqueta>
  )

  return (
    <Cartao
      titulo="Privacidade e sincronização"
      subtitulo="Escolha entre manter tudo neste dispositivo ou preparar a sincronização cifrada entre aparelhos"
      acao={etiqueta}
    >
      <div className={estilos.conteudo}>
        {local ? (
          <>
            <div className={estilos.resumo}>
              <CloudOff size={25} />
              <div>
                <strong>Os dados permanecem somente neste dispositivo</strong>
                <span>O banco local continua cifrado e nenhum dado financeiro é enviado para um servidor.</span>
              </div>
            </div>
            <div className={estilos.formulario}>
              <Campo
                rotulo="Crie uma frase secreta"
                icone={KeyRound}
                type="password"
                autoComplete="new-password"
                minLength={16}
                maxLength={256}
                value={frase}
                onChange={(e) => setFrase(e.target.value)}
                placeholder="No mínimo 16 caracteres"
              />
              <Campo
                rotulo="Confirme a frase secreta"
                icone={KeyRound}
                type="password"
                autoComplete="new-password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
              />
            </div>
            <p className={estilos.alerta}>
              A frase não será salva nem enviada. Ela será exigida em cada aparelho novo. Se for esquecida, os dados
              sincronizados não poderão ser recuperados.
            </p>
            <Botao
              icone={Cloud}
              disabled={!frase || !confirmacao}
              onClick={async () => {
                const ok = await executar(
                  () => sincronizacaoServico.ativar({ fraseSecreta: frase, confirmacao }),
                  'Cofre de sincronização preparado'
                )
                if (ok) limparCampos()
              }}
            >
              Preparar sincronização segura
            </Botao>
          </>
        ) : estado.bloqueado ? (
          <>
            <div className={estilos.resumo}>
              <LockKeyhole size={25} />
              <div>
                <strong>Cofre de sincronização bloqueado</strong>
                <span>Informe a frase criada pelo usuário para liberar a chave desta sessão.</span>
              </div>
            </div>
            <div className={estilos.linhaAcao}>
              <Campo
                rotulo="Frase secreta"
                icone={KeyRound}
                type="password"
                autoComplete="current-password"
                value={frase}
                onChange={(e) => setFrase(e.target.value)}
              />
              <Botao
                icone={UnlockKeyhole}
                disabled={!frase}
                onClick={async () => {
                  const ok = await executar(
                    () => sincronizacaoServico.desbloquear({ fraseSecreta: frase }),
                    'Cofre desbloqueado nesta sessão'
                  )
                  if (ok) limparCampos()
                }}
              >
                Desbloquear
              </Botao>
            </div>
          </>
        ) : (
          <>
            <div className={estilos.resumo}>
              <ShieldCheck size={25} />
              <div>
                <strong>Cofre preparado neste dispositivo</strong>
                <span>A chave de dados está apenas na memória. A conexão com o serviço central será a próxima etapa.</span>
              </div>
            </div>
            <div className={estilos.acoes}>
              <Botao variante="secundario" icone={LockKeyhole} onClick={() => executar(() => sincronizacaoServico.bloquear(), 'Cofre bloqueado')}>
                Bloquear agora
              </Botao>
            </div>
            <div className={estilos.separador} />
            <h3>Trocar frase secreta</h3>
            <div className={estilos.formularioTres}>
              <Campo rotulo="Frase atual" type="password" autoComplete="current-password" value={fraseAtual} onChange={(e) => setFraseAtual(e.target.value)} />
              <Campo rotulo="Nova frase" type="password" autoComplete="new-password" value={fraseNova} onChange={(e) => setFraseNova(e.target.value)} />
              <Campo rotulo="Confirmar nova frase" type="password" autoComplete="new-password" value={confirmacaoNova} onChange={(e) => setConfirmacaoNova(e.target.value)} />
            </div>
            <div className={estilos.acoes}>
              <Botao
                variante="secundario"
                disabled={!fraseAtual || !fraseNova || !confirmacaoNova}
                onClick={async () => {
                  const ok = await executar(
                    () => sincronizacaoServico.alterarFrase({ fraseAtual, fraseNova, confirmacao: confirmacaoNova }),
                    'Frase secreta alterada'
                  )
                  if (ok) limparCampos()
                }}
              >
                Alterar frase
              </Botao>
              <Botao
                variante="perigo"
                disabled={!fraseAtual}
                onClick={async () => {
                  const ok = await executar(
                    () => sincronizacaoServico.desativar({ fraseSecreta: fraseAtual }),
                    'Dados mantidos somente neste dispositivo'
                  )
                  if (ok) limparCampos()
                }}
              >
                Voltar ao modo local
              </Botao>
            </div>
          </>
        )}
      </div>
    </Cartao>
  )
}

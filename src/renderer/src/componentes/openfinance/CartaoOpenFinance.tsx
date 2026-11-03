import { useEffect, useState } from 'react'
import { BadgeCheck, Building2, FileText, KeyRound, Link2, PlugZap, Power, RefreshCw, ShieldCheck, Unplug } from 'lucide-react'
import type { ConexaoBancariaDTO, ContaRemotaDTO } from '@compartilhado/dtos/openFinance'
import { useContas, usePessoas } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { useConsulta } from '../../hooks/useConsulta'
import { openFinanceServico } from '../../servicos/openFinanceServico'
import { useNotificar } from '../../contextos/NotificacaoContexto'
import { classes } from '../../utilitarios/classes'
import { dataCurta } from '../../utilitarios/datas'
import { formatarCentavos } from '../../utilitarios/moeda'
import { Marcador } from '../acesso/CamposAcesso'
import { Botao } from '../ui/Botao'
import { Campo } from '../ui/Campo'
import { Cartao } from '../ui/Cartao'
import { Esqueleto, Etiqueta } from '../ui/Elementos'
import { ModalTermoOpenFinance } from './ModalTermoOpenFinance'
import estilos from './OpenFinance.module.css'

const SITUACOES: Record<ConexaoBancariaDTO['situacao'], { rotulo: string; cor: string }> = {
  atualizada: { rotulo: 'conectada', cor: 'var(--receita)' },
  atualizando: { rotulo: 'atualizando', cor: 'var(--primaria)' },
  precisa_autorizar: { rotulo: 'precisa autorizar de novo', cor: 'var(--alerta)' },
  erro: { rotulo: 'com erro', cor: 'var(--despesa)' }
}

export function CartaoOpenFinance() {
  const { dados: estado } = useConsulta(() => openFinanceServico.estado(), [])
  const executar = useAcao()
  const notificar = useNotificar()
  const [termoAberto, setTermoAberto] = useState(false)
  const [lendoTermo, setLendoTermo] = useState(false)
  const [trocandoCredenciais, setTrocandoCredenciais] = useState(false)
  const [desativando, setDesativando] = useState(false)
  const [apagarCredenciais, setApagarCredenciais] = useState(true)
  const [sandbox, setSandbox] = useState(false)
  const [conectando, setConectando] = useState(false)

  // Substitui os webhooks: confere a situação das conexões ao abrir a tela (no máximo a cada 30 min).
  useEffect(() => {
    void executar(() => openFinanceServico.verificarConexoes())
  }, [executar])

  if (!estado) return <Esqueleto altura={180} />

  const ativo = !estado.termo.precisaAceitar && estado.credenciaisConfiguradas

  async function conectar(itemId?: string) {
    setConectando(true)
    await executar(async () => {
      await openFinanceServico.conectar({ itemId, incluirSandbox: sandbox })
    })
    setConectando(false)
  }

  return (
    <Cartao
      titulo="Open Finance (beta, opcional)"
      subtitulo="Saldos e extratos direto do banco, pela sua conta na Pluggy"
      acao={
        ativo ? (
          <Etiqueta cor="var(--receita)">
            <ShieldCheck size={11} /> ativo
          </Etiqueta>
        ) : (
          <Etiqueta cor="var(--texto-fraco)">desligado</Etiqueta>
        )
      }
    >
      {estado.termo.precisaAceitar ? (
        <div className={estilos.apresentacao}>
          <ul>
            <li>
              <strong>Opcional:</strong> todo o app funciona sem isso; a importação de extrato continua disponível.
            </li>
            <li>
              <strong>A conta na Pluggy é sua:</strong> você cria as suas credenciais e elas ficam cifradas neste computador.
            </li>
            <li>
              <strong>Sua senha do banco nunca passa pelo app:</strong> a autorização é feita no ambiente do banco.
            </li>
            <li>
              <strong>Você revisa tudo:</strong> nada é gravado sem a sua confirmação, e dá para desconectar quando quiser.
            </li>
          </ul>
          {estado.termo.versaoAceita && <p className={estilos.alertaTermo}>O termo foi atualizado desde o seu aceite. Leia a nova versão para continuar.</p>}
          <Botao icone={FileText} onClick={() => setTermoAberto(true)}>
            Ler o termo e ativar
          </Botao>
        </div>
      ) : !estado.credenciaisConfiguradas || trocandoCredenciais ? (
        <FormularioCredenciais
          criptografiaDisponivel={estado.criptografiaDisponivel}
          aoSalvar={() => setTrocandoCredenciais(false)}
          aoCancelar={estado.credenciaisConfiguradas ? () => setTrocandoCredenciais(false) : undefined}
        />
      ) : (
        <div className={estilos.ativo}>
          <div className={estilos.barraConectar}>
            <Botao icone={PlugZap} carregando={conectando} onClick={() => conectar()}>
              Conectar banco
            </Botao>
            <Marcador marcado={sandbox} aoAlterar={setSandbox}>
              Mostrar bancos de teste (sandbox)
            </Marcador>
          </div>

          {conectando && (
            <div className={estilos.aguardandoNavegador}>
              <span>
                <strong>Continue no seu navegador.</strong> A tela da Pluggy abriu numa aba nova. Ao terminar, volte aqui.
              </span>
              <span className={estilos.acoesAguardando}>
                <button type="button" onClick={() => void openFinanceServico.conexaoEmAndamento('reabrir')}>
                  Abrir de novo
                </button>
                <button type="button" onClick={() => void openFinanceServico.conexaoEmAndamento('cancelar')}>
                  Cancelar
                </button>
              </span>
            </div>
          )}

          {estado.conexoes.length === 0 ? (
            <p className={estilos.vazio}>Nenhum banco conectado ainda. A conexão abre no seu navegador, com a tela oficial da Pluggy, e a autorização é feita no site do banco, com o endereço visível na barra.</p>
          ) : (
            estado.conexoes.map((c) => <Conexao key={c.itemId} conexao={c} aoReautorizar={() => conectar(c.itemId)} />)
          )}
        </div>
      )}

      <div className={estilos.rodapeOpenFinance}>
        {estado.termo.aceitoEm && (
          <span>
            <BadgeCheck size={13} /> Termo {estado.termo.versaoAceita} aceito em {dataCurta(estado.termo.aceitoEm.slice(0, 10))}
          </span>
        )}
        <button type="button" onClick={() => setLendoTermo(true)}>
          Ver o termo
        </button>
        {ativo && !trocandoCredenciais && (
          <button type="button" onClick={() => setTrocandoCredenciais(true)}>
            Trocar credenciais
          </button>
        )}
        {(ativo || estado.termo.aceitoEm) && !desativando && (
          <button type="button" className={estilos.perigo} onClick={() => setDesativando(true)}>
            Desativar Open Finance
          </button>
        )}
      </div>

      {desativando && (
        <div className={estilos.confirmarDesativar}>
          <p>
            Isso desconecta todos os bancos (apagando as conexões na Pluggy) e revoga o seu aceite do termo. Contas e lançamentos já
            importados continuam no app.
          </p>
          <Marcador marcado={apagarCredenciais} aoAlterar={setApagarCredenciais}>
            Apagar também as credenciais da Pluggy deste computador
          </Marcador>
          <div className={estilos.acoesConfirmar}>
            <Botao variante="fantasma" onClick={() => setDesativando(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Power}
              onClick={async () => {
                let mensagem = ''
                const ok = await executar(async () => {
                  mensagem = (await openFinanceServico.desativar({ apagarCredenciais })).mensagem
                })
                if (ok) {
                  notificar('sucesso', mensagem)
                  setDesativando(false)
                }
              }}
            >
              Desativar
            </Botao>
          </div>
        </div>
      )}

      <ModalTermoOpenFinance aberto={termoAberto} aoFechar={() => setTermoAberto(false)} />
      <ModalTermoOpenFinance aberto={lendoTermo} aoFechar={() => setLendoTermo(false)} somenteLeitura />
    </Cartao>
  )
}

function FormularioCredenciais({
  criptografiaDisponivel,
  aoSalvar,
  aoCancelar
}: {
  criptografiaDisponivel: boolean
  aoSalvar: () => void
  aoCancelar?: () => void
}) {
  const executar = useAcao()
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [salvando, setSalvando] = useState(false)

  return (
    <div className={estilos.credenciais}>
      <ol className={estilos.passos}>
        <li>
          Crie a sua conta em <strong>dashboard.pluggy.ai</strong> e uma aplicação.
        </li>
        <li>
          Copie o <strong>Client ID</strong> e o <strong>Client Secret</strong> dela e cole abaixo.
        </li>
        <li>O app testa as credenciais com a Pluggy antes de guardar.</li>
      </ol>
      <div className={estilos.linha}>
        <Campo rotulo="Client ID" icone={KeyRound} autoComplete="off" spellCheck={false} value={clientId} onChange={(e) => setClientId(e.target.value)} />
        <Campo
          rotulo="Client Secret"
          icone={KeyRound}
          type="password"
          autoComplete="off"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
        />
      </div>
      <p className={estilos.notaSeguranca}>
        <ShieldCheck size={14} />{' '}
        {criptografiaDisponivel
          ? 'As duas ficam cifradas pelo cofre do sistema neste computador e nunca são mostradas de volta. Não as compartilhe com ninguém.'
          : 'A criptografia do sistema não está disponível agora; sem ela, o app não guarda as credenciais.'}
      </p>
      <div className={estilos.acoesConfirmar}>
        {aoCancelar && (
          <Botao variante="fantasma" onClick={aoCancelar}>
            Cancelar
          </Botao>
        )}
        <Botao
          icone={ShieldCheck}
          carregando={salvando}
          disabled={!clientId.trim() || !clientSecret.trim() || !criptografiaDisponivel}
          onClick={async () => {
            setSalvando(true)
            const ok = await executar(() => openFinanceServico.salvarCredenciais({ clientId, clientSecret }), 'Credenciais aceitas pela Pluggy e guardadas com segurança')
            setSalvando(false)
            if (ok) {
              setClientSecret('')
              aoSalvar()
            }
          }}
        >
          Testar e guardar
        </Botao>
      </div>
    </div>
  )
}

function Conexao({ conexao, aoReautorizar }: { conexao: ConexaoBancariaDTO; aoReautorizar: () => void }) {
  const executar = useAcao()
  const notificar = useNotificar()
  const [confirmando, setConfirmando] = useState(false)
  const situacao = SITUACOES[conexao.situacao]

  return (
    <div className={estilos.conexao}>
      <div className={estilos.cabecalhoConexao}>
        <span className={estilos.iconeBanco} style={{ background: conexao.cor ?? 'var(--primaria)' }}>
          <Building2 size={16} />
        </span>
        <div>
          <strong>{conexao.instituicao}</strong>
          <span>
            <i style={{ color: situacao.cor }}>{situacao.rotulo}</i> · desde {dataCurta(conexao.conectadoEm.slice(0, 10))}
            {conexao.mensagem && ` · ${conexao.mensagem}`}
          </span>
        </div>
        <div className={estilos.acoesConexao}>
          {conexao.situacao !== 'atualizada' && conexao.situacao !== 'atualizando' && (
            <Botao tamanho="p" variante="secundario" icone={RefreshCw} onClick={aoReautorizar}>
              Reautorizar
            </Botao>
          )}
          {confirmando ? (
            <>
              <Botao tamanho="p" variante="fantasma" onClick={() => setConfirmando(false)}>
                Manter
              </Botao>
              <Botao
                tamanho="p"
                variante="perigo"
                icone={Unplug}
                onClick={async () => {
                  let apagado = true
                  await executar(async () => {
                    apagado = (await openFinanceServico.desconectar(conexao.itemId)).apagadoNaPluggy
                  })
                  notificar(
                    apagado ? 'sucesso' : 'erro',
                    apagado
                      ? `${conexao.instituicao} desconectado e apagado na Pluggy.`
                      : `${conexao.instituicao} saiu do app, mas não foi possível apagar na Pluggy agora. Cancele também o consentimento no app do banco.`
                  )
                }}
              >
                Desconectar
              </Botao>
            </>
          ) : (
            <Botao tamanho="p" variante="fantasma" icone={Unplug} onClick={() => setConfirmando(true)}>
              Desconectar
            </Botao>
          )}
        </div>
      </div>
      <ul className={estilos.contasRemotas}>
        {conexao.contas.map((r) => (
          <ContaRemota key={r.id} remota={r} />
        ))}
      </ul>
    </div>
  )
}

function ContaRemota({ remota }: { remota: ContaRemotaDTO }) {
  const { dados: contas } = useContas()
  const { dados: pessoas } = usePessoas()
  const executar = useAcao()
  const cartao = remota.tipo === 'cartao'
  const valor = remota.contaId ?? ''

  return (
    <li className={classes(cartao && estilos.contaCartao)}>
      <div>
        <strong>
          {remota.nome}
          {remota.finalNumero && <small> · final {remota.finalNumero}</small>}
        </strong>
        <span>
          {cartao ? 'Cartão de crédito: ainda não importado (as compras ficam em Cartões)' : `Saldo no banco: ${formatarCentavos(remota.saldoCentavos)}`}
          {remota.ultimaSincronizacao && ` · sincronizada em ${dataCurta(remota.ultimaSincronizacao)}`}
        </span>
      </div>
      {!cartao && (
        <label className={estilos.vinculo}>
          <Link2 size={13} />
          <select
            value={valor}
            onChange={(e) => {
              const escolha = e.target.value
              const destino = !escolha
                ? null
                : escolha.startsWith('nova:')
                  ? { nova: { nome: remota.nome, pessoaId: escolha.slice(5) || null } }
                  : { contaId: escolha }
              void executar(() => openFinanceServico.vincular({ contaRemotaId: remota.id, destino }), destino ? 'Conta vinculada: use "Sincronizar" em Contas e saldos' : 'Esta conta não será importada')
            }}
          >
            <option value="">Não importar</option>
            {(contas ?? [])
              .filter((c) => c.ativa)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  Ligar a: {c.nome}
                </option>
              ))}
            <option value="nova:">Criar conta nova (da casa)</option>
            {(pessoas ?? []).map((p) => (
              <option key={p.id} value={`nova:${p.id}`}>
                Criar conta nova de {p.nome}
              </option>
            ))}
          </select>
        </label>
      )}
    </li>
  )
}

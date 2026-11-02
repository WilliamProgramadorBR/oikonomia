import { useEffect, useState } from 'react'
import { ExternalLink, KeyRound, Landmark, LockKeyhole, PlugZap, ShieldAlert, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, Wallet } from 'lucide-react'
import { AUTORIA } from '@compartilhado/constantes/autoria'
import type { TesteIADTO } from '@compartilhado/dtos/ia'
import { ContaSeguranca } from '../../componentes/acesso/ContaSeguranca'
import { useAcoesGlobais } from '../../componentes/layout/Layout'
import { Alternador } from '../../componentes/ui/Alternador'
import { Botao } from '../../componentes/ui/Botao'
import { Campo } from '../../componentes/ui/Campo'
import { Cartao } from '../../componentes/ui/Cartao'
import { Esqueleto, Etiqueta } from '../../componentes/ui/Elementos'
import { useConfiguracaoIA, usePerfil } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { useConsulta } from '../../hooks/useConsulta'
import { sistemaServico } from '../../servicos/sistemaServico'
import { iaServico } from '../../servicos/iaServico'
import { taxaServico } from '../../servicos/taxaServico'
import { classes } from '../../utilitarios/classes'
import { ESTILOS, PRIORIDADES_PERFIL } from '../../utilitarios/objetivos'
import estilos from './Configuracoes.module.css'

export function Configuracoes() {
  const { dados: configuracao } = useConfiguracaoIA()
  const { dados: perfil } = usePerfil()
  const { dados: sistema } = useConsulta(() => sistemaServico.situacao(), [])
  const { editarPerfil } = useAcoesGlobais()
  const executar = useAcao()

  const [chave, setChave] = useState('')
  const [modelo, setModelo] = useState('')
  const [usarNosTextos, setUsarNosTextos] = useState(true)
  const [teste, setTeste] = useState<TesteIADTO | null>(null)
  const [testando, setTestando] = useState(false)
  const [atualizandoTaxas, setAtualizandoTaxas] = useState(false)

  useEffect(() => {
    if (!configuracao) return
    setModelo(configuracao.modelo)
    setUsarNosTextos(configuracao.usarNosTextos)
  }, [configuracao])

  if (!configuracao) return <Esqueleto altura={400} />

  async function salvar(chaveNova?: string | null) {
    const ok = await executar(
      () => iaServico.salvarConfiguracao({ chave: chaveNova, modelo, usarNosTextos }),
      chaveNova === null ? 'Chave removida' : 'Configuração da IA salva'
    )
    if (ok) {
      setChave('')
      setTeste(null)
    }
  }

  async function testar() {
    setTestando(true)
    setTeste(await iaServico.testar().catch((e: Error) => ({ ok: false, mensagem: e.message })))
    setTestando(false)
  }

  return (
    <div className={estilos.pagina}>
      <ContaSeguranca />

      <Cartao
        titulo="Assistente com IA (Google Gemini)"
        subtitulo="Escreve os textos da saúde financeira, responde no chat e lê contracheques e notas"
        acao={
          configuracao.chaveConfigurada ? (
            <Etiqueta cor="var(--receita)">
              <ShieldCheck size={11} /> chave salva
            </Etiqueta>
          ) : (
            <Etiqueta cor="var(--texto-fraco)">sem chave: usando os textos do app</Etiqueta>
          )
        }
      >
        <div className={estilos.formulario}>
          <div className={estilos.linha}>
            <Campo
              rotulo="Chave da API do Gemini"
              icone={KeyRound}
              type="password"
              autoComplete="off"
              placeholder={configuracao.chaveConfigurada ? '•••••••• (cole outra para trocar)' : 'Cole aqui (começa com AIza...)'}
              value={chave}
              onChange={(e) => setChave(e.target.value)}
            />
            <Campo rotulo="Modelo" icone={Sparkles} value={modelo} onChange={(e) => setModelo(e.target.value)} />
          </div>

          <div className={estilos.opcao}>
            <div>
              <strong>Textos da saúde financeira pela IA</strong>
              <span>Os números continuam sendo calculados pelo app; a IA só escreve as explicações.</span>
            </div>
            <Alternador
              valor={usarNosTextos ? 'sim' : 'nao'}
              aoAlterar={(v) => setUsarNosTextos(v === 'sim')}
              opcoes={[
                { valor: 'sim', rotulo: 'Usar' },
                { valor: 'nao', rotulo: 'Não usar' }
              ]}
            />
          </div>

          <div className={estilos.acoes}>
            <Botao onClick={() => salvar(chave.trim() ? chave.trim() : undefined)}>Salvar</Botao>
            <Botao variante="secundario" icone={PlugZap} carregando={testando} disabled={!configuracao.chaveConfigurada} onClick={testar}>
              Testar conexão
            </Botao>
            {configuracao.chaveConfigurada && (
              <Botao variante="fantasma" icone={Trash2} onClick={() => salvar(null)}>
                Remover chave
              </Botao>
            )}
          </div>
          {teste && (
            <p className={classes(estilos.teste, teste.ok ? estilos.testeOk : estilos.testeErro)}>
              {teste.ok ? 'Funcionando: ' : 'Falhou: '}
              {teste.mensagem}
            </p>
          )}

          <ul className={estilos.notas}>
            <li>
              Crie uma chave gratuita no Google AI Studio: <strong>aistudio.google.com/apikey</strong>
            </li>
            <li>
              A chave fica <strong>criptografada pelo sistema operacional</strong> neste computador e nunca é exibida de volta.
              {!configuracao.criptografiaDisponivel && ' Atenção: a criptografia do sistema não está disponível agora.'}
            </li>
            <li>
              Ao usar a IA, um <strong>resumo dos seus números</strong> (e os documentos que você enviar) vai para o Google.
              Sem chave, tudo continua funcionando com os textos do próprio app.
            </li>
          </ul>
        </div>
      </Cartao>

      <div className={estilos.duasColunas}>
        <Cartao titulo="Perfil financeiro" subtitulo="Ajusta metas, margens e a ordem das recomendações">
          <div className={estilos.bloco}>
            {perfil && (
              <p>
                <strong>{ESTILOS[perfil.estilo].nome}</strong> · {PRIORIDADES_PERFIL[perfil.prioridade].nome} · rendimento de{' '}
                {perfil.rendimentoMensal.toLocaleString('pt-BR')}% ao mês
              </p>
            )}
            <Botao variante="secundario" icone={SlidersHorizontal} onClick={editarPerfil}>
              Ajustar perfil
            </Botao>
          </div>
        </Cartao>

        <Cartao titulo="Taxas do Banco Central" subtitulo="Atualizadas sozinhas ao abrir o app, uma vez por dia">
          <div className={estilos.bloco}>
            <p>Usadas nos cartões, nas dívidas e no simulador de crédito.</p>
            <Botao
              variante="secundario"
              icone={Landmark}
              carregando={atualizandoTaxas}
              onClick={async () => {
                setAtualizandoTaxas(true)
                await executar(() => taxaServico.atualizar(), 'Taxas atualizadas')
                setAtualizandoTaxas(false)
              }}
            >
              Atualizar agora
            </Botao>
          </div>
        </Cartao>
      </div>

      <Cartao titulo="Sobre" subtitulo="Projeto Financeiro: finanças da família, no seu computador">
        <div className={estilos.sobre}>
          <span className={estilos.sobreIcone}>
            <Wallet size={26} strokeWidth={2.2} />
          </span>
          <div className={estilos.sobreTexto}>
            <strong>Projeto Financeiro {sistema ? `v${sistema.versao}` : ''}</strong>
            <span>
              Criado por <strong>{AUTORIA.nome}</strong>
            </span>
            <a href={AUTORIA.site} target="_blank" rel="noreferrer" className={estilos.link}>
              {AUTORIA.site.replace(/^https:\/\//, '').replace(/\/$/, '')} <ExternalLink size={12} />
            </a>
          </div>
          {sistema &&
            (sistema.dadosCifrados ? (
              <div className={classes(estilos.cripto, estilos.criptoAtiva)}>
                <LockKeyhole size={18} />
                <div>
                  <strong>Dados criptografados</strong>
                  <span>AES-256-GCM, chave protegida pelo sistema operacional</span>
                </div>
              </div>
            ) : (
              <div className={estilos.cripto}>
                <ShieldAlert size={18} />
                <div>
                  <strong>Criptografia indisponível</strong>
                  <span>O cofre do sistema não respondeu; os dados estão sem criptografia.</span>
                </div>
              </div>
            ))}
        </div>
      </Cartao>
    </div>
  )
}

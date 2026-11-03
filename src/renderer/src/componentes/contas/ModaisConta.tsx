import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, FileUp, Info, ScanLine } from 'lucide-react'
import type { ContaDTO, LinhaImportacaoDTO, PreviaImportacaoDTO, SituacaoLinhaExtrato, TipoContaDTO } from '@compartilhado/dtos/conta'
import { hojeISO } from '@compartilhado/utilitarios/mes'
import { useCategorias, usePessoas, useTaxas } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { useNotificar } from '../../contextos/NotificacaoContexto'
import { contaServico } from '../../servicos/contaServico'
import { lerArquivo } from '../../servicos/iaServico'
import { classes } from '../../utilitarios/classes'
import { TIPOS_CONTA } from '../../utilitarios/contas'
import { dataCurta } from '../../utilitarios/datas'
import { formatarCentavos } from '../../utilitarios/moeda'
import { Marcador } from '../acesso/CamposAcesso'
import { CampoInstituicao } from '../cartoes/CampoInstituicao'
import { SeletorDestino } from '../transacoes/Seletores'
import { Alternador } from '../ui/Alternador'
import { Botao } from '../ui/Botao'
import { Campo, CampoMoeda } from '../ui/Campo'
import { Modal } from '../ui/Modal'
import estilos from './Contas.module.css'

// ===== Nova conta =====

export function ModalNovaConta({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { dados: pessoas } = usePessoas()
  const { dados: taxas } = useTaxas('cartao_parcelado')
  const executar = useAcao()
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoContaDTO>('corrente')
  const [instituicao, setInstituicao] = useState('')
  const [cnpj8, setCnpj8] = useState<string | null>(null)
  const [pessoaId, setPessoaId] = useState<string | null>(null)
  const [saldo, setSaldo] = useState(0)
  const [negativo, setNegativo] = useState(false)
  const [data, setData] = useState(hojeISO())
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!aberto) return
    setNome('')
    setTipo('corrente')
    setInstituicao('')
    setCnpj8(null)
    setPessoaId(pessoas?.[0]?.id ?? null)
    setSaldo(0)
    setNegativo(false)
    setData(hojeISO())
  }, [aberto, pessoas])

  async function salvar() {
    setSalvando(true)
    const ok = await executar(
      () =>
        contaServico.criar({
          nome: nome.trim() || (tipo === 'carteira' ? 'Carteira' : instituicao || TIPOS_CONTA[tipo].nome),
          tipo,
          instituicao: tipo === 'carteira' ? '' : instituicao,
          cnpj8: tipo === 'carteira' ? null : cnpj8,
          pessoaId,
          saldoCentavos: negativo ? -saldo : saldo,
          dataSaldo: data
        }),
      'Conta adicionada'
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Nova conta"
      descricao="Informe o saldo de hoje, como aparece no app do banco. Dali em diante o app acompanha."
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao carregando={salvando} onClick={salvar}>
            Adicionar conta
          </Botao>
        </>
      }
    >
      <div className={estilos.formulario}>
        <Alternador
          largo
          valor={tipo}
          aoAlterar={setTipo}
          opcoes={[
            { valor: 'corrente', rotulo: 'Corrente' },
            { valor: 'poupanca', rotulo: 'Poupança' },
            { valor: 'carteira', rotulo: 'Carteira' },
            { valor: 'investimento', rotulo: 'Investimento' }
          ]}
        />
        {tipo !== 'carteira' && (
          <CampoInstituicao
            valor={instituicao}
            instituicoes={taxas?.taxas ?? []}
            aoEscolher={(nomeBanco, cnpj) => {
              setInstituicao(nomeBanco)
              setCnpj8(cnpj)
            }}
          />
        )}
        <Campo
          rotulo="Nome (opcional)"
          placeholder={tipo === 'carteira' ? 'Ex.: Carteira da Ana' : 'Ex.: Conta salário, Conta da casa'}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <SeletorDestino pessoas={pessoas ?? []} valor={pessoaId} aoAlterar={setPessoaId} />
        <div className={estilos.linha}>
          <CampoMoeda rotulo="Saldo" centavos={saldo} aoAlterar={setSaldo} />
          <Campo rotulo="Saldo do dia" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <Marcador marcado={negativo} aoAlterar={setNegativo}>
          Saldo negativo (usando o cheque especial)
        </Marcador>
      </div>
    </Modal>
  )
}

// ===== Conferir saldo =====

export function ModalConferirSaldo({ conta, aoFechar }: { conta: ContaDTO | null; aoFechar: () => void }) {
  const notificar = useNotificar()
  const executar = useAcao()
  const [saldo, setSaldo] = useState(0)
  const [negativo, setNegativo] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!conta) return
    setSaldo(Math.abs(conta.saldoAtualCentavos))
    setNegativo(conta.saldoAtualCentavos < 0)
  }, [conta])

  if (!conta) return null
  const informado = negativo ? -saldo : saldo
  const diferenca = informado - conta.saldoAtualCentavos

  async function conferir() {
    setSalvando(true)
    let mensagem = ''
    const ok = await executar(async () => {
      mensagem = (await contaServico.conferir({ contaId: conta!.id, saldoCentavos: informado, data: hojeISO() })).mensagem
    })
    setSalvando(false)
    if (ok) {
      notificar('sucesso', mensagem)
      aoFechar()
    }
  }

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo={`Conferir saldo: ${conta.nome}`}
      descricao="Abra o app do banco e digite o saldo que aparece agora."
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao carregando={salvando} onClick={conferir}>
            Conferir
          </Botao>
        </>
      }
    >
      <div className={estilos.formulario}>
        <p className={estilos.calculado}>
          O app calcula <strong className="numero">{formatarCentavos(conta.saldoAtualCentavos)}</strong>
          {conta.referencia && <> a partir do saldo de {dataCurta(conta.referencia.data)} e {conta.movimentosDesdeReferencia} lançamento(s) desde então.</>}
        </p>
        <CampoMoeda destaque autoFocus centavos={saldo} aoAlterar={setSaldo} />
        <Marcador marcado={negativo} aoAlterar={setNegativo}>
          Saldo negativo
        </Marcador>
        {diferenca !== 0 && (
          <p className={estilos.diferenca}>
            <Info size={15} /> Diferença de {formatarCentavos(Math.abs(diferenca))} {diferenca > 0 ? 'a mais' : 'a menos'}. Conferindo, este
            passa a ser o saldo da conta.
          </p>
        )}
      </div>
    </Modal>
  )
}

// ===== Importar extrato =====

const SITUACOES: Record<SituacaoLinhaExtrato, { rotulo: string; cor: string }> = {
  nova: { rotulo: 'Nova', cor: 'var(--primaria)' },
  prevista: { rotulo: 'Confirma previsto', cor: 'var(--receita)' },
  ja_lancada: { rotulo: 'Já lançada', cor: 'var(--receita)' },
  ja_importada: { rotulo: 'Já importada', cor: 'var(--texto-fraco)' },
  fatura: { rotulo: 'Fatura do cartão', cor: 'var(--alerta)' },
  transferencia: { rotulo: 'Transferência', cor: 'var(--alerta)' }
}

export function ModalImportarExtrato({ conta, aoFechar }: { conta: ContaDTO | null; aoFechar: () => void }) {
  const { dados: categorias } = useCategorias()
  const notificar = useNotificar()
  const executar = useAcao()
  const [lendo, setLendo] = useState(false)
  const [previa, setPrevia] = useState<PreviaImportacaoDTO | null>(null)
  const [linhas, setLinhas] = useState<LinhaImportacaoDTO[]>([])
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    setPrevia(null)
    setLinhas([])
  }, [conta])

  const incluidas = useMemo(() => linhas.filter((l) => l.incluir), [linhas])
  const contagem = useMemo(() => {
    const mapa = new Map<SituacaoLinhaExtrato, number>()
    for (const l of linhas) mapa.set(l.situacao, (mapa.get(l.situacao) ?? 0) + 1)
    return [...mapa]
  }, [linhas])

  if (!conta) return null

  async function escolherArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    setLendo(true)
    try {
      const lida = await contaServico.lerExtrato({ contaId: conta!.id, arquivo: await lerArquivo(arquivo) })
      setPrevia(lida)
      setLinhas([...lida.linhas].sort((a, b) => b.data.localeCompare(a.data)))
    } catch (e) {
      notificar('erro', (e as Error).message)
    }
    setLendo(false)
  }

  const alterar = (chave: string, parcial: Partial<LinhaImportacaoDTO>) =>
    setLinhas((atuais) => atuais.map((l) => (l.chave === chave ? { ...l, ...parcial } : l)))
  const alterarProposta = (chave: string, parcial: Partial<LinhaImportacaoDTO['proposta']>) =>
    setLinhas((atuais) => atuais.map((l) => (l.chave === chave ? { ...l, proposta: { ...l.proposta, ...parcial } } : l)))

  async function importar() {
    if (!previa) return
    setSalvando(true)
    let mensagem = ''
    const ok = await executar(async () => {
      mensagem = (await contaServico.importarExtrato({ contaId: conta!.id, linhas: incluidas, saldoFinal: previa.saldoFinal })).mensagem
    })
    setSalvando(false)
    if (ok) {
      notificar('sucesso', mensagem)
      aoFechar()
    }
  }

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo={`Importar extrato: ${conta.nome}`}
      descricao={
        previa
          ? `${previa.formato.toUpperCase()} de ${dataCurta(previa.periodo.inicio)} a ${dataCurta(previa.periodo.fim)}. Revise e confirme.`
          : 'No app ou site do banco: Extrato → Exportar → OFX (melhor) ou CSV.'
      }
      rodape={
        previa ? (
          <>
            <Botao variante="fantasma" onClick={() => setPrevia(null)}>
              Outro arquivo
            </Botao>
            <Botao icone={FileUp} carregando={salvando} disabled={incluidas.length === 0 && !previa.saldoFinal} onClick={importar}>
              {incluidas.length > 0 ? `Importar ${incluidas.length} lançamento${incluidas.length === 1 ? '' : 's'}` : 'Atualizar saldo'}
            </Botao>
          </>
        ) : undefined
      }
    >
      {!previa ? (
        <label className={classes(estilos.areaArquivo, lendo && estilos.areaLendo)}>
          <input type="file" accept=".ofx,.qfx,.csv,.txt" onChange={escolherArquivo} disabled={lendo} hidden />
          <span className={estilos.areaIcone}>{lendo ? <ScanLine size={26} /> : <FileUp size={26} />}</span>
          <strong>{lendo ? 'Lendo o extrato...' : 'Escolher arquivo do extrato'}</strong>
          <span>OFX ou CSV · o app cruza com o que já está lançado antes de gravar</span>
        </label>
      ) : (
        <div className={estilos.previa}>
          <div className={estilos.resumoSituacoes}>
            {contagem.map(([situacao, quantidade]) => (
              <span key={situacao} style={{ color: SITUACOES[situacao].cor }}>
                {quantidade} {SITUACOES[situacao].rotulo.toLowerCase()}
              </span>
            ))}
          </div>
          {previa.saldoFinal && (
            <p className={estilos.saldoExtrato}>
              Saldo no extrato em {dataCurta(previa.saldoFinal.data)}: <strong className="numero">{formatarCentavos(previa.saldoFinal.valorCentavos)}</strong>. Ele
              passa a ser o saldo da conta.
            </p>
          )}
          <ul className={estilos.linhasExtrato}>
            {linhas.map((l) => {
              const entrou = l.valorCentavos > 0
              const editavel = l.situacao === 'nova'
              return (
                <li key={l.chave} className={classes(!l.incluir && estilos.linhaFora)}>
                  <input
                    type="checkbox"
                    checked={l.incluir}
                    onChange={(e) => alterar(l.chave, { incluir: e.target.checked })}
                    aria-label={`Incluir ${l.descricaoOriginal}`}
                  />
                  <span className={classes(estilos.sentido, entrou ? estilos.entrou : estilos.saiu)}>
                    {entrou ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                  </span>
                  <div className={estilos.linhaTexto}>
                    {editavel ? (
                      <input
                        className={estilos.descricaoEditavel}
                        value={l.proposta.descricao}
                        onChange={(e) => alterarProposta(l.chave, { descricao: e.target.value })}
                      />
                    ) : (
                      <strong>{l.proposta.descricao}</strong>
                    )}
                    <small title={l.explicacao}>
                      {dataCurta(l.data)} · {l.descricaoOriginal}
                    </small>
                  </div>
                  {editavel ? (
                    <select
                      className={estilos.categoria}
                      value={l.proposta.categoriaId}
                      onChange={(e) => alterarProposta(l.chave, { categoriaId: e.target.value })}
                    >
                      {(categorias ?? [])
                        .filter((c) => c.tipo === l.proposta.tipo)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <span className={estilos.situacao} style={{ color: SITUACOES[l.situacao].cor }} title={l.explicacao}>
                      {SITUACOES[l.situacao].rotulo}
                    </span>
                  )}
                  <strong className={classes('numero', estilos.valorLinha, entrou ? estilos.entrou : estilos.saiu)}>
                    {entrou ? '+' : '−'} {formatarCentavos(Math.abs(l.valorCentavos))}
                  </strong>
                </li>
              )
            })}
          </ul>
          <p className={estilos.notaExtrato}>
            <Info size={14} /> Fatura do cartão e transferências entre contas da família ficam de fora para não contar em dobro (você pode marcar se quiser).
            Passe o mouse sobre cada linha para ver o motivo.
          </p>
        </div>
      )}
    </Modal>
  )
}

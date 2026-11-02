import { useState, type ChangeEvent } from 'react'
import jsQR from 'jsqr'
import { CalendarDays, FileText, FileUp, Link2, PencilLine, QrCode, Receipt, ScanLine, Store } from 'lucide-react'
import type { ContrachequeLidoDTO, NotaFiscalLidaDTO } from '@compartilhado/dtos/importacao'
import { hojeISO, mesAtual } from '@compartilhado/utilitarios/mes'
import { SeletorCategoria, SeletorPessoa } from '../../componentes/transacoes/Seletores'
import { Alternador } from '../../componentes/ui/Alternador'
import { Botao } from '../../componentes/ui/Botao'
import { Campo, CampoMoeda, CampoSelecao } from '../../componentes/ui/Campo'
import { Cartao } from '../../componentes/ui/Cartao'
import { Etiqueta } from '../../componentes/ui/Elementos'
import { useNotificar } from '../../contextos/NotificacaoContexto'
import { useCartoes, useCategorias, useConfiguracaoIA, usePessoas } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { cartaoServico } from '../../servicos/cartaoServico'
import { importacaoServico, lerArquivo } from '../../servicos/iaServico'
import { transacaoServico } from '../../servicos/transacaoServico'
import { classes } from '../../utilitarios/classes'
import { formatarCentavos } from '../../utilitarios/moeda'
import estilos from './Importar.module.css'

type Aba = 'contracheque' | 'nota'

export function Importar() {
  const [aba, setAba] = useState<Aba>('contracheque')
  const { dados: configuracao } = useConfiguracaoIA()

  return (
    <div className={estilos.pagina}>
      <div className={estilos.topo}>
        <Alternador
          valor={aba}
          aoAlterar={setAba}
          opcoes={[
            { valor: 'contracheque', rotulo: 'Contracheque' },
            { valor: 'nota', rotulo: 'Nota fiscal (NFC-e)' }
          ]}
        />
        {configuracao && !configuracao.chaveConfigurada && (
          <span className={estilos.dica}>Sem IA configurada: o contracheque é preenchido à mão; a nota fiscal continua sendo lida pela SEFAZ.</span>
        )}
      </div>
      {aba === 'contracheque' ? <ImportarContracheque /> : <ImportarNota />}
    </div>
  )
}

// ===== Contracheque =====

interface FormularioContracheque {
  pessoaId: string
  competencia: string
  liquidoCentavos: number
  dataPagamento: string
  descricao: string
}

function ImportarContracheque() {
  const { dados: pessoas } = usePessoas()
  const executar = useAcao()
  const notificar = useNotificar()
  const [lendo, setLendo] = useState(false)
  const [lido, setLido] = useState<ContrachequeLidoDTO | null>(null)
  const [formulario, setFormulario] = useState<FormularioContracheque | null>(null)
  const [salvando, setSalvando] = useState(false)

  function abrirFormulario(dados: ContrachequeLidoDTO | null) {
    setLido(dados)
    setFormulario({
      pessoaId: pessoas?.[0]?.id ?? '',
      competencia: dados?.competencia ?? mesAtual(),
      liquidoCentavos: dados?.liquidoCentavos ?? 0,
      dataPagamento: dados?.dataPagamento ?? hojeISO(),
      descricao: dados?.empresa ? `Salário ${dados.empresa}` : 'Salário'
    })
  }

  async function aoEscolherArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    setLendo(true)
    try {
      abrirFormulario(await importacaoServico.lerContracheque(await lerArquivo(arquivo)))
    } catch (erro) {
      notificar('erro', (erro as Error).message)
    }
    setLendo(false)
  }

  async function lancar() {
    if (!formulario) return
    setSalvando(true)
    let mensagem = ''
    const ok = await executar(async () => {
      mensagem = (await importacaoServico.confirmarContracheque(formulario)).mensagem
    })
    setSalvando(false)
    if (ok) {
      notificar('sucesso', mensagem)
      setFormulario(null)
      setLido(null)
    }
  }

  const alterar = (parcial: Partial<FormularioContracheque>) => setFormulario((f) => (f ? { ...f, ...parcial } : f))

  if (!formulario) {
    return (
      <Cartao titulo="Enviar contracheque" subtitulo="PDF ou foto do papel. O líquido vira a receita do mês (ou confirma o salário previsto).">
        <label className={classes(estilos.areaArquivo, lendo && estilos.areaLendo)}>
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={aoEscolherArquivo} disabled={lendo} hidden />
          <span className={estilos.areaIcone}>{lendo ? <ScanLine size={26} /> : <FileUp size={26} />}</span>
          <strong>{lendo ? 'Lendo o contracheque...' : 'Clique para escolher o arquivo'}</strong>
          <span>PDF, JPG, PNG ou WEBP, até 15 MB</span>
        </label>
        <div className={estilos.alternativa}>
          <Botao variante="fantasma" icone={PencilLine} onClick={() => abrirFormulario(null)}>
            Preencher sem documento
          </Botao>
        </div>
      </Cartao>
    )
  }

  const somaDescontos = lido?.descontos.reduce((s, d) => s + d.valorCentavos, 0) ?? 0

  return (
    <div className={estilos.revisao}>
      <Cartao
        titulo="Conferir e lançar"
        subtitulo="Se houver salário previsto no mês, ele é confirmado com o valor real"
        acao={lido?.lidoPorIA ? <Etiqueta cor="var(--primaria)">lido pela IA</Etiqueta> : undefined}
      >
        <div className={estilos.formulario}>
          {lido?.aviso && <p className={estilos.aviso}>{lido.aviso}</p>}
          <SeletorPessoa pessoas={pessoas ?? []} valor={formulario.pessoaId} aoAlterar={(pessoaId) => alterar({ pessoaId })} rotulo="De quem é" />
          <CampoMoeda rotulo="Valor líquido" destaque centavos={formulario.liquidoCentavos} aoAlterar={(liquidoCentavos) => alterar({ liquidoCentavos })} />
          <div className={estilos.linha}>
            <Campo rotulo="Competência" icone={CalendarDays} type="month" value={formulario.competencia} onChange={(e) => alterar({ competencia: e.target.value })} />
            <Campo rotulo="Data do pagamento" type="date" value={formulario.dataPagamento} onChange={(e) => alterar({ dataPagamento: e.target.value })} />
          </div>
          <Campo rotulo="Descrição" value={formulario.descricao} onChange={(e) => alterar({ descricao: e.target.value })} />
          <div className={estilos.acoes}>
            <Botao variante="fantasma" onClick={() => setFormulario(null)}>
              Cancelar
            </Botao>
            <Botao carregando={salvando} disabled={!formulario.pessoaId || formulario.liquidoCentavos <= 0} onClick={lancar}>
              Lançar receita
            </Botao>
          </div>
        </div>
      </Cartao>

      {lido && (lido.salarioBrutoCentavos !== null || lido.descontos.length > 0) && (
        <Cartao titulo="Detalhes do documento" subtitulo={lido.empresa ?? undefined}>
          <ul className={estilos.itens}>
            {lido.salarioBrutoCentavos !== null && (
              <li className={estilos.itemDestaque}>
                <span>Salário bruto</span>
                <strong className="numero">{formatarCentavos(lido.salarioBrutoCentavos)}</strong>
              </li>
            )}
            {lido.descontos.map((d, i) => (
              <li key={i}>
                <span>{d.descricao}</span>
                <span className={classes('numero', estilos.desconto)}>− {formatarCentavos(d.valorCentavos)}</span>
              </li>
            ))}
            {somaDescontos > 0 && (
              <li className={estilos.itemDestaque}>
                <span>Total de descontos</span>
                <strong className={classes('numero', estilos.desconto)}>− {formatarCentavos(somaDescontos)}</strong>
              </li>
            )}
          </ul>
        </Cartao>
      )}
    </div>
  )
}

// ===== Nota fiscal =====

// Lê o QR code de uma foto; tenta em duas escalas porque fotos grandes ou pequenas demais falham.
async function lerQrDaImagem(arquivo: File): Promise<string | null> {
  const imagem = await createImageBitmap(arquivo)
  for (const maximo of [1600, 900, 2400]) {
    const escala = Math.min(1, maximo / Math.max(imagem.width, imagem.height))
    const largura = Math.round(imagem.width * escala)
    const altura = Math.round(imagem.height * escala)
    const canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura
    const contexto = canvas.getContext('2d')
    if (!contexto) return null
    contexto.drawImage(imagem, 0, 0, largura, altura)
    const codigo = jsQR(contexto.getImageData(0, 0, largura, altura).data, largura, altura)
    if (codigo?.data) return codigo.data
  }
  return null
}

const ORIGENS: Record<NotaFiscalLidaDTO['origem'], { rotulo: string; cor: string }> = {
  sefaz: { rotulo: 'lida na SEFAZ', cor: 'var(--receita)' },
  ia: { rotulo: 'lida pela IA', cor: 'var(--primaria)' },
  chave: { rotulo: 'só a chave de acesso', cor: 'var(--alerta)' }
}

interface FormularioNota {
  descricao: string
  estabelecimento: string
  data: string
  valorCentavos: number
  categoriaId: string
  pessoaId: string
  forma: 'conta' | 'cartao'
  cartaoId: string
  parcelas: number
}

function ImportarNota() {
  const { dados: pessoas } = usePessoas()
  const { dados: categorias } = useCategorias()
  const { dados: cartoes } = useCartoes()
  const executar = useAcao()
  const notificar = useNotificar()
  const [endereco, setEndereco] = useState('')
  const [lendo, setLendo] = useState(false)
  const [nota, setNota] = useState<NotaFiscalLidaDTO | null>(null)
  const [formulario, setFormulario] = useState<FormularioNota | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function ler(url: string) {
    if (!url.trim()) return
    setLendo(true)
    try {
      const lida = await importacaoServico.lerNotaFiscal(url)
      setNota(lida)
      setFormulario({
        descricao: lida.emitente && lida.origem !== 'chave' ? `Compra em ${lida.emitente}` : 'Compra',
        estabelecimento: lida.origem !== 'chave' ? (lida.emitente ?? '') : '',
        data: lida.data ?? hojeISO(),
        valorCentavos: lida.totalCentavos ?? 0,
        categoriaId: lida.categoriaSugeridaId ?? '',
        pessoaId: pessoas?.[0]?.id ?? '',
        forma: 'conta',
        cartaoId: cartoes?.[0]?.id ?? '',
        parcelas: 1
      })
    } catch (erro) {
      notificar('erro', (erro as Error).message)
    }
    setLendo(false)
  }

  async function aoEscolherFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    const conteudo = await lerQrDaImagem(arquivo).catch(() => null)
    if (!conteudo) {
      notificar('erro', 'Não encontrei um QR code na foto. Tente uma imagem mais nítida e bem enquadrada.')
      return
    }
    setEndereco(conteudo)
    await ler(conteudo)
  }

  async function lancar() {
    if (!formulario) return
    setSalvando(true)
    const f = formulario
    const ok =
      f.forma === 'cartao'
        ? await executar(
            () =>
              cartaoServico.criarCompra({
                cartaoId: f.cartaoId,
                descricao: f.descricao,
                valorCentavos: f.valorCentavos,
                quantidadeParcelas: f.parcelas,
                taxaMensal: 0,
                dataCompra: f.data,
                categoriaId: f.categoriaId,
                pessoaId: f.pessoaId,
                estabelecimento: f.estabelecimento
              }),
            f.parcelas > 1 ? `Compra em ${f.parcelas}x registrada no cartão` : 'Compra registrada no cartão'
          )
        : await executar(
            () =>
              transacaoServico.criar({
                descricao: f.descricao,
                valorCentavos: f.valorCentavos,
                tipo: 'despesa',
                data: f.data,
                pessoaId: f.pessoaId,
                categoriaId: f.categoriaId,
                estabelecimento: f.estabelecimento
              }),
            'Despesa lançada'
          )
    setSalvando(false)
    if (ok) {
      setNota(null)
      setFormulario(null)
      setEndereco('')
    }
  }

  const alterar = (parcial: Partial<FormularioNota>) => setFormulario((atual) => (atual ? { ...atual, ...parcial } : atual))

  if (!nota || !formulario) {
    return (
      <Cartao titulo="Ler nota fiscal do consumidor" subtitulo="Use o QR code impresso no rodapé da NFC-e">
        <div className={estilos.formulario}>
          <label className={classes(estilos.areaArquivo, lendo && estilos.areaLendo)}>
            <input type="file" accept="image/*" onChange={aoEscolherFoto} disabled={lendo} hidden />
            <span className={estilos.areaIcone}>{lendo ? <ScanLine size={26} /> : <QrCode size={26} />}</span>
            <strong>{lendo ? 'Consultando a nota...' : 'Enviar foto do QR code'}</strong>
            <span>O app lê o código e consulta a nota no site da SEFAZ</span>
          </label>
          <div className={estilos.ou}>ou cole o link do QR code</div>
          <div className={estilos.linhaLink}>
            <Campo icone={Link2} placeholder="https://www.sefaz...nfce/qrcode?p=..." value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            <Botao icone={Receipt} carregando={lendo} disabled={!endereco.trim()} onClick={() => ler(endereco)}>
              Ler nota
            </Botao>
          </div>
        </div>
      </Cartao>
    )
  }

  const origem = ORIGENS[nota.origem]
  const temCartoes = (cartoes?.length ?? 0) > 0

  return (
    <div className={estilos.revisao}>
      <Cartao titulo="Conferir e lançar" subtitulo="Ajuste o que precisar antes de salvar" acao={<Etiqueta cor={origem.cor}>{origem.rotulo}</Etiqueta>}>
        <div className={estilos.formulario}>
          {nota.aviso && <p className={estilos.aviso}>{nota.aviso}</p>}
          <CampoMoeda rotulo="Total" destaque centavos={formulario.valorCentavos} aoAlterar={(valorCentavos) => alterar({ valorCentavos })} />
          <Campo rotulo="Descrição" value={formulario.descricao} onChange={(e) => alterar({ descricao: e.target.value })} />
          <div className={estilos.linha}>
            <Campo rotulo="Onde comprou" icone={Store} value={formulario.estabelecimento} onChange={(e) => alterar({ estabelecimento: e.target.value })} />
            <Campo rotulo="Data" type="date" value={formulario.data} onChange={(e) => alterar({ data: e.target.value })} />
          </div>
          <SeletorCategoria
            categorias={(categorias ?? []).filter((c) => c.tipo === 'despesa')}
            valor={formulario.categoriaId}
            aoAlterar={(categoriaId) => alterar({ categoriaId })}
          />
          <SeletorPessoa pessoas={pessoas ?? []} valor={formulario.pessoaId} aoAlterar={(pessoaId) => alterar({ pessoaId })} />

          <div className={estilos.pagamento}>
            <span className={estilos.rotulo}>Como pagou</span>
            <Alternador
              valor={formulario.forma}
              aoAlterar={(forma) => alterar({ forma })}
              opcoes={[
                { valor: 'conta', rotulo: 'Débito / Pix / dinheiro' },
                ...(temCartoes ? [{ valor: 'cartao' as const, rotulo: 'Cartão de crédito' }] : [])
              ]}
            />
          </div>
          {formulario.forma === 'cartao' && (
            <div className={estilos.linha}>
              <CampoSelecao rotulo="Cartão" value={formulario.cartaoId} onChange={(e) => alterar({ cartaoId: e.target.value })}>
                {cartoes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.apelido}
                  </option>
                ))}
              </CampoSelecao>
              <CampoSelecao rotulo="Parcelas (sem juros)" value={formulario.parcelas} onChange={(e) => alterar({ parcelas: Number(e.target.value) })}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? 'À vista (1x)' : `${n}x`}
                  </option>
                ))}
              </CampoSelecao>
            </div>
          )}

          <div className={estilos.acoes}>
            <Botao variante="fantasma" onClick={() => setNota(null)}>
              Cancelar
            </Botao>
            <Botao
              carregando={salvando}
              disabled={formulario.valorCentavos <= 0 || !formulario.categoriaId || !formulario.pessoaId || !formulario.descricao.trim()}
              onClick={lancar}
            >
              Lançar compra
            </Botao>
          </div>
        </div>
      </Cartao>

      <Cartao titulo="Itens da nota" subtitulo={nota.cnpj ? `CNPJ ${nota.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}` : undefined}>
        {nota.itens.length === 0 ? (
          <p className={estilos.semItens}>
            <FileText size={16} /> A lista de itens não está disponível para esta nota.
          </p>
        ) : (
          <ul className={estilos.itens}>
            {nota.itens.map((item, i) => (
              <li key={i}>
                <span>
                  {item.descricao}
                  {item.quantidade !== 1 && <em> × {item.quantidade.toLocaleString('pt-BR')}</em>}
                </span>
                <span className="numero">{formatarCentavos(item.valorCentavos)}</span>
              </li>
            ))}
            {nota.totalCentavos !== null && (
              <li className={estilos.itemDestaque}>
                <span>Total pago</span>
                <strong className="numero">{formatarCentavos(nota.totalCentavos)}</strong>
              </li>
            )}
          </ul>
        )}
      </Cartao>
    </div>
  )
}

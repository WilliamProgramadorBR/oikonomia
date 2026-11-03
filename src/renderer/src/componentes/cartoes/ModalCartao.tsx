import { useEffect, useState, type FormEvent } from 'react'
import { Percent } from 'lucide-react'
import { useVisao } from '../../contextos/VisaoContexto'
import { usePessoas, useTaxas } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { cartaoServico } from '../../servicos/cartaoServico'
import { PALETA } from '../../utilitarios/cores'
import { marcaDe } from '../../utilitarios/bancos'
import { nomeInstituicao } from '../../utilitarios/instituicoes'
import { formatarTaxa } from '../../utilitarios/moeda'
import { SeletorPessoa } from '../transacoes/Seletores'
import { Botao } from '../ui/Botao'
import { Campo, CampoMoeda, SeletorCor } from '../ui/Campo'
import { Modal } from '../ui/Modal'
import { CampoInstituicao } from './CampoInstituicao'
import { CartaoVisual } from './CartaoVisual'
import estilos from './Cartoes.module.css'

const paraNumero = (texto: string) => Number(texto.replace(',', '.'))

export function ModalCartao({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { pessoaId: pessoaDaVisao } = useVisao()
  const { dados: pessoas } = usePessoas()
  const { dados: taxas } = useTaxas('cartao_parcelado')
  const executar = useAcao()

  const [apelido, setApelido] = useState('')
  const [instituicao, setInstituicao] = useState('')
  const [cnpj8, setCnpj8] = useState<string | null>(null)
  const [limiteCentavos, setLimiteCentavos] = useState(0)
  const [diaFechamento, setDiaFechamento] = useState('')
  const [diaVencimento, setDiaVencimento] = useState('')
  const [pessoaEscolhida, setPessoaEscolhida] = useState('')
  const [cor, setCor] = useState(PALETA[0])
  const [taxaContrato, setTaxaContrato] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!aberto) return
    setApelido('')
    setInstituicao('')
    setCnpj8(null)
    setLimiteCentavos(0)
    setDiaFechamento('')
    setDiaVencimento('')
    setPessoaEscolhida('')
    setCor(PALETA[0])
    setTaxaContrato('')
  }, [aberto])

  const pessoaId = pessoaEscolhida || pessoaDaVisao || pessoas?.[0]?.id || ''
  const titular = pessoas?.find((p) => p.id === pessoaId)
  const taxaMercado = taxas?.taxas.find((t) => t.cnpj8 === cnpj8)
  const marca = marcaDe(instituicao, cnpj8)

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    const ok = await executar(
      () =>
        cartaoServico.criar({
          apelido,
          instituicao,
          cnpj8,
          limiteCentavos,
          diaFechamento: Number(diaFechamento),
          diaVencimento: Number(diaVencimento),
          pessoaId,
          cor: marca?.fundo[0] ?? cor,
          taxaContratoMensal: taxaContrato.trim() ? paraNumero(taxaContrato) : null
        }),
      'Cartão cadastrado'
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Novo cartão de crédito"
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-cartao" carregando={salvando}>
            Salvar cartão
          </Botao>
        </>
      }
    >
      <form id="formulario-cartao" className={estilos.formulario} onSubmit={salvar}>
        <div className={estilos.previaCartao}>
          <CartaoVisual apelido={apelido} instituicao={instituicao} cnpj8={cnpj8} cor={cor} titular={titular?.nome} />
        </div>

        <Campo
          rotulo="Apelido"
          placeholder="Ex.: Roxinho, Cartão da casa"
          autoFocus
          value={apelido}
          onChange={(e) => setApelido(e.target.value)}
        />

        <CampoInstituicao
          valor={instituicao}
          instituicoes={taxas?.taxas ?? []}
          aoEscolher={(nome, cnpj) => {
            setInstituicao(nome)
            setCnpj8(cnpj)
          }}
        />

        <CampoMoeda rotulo="Limite" centavos={limiteCentavos} aoAlterar={setLimiteCentavos} />

        <div className={estilos.linha}>
          <Campo
            rotulo="Dia do fechamento"
            type="number"
            min={1}
            max={31}
            placeholder="Ex.: 3"
            value={diaFechamento}
            onChange={(e) => setDiaFechamento(e.target.value)}
          />
          <Campo
            rotulo="Dia do vencimento"
            type="number"
            min={1}
            max={31}
            placeholder="Ex.: 10"
            value={diaVencimento}
            onChange={(e) => setDiaVencimento(e.target.value)}
          />
        </div>

        <SeletorPessoa
          rotulo="Titular"
          pessoas={pessoas ?? []}
          valor={pessoaId}
          aoAlterar={setPessoaEscolhida}
        />

        {marca ? (
          <p className={estilos.dica}>Visual do {marca.nome} aplicado ao cartão.</p>
        ) : (
          <SeletorCor rotulo="Cor do cartão" cores={PALETA} valor={cor} aoAlterar={setCor} />
        )}

        <div>
          <Campo
            rotulo="Taxa de juros do seu contrato (opcional)"
            icone={Percent}
            inputMode="decimal"
            placeholder={taxaMercado ? `Média do banco: ${taxaMercado.taxaMensal}` : 'Ex.: 8,9'}
            value={taxaContrato}
            onChange={(e) => setTaxaContrato(e.target.value)}
          />
          <p className={estilos.dica}>
            {taxaMercado
              ? `Média do ${nomeInstituicao(taxaMercado.instituicao)} no Banco Central: ${formatarTaxa(taxaMercado.taxaMensal)} no parcelado. Informe a sua se souber, ela tem prioridade.`
              : 'Se souber a taxa da sua fatura, informe em % ao mês. Sem ela, usamos a média do banco.'}
          </p>
        </div>
      </form>
    </Modal>
  )
}

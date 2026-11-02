import { useEffect, useState, type FormEvent } from 'react'
import type { ObjetivoDTO } from '@compartilhado/dtos/objetivo'
import { hojeISO } from '@compartilhado/utilitarios/mes'
import { useVisao } from '../../contextos/VisaoContexto'
import { usePessoas } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { objetivoServico } from '../../servicos/objetivoServico'
import { formatarCentavos } from '../../utilitarios/moeda'
import { SeletorPessoa } from '../transacoes/Seletores'
import { Botao } from '../ui/Botao'
import { Campo, CampoMoeda } from '../ui/Campo'
import { Modal } from '../ui/Modal'
import estilos from './Objetivos.module.css'

interface PropsModalAporte {
  objetivo: ObjetivoDTO | null
  aoFechar: () => void
}

export function ModalAporte({ objetivo, aoFechar }: PropsModalAporte) {
  const { pessoaId: pessoaDaVisao } = useVisao()
  const { dados: pessoas } = usePessoas()
  const executar = useAcao()
  const [valor, setValor] = useState(0)
  const [data, setData] = useState(hojeISO())
  const [pessoaEscolhida, setPessoaEscolhida] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!objetivo) return
    setValor(objetivo.plano.aporteSugerido)
    setData(hojeISO())
    setPessoaEscolhida('')
  }, [objetivo])

  if (!objetivo) return null
  const pessoaId = pessoaEscolhida || pessoaDaVisao || pessoas?.[0]?.id || ''
  const falta = Math.max(0, objetivo.valorAlvoCentavos - objetivo.valorAtualCentavos)

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    const ok = await executar(
      () => objetivoServico.aportar({ objetivoId: objetivo!.id, valorCentavos: valor, data, pessoaId }),
      `${formatarCentavos(valor)} guardados para "${objetivo!.nome}"`
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo={`Guardar para: ${objetivo.nome}`}
      descricao={`Faltam ${formatarCentavos(falta)}. O valor entra como "guardado" (não conta como gasto).`}
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-aporte" carregando={salvando}>
            Guardar
          </Botao>
        </>
      }
    >
      <form id="formulario-aporte" className={estilos.formulario} onSubmit={salvar}>
        <CampoMoeda destaque autoFocus centavos={valor} aoAlterar={setValor} />
        <Campo rotulo="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        <SeletorPessoa rotulo="Quem guardou" pessoas={pessoas ?? []} valor={pessoaId} aoAlterar={setPessoaEscolhida} />
      </form>
    </Modal>
  )
}

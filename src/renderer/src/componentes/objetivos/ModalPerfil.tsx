import { useEffect, useState, type FormEvent } from 'react'
import { Percent } from 'lucide-react'
import type { EstiloPerfil, PrioridadePerfil } from '@compartilhado/dtos/perfil'
import { usePerfil } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { perfilServico } from '../../servicos/objetivoServico'
import { classes } from '../../utilitarios/classes'
import { ESTILOS, PRIORIDADES_PERFIL, RENDIMENTO_SUGERIDO } from '../../utilitarios/objetivos'
import { Botao } from '../ui/Botao'
import { Campo } from '../ui/Campo'
import { Modal } from '../ui/Modal'
import estilos from './Objetivos.module.css'

const paraNumero = (texto: string) => Number(texto.replace(',', '.'))

// Duas perguntas que ajustam metas, margens e a ordem das recomendações.
export function ModalPerfil({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { dados: perfil } = usePerfil()
  const executar = useAcao()
  const [estilo, setEstilo] = useState<EstiloPerfil>('equilibrado')
  const [prioridade, setPrioridade] = useState<PrioridadePerfil>('equilibrio')
  const [rendimento, setRendimento] = useState('0,9')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!aberto || !perfil) return
    setEstilo(perfil.estilo)
    setPrioridade(perfil.prioridade)
    setRendimento(String(perfil.rendimentoMensal).replace('.', ','))
  }, [aberto, perfil])

  function escolherEstilo(novo: EstiloPerfil) {
    setEstilo(novo)
    if (!perfil?.definido) setRendimento(String(RENDIMENTO_SUGERIDO[novo]).replace('.', ','))
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    const ok = await executar(
      () => perfilServico.salvar({ estilo, prioridade, rendimentoMensal: paraNumero(rendimento) }),
      'Perfil salvo. Metas e recomendações foram ajustadas.'
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Perfil financeiro da família"
      descricao="Cada família tem um jeito de lidar com dinheiro. Isso muda as metas e a ordem das recomendações."
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-perfil" carregando={salvando}>
            Salvar perfil
          </Botao>
        </>
      }
    >
      <form id="formulario-perfil" className={estilos.formulario} onSubmit={salvar}>
        <div className={estilos.pergunta}>
          <span className={estilos.rotulo}>1. Qual frase combina mais com vocês?</span>
          {(Object.keys(ESTILOS) as EstiloPerfil[]).map((chave) => (
            <button
              key={chave}
              type="button"
              className={classes(estilos.opcaoPerfil, estilo === chave && estilos.opcaoPerfilAtiva)}
              onClick={() => escolherEstilo(chave)}
            >
              <strong>{ESTILOS[chave].nome}</strong>
              <span>{ESTILOS[chave].frase}</span>
            </button>
          ))}
        </div>

        <div className={estilos.pergunta}>
          <span className={estilos.rotulo}>2. Sobrando dinheiro no mês, o que vem primeiro?</span>
          {(Object.keys(PRIORIDADES_PERFIL) as PrioridadePerfil[]).map((chave) => (
            <button
              key={chave}
              type="button"
              className={classes(estilos.opcaoPerfil, prioridade === chave && estilos.opcaoPerfilAtiva)}
              onClick={() => setPrioridade(chave)}
            >
              <strong>{PRIORIDADES_PERFIL[chave].nome}</strong>
              <span>{PRIORIDADES_PERFIL[chave].frase}</span>
            </button>
          ))}
        </div>

        <div>
          <Campo
            rotulo="Quanto o dinheiro guardado rende por mês (estimativa)"
            icone={Percent}
            inputMode="decimal"
            value={rendimento}
            onChange={(e) => setRendimento(e.target.value)}
          />
          <p className={estilos.dica}>
            Usado para projetar os objetivos. Aplicações conservadoras (CDB, Tesouro Selic) costumam
            render perto de 1% ao mês hoje; use um valor um pouco abaixo para ficar do lado seguro.
          </p>
        </div>
      </form>
    </Modal>
  )
}

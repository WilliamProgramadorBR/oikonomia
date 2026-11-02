import { useEffect, useState, type FormEvent } from 'react'
import type { PessoaDTO } from '@compartilhado/dtos/pessoa'
import { Botao } from '../../componentes/ui/Botao'
import { Campo, SeletorCor } from '../../componentes/ui/Campo'
import { Avatar } from '../../componentes/ui/Elementos'
import { Modal } from '../../componentes/ui/Modal'
import { useAcao } from '../../hooks/useAcao'
import { pessoaServico } from '../../servicos/pessoaServico'
import { PALETA } from '../../utilitarios/cores'
import estilos from './Familia.module.css'

interface PropsModalPessoa {
  aberto: boolean
  aoFechar: () => void
  pessoa: PessoaDTO | null // null = nova pessoa
  corSugerida: string
}

export function ModalPessoa({ aberto, aoFechar, pessoa, corSugerida }: PropsModalPessoa) {
  const executar = useAcao()
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState(PALETA[0])
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!aberto) return
    setNome(pessoa?.nome ?? '')
    setCor(pessoa?.cor ?? corSugerida)
  }, [aberto, pessoa, corSugerida])

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    const ok = await executar(
      () =>
        pessoa
          ? pessoaServico.atualizar({ id: pessoa.id, nome, cor })
          : pessoaServico.criar({ nome, cor }),
      pessoa ? 'Dados atualizados' : `${nome.trim()} entrou para a família`
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={pessoa ? 'Editar pessoa' : 'Adicionar pessoa'}
      descricao="A cor identifica a pessoa nos gráficos e na lista de lançamentos."
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-pessoa" carregando={salvando}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="formulario-pessoa" className={estilos.formulario} onSubmit={salvar}>
        <div className={estilos.previa}>
          <Avatar nome={nome || '?'} cor={cor} tamanho={64} />
        </div>
        <Campo
          rotulo="Nome"
          placeholder="Ex.: Maria"
          autoFocus
          maxLength={40}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <SeletorCor rotulo="Cor" cores={PALETA} valor={cor} aoAlterar={setCor} />
      </form>
    </Modal>
  )
}

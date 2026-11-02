import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { NOMES_NATUREZAS, type NaturezaDespesa } from '@compartilhado/dtos/categoria'
import type { TipoTransacaoDTO } from '@compartilhado/dtos/transacao'
import { Alternador } from '../../componentes/ui/Alternador'
import { Botao } from '../../componentes/ui/Botao'
import { Campo, SeletorCor } from '../../componentes/ui/Campo'
import { Modal } from '../../componentes/ui/Modal'
import { useAcao } from '../../hooks/useAcao'
import { categoriaServico } from '../../servicos/categoriaServico'
import { classes } from '../../utilitarios/classes'
import { PALETA } from '../../utilitarios/cores'
import { ICONES } from '../../utilitarios/icones'
import estilos from './Categorias.module.css'

interface PropsModalCategoria {
  aberto: boolean
  aoFechar: () => void
  tipoInicial: TipoTransacaoDTO
}

export function ModalCategoria({ aberto, aoFechar, tipoInicial }: PropsModalCategoria) {
  const executar = useAcao()
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoTransacaoDTO>(tipoInicial)
  const [cor, setCor] = useState(PALETA[0])
  const [icone, setIcone] = useState('outros')
  const [natureza, setNatureza] = useState<NaturezaDespesa>('essencial')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!aberto) return
    setNome('')
    setTipo(tipoInicial)
    setCor(PALETA[0])
    setIcone('outros')
    setNatureza('essencial')
  }, [aberto, tipoInicial])

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    const ok = await executar(
      () =>
        categoriaServico.criar({
          nome,
          tipo,
          natureza: tipo === 'despesa' ? natureza : null,
          cor,
          icone
        }),
      'Categoria criada'
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Nova categoria"
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-categoria" carregando={salvando}>
            Criar categoria
          </Botao>
        </>
      }
    >
      <form id="formulario-categoria" className={estilos.formulario} onSubmit={salvar}>
        <Alternador
          largo
          valor={tipo}
          aoAlterar={setTipo}
          opcoes={[
            { valor: 'despesa', rotulo: 'Despesa', cor: 'var(--despesa)' },
            { valor: 'receita', rotulo: 'Receita', cor: 'var(--receita)' },
            { valor: 'guardado', rotulo: 'Guardar', cor: 'var(--primaria)' }
          ]}
        />
        <Campo
          rotulo="Nome"
          placeholder="Ex.: Farmácia"
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        {tipo === 'despesa' && (
          <div className={estilos.blocoIcones}>
            <span className={estilos.rotulo}>Natureza do gasto</span>
            <div className={estilos.naturezas}>
              {(Object.keys(NOMES_NATUREZAS) as NaturezaDespesa[]).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={classes(estilos.natureza, n === natureza && estilos.naturezaAtiva)}
                  onClick={() => setNatureza(n)}
                >
                  {NOMES_NATUREZAS[n]}
                </button>
              ))}
            </div>
          </div>
        )}
        <SeletorCor rotulo="Cor" cores={PALETA} valor={cor} aoAlterar={setCor} />

        <div className={estilos.blocoIcones}>
          <span className={estilos.rotulo}>Ícone</span>
          <div className={estilos.icones} style={{ '--cor': cor } as CSSProperties}>
            {Object.entries(ICONES).map(([chave, Icone]) => (
              <button
                key={chave}
                type="button"
                aria-label={chave}
                className={classes(estilos.icone, chave === icone && estilos.iconeAtivo)}
                onClick={() => setIcone(chave)}
              >
                <Icone size={18} />
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  )
}

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { NOMES_NATUREZAS, type CategoriaDTO } from '@compartilhado/dtos/categoria'
import type { TipoTransacaoDTO } from '@compartilhado/dtos/transacao'
import { Botao } from '../../componentes/ui/Botao'
import { Cartao } from '../../componentes/ui/Cartao'
import { Esqueleto, IconeCategoria } from '../../componentes/ui/Elementos'
import { useCategorias } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { categoriaServico } from '../../servicos/categoriaServico'
import estilos from './Categorias.module.css'
import { ModalCategoria } from './ModalCategoria'

const SECOES: { tipo: TipoTransacaoDTO; titulo: string; subtitulo: string }[] = [
  { tipo: 'despesa', titulo: 'Despesas', subtitulo: 'Para onde o dinheiro vai, e que retorno traz' },
  { tipo: 'receita', titulo: 'Receitas', subtitulo: 'De onde o dinheiro vem' },
  { tipo: 'guardado', titulo: 'Guardar', subtitulo: 'Para onde vai o que é poupado' }
]

export function Categorias() {
  const { dados: categorias } = useCategorias()
  const executar = useAcao()
  const [modalTipo, setModalTipo] = useState<TipoTransacaoDTO | null>(null)

  const remover = (categoria: CategoriaDTO) =>
    executar(() => categoriaServico.remover(categoria.id), `"${categoria.nome}" removida`)

  return (
    <>
      <div className={estilos.colunas}>
        {SECOES.map(({ tipo, titulo, subtitulo }) => (
          <Cartao
            key={tipo}
            titulo={titulo}
            subtitulo={subtitulo}
            className={tipo === 'despesa' ? estilos.largo : undefined}
            acao={
              <Botao variante="secundario" tamanho="p" icone={Plus} onClick={() => setModalTipo(tipo)}>
                Nova
              </Botao>
            }
          >
            <ul className={estilos.lista}>
              {!categorias
                ? [1, 2, 3, 4].map((n) => <Esqueleto key={n} altura={52} />)
                : categorias
                    .filter((c) => c.tipo === tipo)
                    .map((categoria) => (
                      <li key={categoria.id} className={estilos.item}>
                        <IconeCategoria icone={categoria.icone} cor={categoria.cor} tamanho={34} />
                        <span className={estilos.nome}>
                          {categoria.nome}
                          {categoria.natureza && (
                            <small className={estilos[categoria.natureza]}>
                              {NOMES_NATUREZAS[categoria.natureza]}
                            </small>
                          )}
                        </span>
                        <button
                          className={estilos.remover}
                          aria-label={`Remover ${categoria.nome}`}
                          onClick={() => remover(categoria)}
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
            </ul>
          </Cartao>
        ))}
      </div>

      <ModalCategoria
        aberto={modalTipo !== null}
        aoFechar={() => setModalTipo(null)}
        tipoInicial={modalTipo ?? 'despesa'}
      />
    </>
  )
}

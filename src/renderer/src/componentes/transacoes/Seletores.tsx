import type { CSSProperties } from 'react'
import type { CategoriaDTO } from '@compartilhado/dtos/categoria'
import type { PessoaDTO } from '@compartilhado/dtos/pessoa'
import { classes } from '../../utilitarios/classes'
import { Avatar, IconeCategoria } from '../ui/Elementos'
import estilos from './Transacoes.module.css'

interface PropsSeletorCategoria {
  categorias: CategoriaDTO[]
  valor: string
  aoAlterar: (id: string) => void
}

export function SeletorCategoria({ categorias, valor, aoAlterar }: PropsSeletorCategoria) {
  return (
    <div className={estilos.bloco}>
      <span className={estilos.rotuloBloco}>Categoria</span>
      <div className={estilos.gradeCategorias}>
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            type="button"
            className={classes(estilos.opcaoCategoria, categoria.id === valor && estilos.opcaoAtiva)}
            style={{ '--cor': categoria.cor } as CSSProperties}
            onClick={() => aoAlterar(categoria.id)}
          >
            <IconeCategoria icone={categoria.icone} cor={categoria.cor} tamanho={28} />
            <span>{categoria.nome}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

interface PropsSeletorPessoa {
  pessoas: PessoaDTO[]
  valor: string
  aoAlterar: (id: string) => void
  rotulo?: string
}

export function SeletorPessoa({ pessoas, valor, aoAlterar, rotulo = 'Quem' }: PropsSeletorPessoa) {
  return (
    <div className={estilos.bloco}>
      <span className={estilos.rotuloBloco}>{rotulo}</span>
      <div className={estilos.pessoas}>
        {pessoas.map((pessoa) => (
          <button
            key={pessoa.id}
            type="button"
            className={classes(estilos.opcaoPessoa, pessoa.id === valor && estilos.opcaoAtiva)}
            style={{ '--cor': pessoa.cor } as CSSProperties}
            onClick={() => aoAlterar(pessoa.id)}
          >
            <Avatar nome={pessoa.nome} cor={pessoa.cor} tamanho={24} />
            {pessoa.nome}
          </button>
        ))}
      </div>
    </div>
  )
}

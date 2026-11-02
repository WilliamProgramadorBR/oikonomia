import type { CSSProperties } from 'react'
import { UserPlus } from 'lucide-react'
import type { EstadoAutenticacaoDTO } from '@compartilhado/dtos/autenticacao'
import { classes } from '../../utilitarios/classes'
import { Avatar } from '../ui/Elementos'
import estilos from './CamposAcesso.module.css'

interface PropsEscolhaPessoa {
  pergunta: string
  pessoas: EstadoAutenticacaoDTO['pessoasSemConta']
  valor: string | null // null = pessoa nova
  aoEscolher: (pessoa: { id: string; nome: string } | null) => void
  rotuloNova: string
}

// Liga uma conta a um membro da família já cadastrado (ou a um novo). Some quando não há ninguém.
export function EscolhaPessoa({ pergunta, pessoas, valor, aoEscolher, rotuloNova }: PropsEscolhaPessoa) {
  if (pessoas.length === 0) return null

  return (
    <div className={estilos.escolhaPessoa}>
      <span>{pergunta}</span>
      <div>
        {pessoas.map((p) => (
          <button
            key={p.id}
            type="button"
            className={classes(estilos.chipPessoa, valor === p.id && estilos.chipAtivo)}
            style={{ '--cor': p.cor } as CSSProperties}
            onClick={() => aoEscolher(p)}
          >
            <Avatar nome={p.nome} cor={p.cor} tamanho={22} />
            {p.nome}
          </button>
        ))}
        <button
          type="button"
          className={classes(estilos.chipPessoa, estilos.chipNova, valor === null && estilos.chipAtivo)}
          onClick={() => aoEscolher(null)}
        >
          <UserPlus size={15} /> {rotuloNova}
        </button>
      </div>
    </div>
  )
}

import { ChevronLeft, ChevronRight, Plus, Users } from 'lucide-react'
import { deslocarMes, mesAtual } from '@compartilhado/utilitarios/mes'
import { useVisao } from '../../contextos/VisaoContexto'
import { usePessoas } from '../../hooks/consultas'
import { classes } from '../../utilitarios/classes'
import { nomeDoMes } from '../../utilitarios/datas'
import { Botao } from '../ui/Botao'
import { Avatar } from '../ui/Elementos'
import estilos from './Layout.module.css'

interface PropsBarraSuperior {
  titulo: string
  subtitulo: string
  aoNovoLancamento: () => void
}

export function BarraSuperior({ titulo, subtitulo, aoNovoLancamento }: PropsBarraSuperior) {
  const { pessoaId, setPessoaId, mes, setMes } = useVisao()
  const { dados: pessoas } = usePessoas()

  return (
    <header className={estilos.superior}>
      <div className={estilos.superiorTitulo}>
        <h1>{titulo}</h1>
        <p>{subtitulo}</p>
      </div>

      <div className={estilos.superiorAcoes}>
        {pessoas && pessoas.length > 0 && (
          <div className={estilos.visao} role="tablist" aria-label="Visão">
            <button
              role="tab"
              aria-selected={pessoaId === null}
              className={classes(estilos.visaoItem, pessoaId === null && estilos.visaoAtiva)}
              onClick={() => setPessoaId(null)}
            >
              <Users size={15} />
              Família
            </button>
            {pessoas.map((pessoa) => (
              <button
                key={pessoa.id}
                role="tab"
                aria-selected={pessoaId === pessoa.id}
                className={classes(estilos.visaoItem, pessoaId === pessoa.id && estilos.visaoAtiva)}
                onClick={() => setPessoaId(pessoa.id)}
              >
                <Avatar nome={pessoa.nome} cor={pessoa.cor} tamanho={20} />
                {pessoa.nome.split(' ')[0]}
              </button>
            ))}
          </div>
        )}

        <div className={estilos.mes}>
          <button onClick={() => setMes(deslocarMes(mes, -1))} aria-label="Mês anterior">
            <ChevronLeft size={17} />
          </button>
          <button
            className={estilos.mesNome}
            onClick={() => setMes(mesAtual())}
            title="Voltar para o mês atual"
          >
            {nomeDoMes(mes)}
          </button>
          <button onClick={() => setMes(deslocarMes(mes, 1))} aria-label="Próximo mês">
            <ChevronRight size={17} />
          </button>
        </div>

        <Botao icone={Plus} onClick={aoNovoLancamento}>
          Novo lançamento
        </Botao>
      </div>
    </header>
  )
}

import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { ChartPie, Pencil, Trash2, UserPlus } from 'lucide-react'
import type { PessoaDTO } from '@compartilhado/dtos/pessoa'
import { Botao } from '../../componentes/ui/Botao'
import { Avatar, Esqueleto } from '../../componentes/ui/Elementos'
import { useVisao } from '../../contextos/VisaoContexto'
import { usePessoas } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { useConsulta } from '../../hooks/useConsulta'
import { painelServico } from '../../servicos/painelServico'
import { pessoaServico } from '../../servicos/pessoaServico'
import { PALETA } from '../../utilitarios/cores'
import { nomeDoMes } from '../../utilitarios/datas'
import { formatarCentavos } from '../../utilitarios/moeda'
import estilos from './Familia.module.css'
import { ModalPessoa } from './ModalPessoa'

export function Familia() {
  const { mes, setPessoaId } = useVisao()
  const { dados: pessoas } = usePessoas()
  const { dados: painelFamilia } = useConsulta(
    () => painelServico.obter({ pessoaId: null, mes }),
    [mes]
  )
  const executar = useAcao()
  const navegar = useNavigate()

  const [modalAberto, setModalAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState<PessoaDTO | null>(null)

  const gastoPorPessoa = new Map(painelFamilia?.despesasPorPessoa.map((f) => [f.id, f.total]))
  const corSugerida = PALETA[(pessoas?.length ?? 0) % PALETA.length]

  function abrir(pessoa: PessoaDTO | null) {
    setEmEdicao(pessoa)
    setModalAberto(true)
  }

  function verVisao(pessoa: PessoaDTO) {
    setPessoaId(pessoa.id)
    navegar('/')
  }

  return (
    <>
      <div className={estilos.grade}>
        {!pessoas
          ? [1, 2, 3].map((n) => (
              <div key={n} className={estilos.cartao}>
                <Esqueleto altura={56} largura={56} />
                <Esqueleto largura="60%" />
              </div>
            ))
          : pessoas.map((pessoa) => (
              <article
                key={pessoa.id}
                className={estilos.cartao}
                style={{ '--cor': pessoa.cor } as CSSProperties}
              >
                <div className={estilos.faixa} />
                <Avatar nome={pessoa.nome} cor={pessoa.cor} tamanho={60} />
                <h3 className={estilos.nome}>{pessoa.nome}</h3>
                <p className={estilos.gasto}>
                  <span>Gastos em {nomeDoMes(mes).toLowerCase()}</span>
                  <strong className="numero">{formatarCentavos(gastoPorPessoa.get(pessoa.id) ?? 0)}</strong>
                </p>
                <div className={estilos.acoes}>
                  <Botao variante="secundario" tamanho="p" icone={ChartPie} onClick={() => verVisao(pessoa)}>
                    Ver visão
                  </Botao>
                  <Botao
                    variante="fantasma"
                    tamanho="p"
                    icone={Pencil}
                    aria-label="Editar"
                    onClick={() => abrir(pessoa)}
                  />
                  <Botao
                    variante="fantasma"
                    tamanho="p"
                    icone={Trash2}
                    aria-label="Remover"
                    onClick={() =>
                      executar(() => pessoaServico.remover(pessoa.id), `${pessoa.nome} foi removido(a)`)
                    }
                  />
                </div>
              </article>
            ))}

        <button className={estilos.adicionar} onClick={() => abrir(null)}>
          <span>
            <UserPlus size={22} />
          </span>
          <strong>Adicionar pessoa</strong>
          <small>Cônjuge, filhos, quem dividir as contas</small>
        </button>
      </div>

      <ModalPessoa
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
        pessoa={emEdicao}
        corSugerida={corSugerida}
      />
    </>
  )
}

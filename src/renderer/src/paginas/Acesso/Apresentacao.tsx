import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Bot, ChevronLeft, ChevronRight, HardDrive, KeyRound, Plane, ShieldCheck, Sparkles, Umbrella } from 'lucide-react'
import { classes } from '../../utilitarios/classes'
import estilos from './Apresentacao.module.css'

interface Slide {
  titulo: string
  texto: string
  ilustracao: ReactNode
}

const SLIDES: Slide[] = [
  {
    titulo: 'Saiba quanto dá para gastar',
    texto: 'A saúde financeira da família em uma nota, com o limite seguro para parcelar no mês que vem.',
    ilustracao: (
      <div className={estilos.vidro}>
        <div className={estilos.medidor}>
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" className={estilos.trilho} />
            <circle cx="60" cy="60" r="50" className={estilos.arco} strokeDasharray="314" strokeDashoffset="72" />
          </svg>
          <div>
            <strong>78</strong>
            <span>Boa</span>
          </div>
        </div>
        <div className={estilos.linhasInfo}>
          <span>
            Livre para gastar <b>R$ 1.840</b>
          </span>
          <span>
            Pode parcelar até <b>R$ 420/mês</b>
          </span>
          <span>
            Guardar <b>R$ 1.250</b>
          </span>
        </div>
      </div>
    )
  },
  {
    titulo: 'Veja o mês que vem antes dele chegar',
    texto: 'Contas recorrentes, parcelas do cartão e imprevistos viram uma previsão dos próximos meses.',
    ilustracao: (
      <div className={estilos.vidro}>
        <span className={estilos.legenda}>Sobra projetada</span>
        <div className={estilos.barras}>
          {[62, 48, 70, 84, 76, 92].map((altura, i) => (
            <div key={i} className={estilos.colunaBarra}>
              <span style={{ height: `${altura}%` }} className={i === 0 ? estilos.barraAtual : undefined} />
              <small>{['nov', 'dez', 'jan', 'fev', 'mar', 'abr'][i]}</small>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    titulo: 'Objetivos com prazo de verdade',
    texto: 'Reserva, viagem, casa própria: o app mostra o que cabe no orçamento e quando cada um fica pronto.',
    ilustracao: (
      <div className={classes(estilos.vidro, estilos.objetivos)}>
        {[
          { nome: 'Reserva de emergência', icone: Umbrella, progresso: 72, prazo: 'mar/27' },
          { nome: 'Viagem de férias', icone: Plane, progresso: 41, prazo: 'jul/27' }
        ].map(({ nome, icone: Icone, progresso, prazo }) => (
          <div key={nome} className={estilos.objetivo}>
            <span className={estilos.iconeObjetivo}>
              <Icone size={16} />
            </span>
            <div>
              <div className={estilos.objetivoTopo}>
                <b>{nome}</b>
                <small>{prazo}</small>
              </div>
              <div className={estilos.progresso}>
                <span style={{ width: `${progresso}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  },
  {
    titulo: 'Um assistente que conhece seus números',
    texto: 'Pergunte se dá para trocar o carro ou como quitar as dívidas mais rápido. Funciona até sem internet.',
    ilustracao: (
      <div className={classes(estilos.vidro, estilos.chat)}>
        <span className={estilos.balaoUsuario}>Dá para parcelar uma geladeira?</span>
        <div className={estilos.balaoBot}>
          <Bot size={14} />
          <span>
            Sim: até <b>R$ 420/mês</b> cabe com folga. Em 10x sem juros fica em R$ 389.
          </span>
        </div>
      </div>
    )
  },
  {
    titulo: 'Seus dados ficam com você',
    texto: 'Tudo salvo neste computador, sem ligação com o seu banco. Senha protegida com criptografia forte.',
    ilustracao: (
      <div className={classes(estilos.vidro, estilos.seguranca)}>
        <span className={estilos.escudo}>
          <ShieldCheck size={34} />
        </span>
        <div className={estilos.selos}>
          <span>
            <HardDrive size={13} /> Local
          </span>
          <span>
            <KeyRound size={13} /> scrypt
          </span>
          <span>
            <Sparkles size={13} /> IA opcional
          </span>
        </div>
      </div>
    )
  }
]

const INTERVALO = 6000

export function Apresentacao() {
  const [atual, setAtual] = useState(0)
  const [pausado, setPausado] = useState(false)
  const ir = useCallback((indice: number) => setAtual((indice + SLIDES.length) % SLIDES.length), [])

  useEffect(() => {
    if (pausado) return
    const id = window.setTimeout(() => ir(atual + 1), INTERVALO)
    return () => window.clearTimeout(id)
  }, [atual, pausado, ir])

  return (
    <section
      className={estilos.painel}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      aria-roledescription="carrossel"
      aria-label="Apresentação do Projeto Financeiro"
    >
      <div className={estilos.orbe1} />
      <div className={estilos.orbe2} />

      <div className={estilos.trilhoSlides} style={{ transform: `translateX(-${atual * 100}%)` }}>
        {SLIDES.map((slide, i) => (
          <article key={slide.titulo} className={estilos.slide} aria-hidden={i !== atual}>
            <div className={estilos.ilustracao}>{slide.ilustracao}</div>
            <h2>{slide.titulo}</h2>
            <p>{slide.texto}</p>
          </article>
        ))}
      </div>

      <div className={estilos.controles}>
        <button type="button" onClick={() => ir(atual - 1)} aria-label="Anterior">
          <ChevronLeft size={18} />
        </button>
        <div className={estilos.pontos}>
          {SLIDES.map((slide, i) => (
            <button
              key={slide.titulo}
              type="button"
              className={classes(estilos.ponto, i === atual && estilos.pontoAtivo)}
              onClick={() => ir(i)}
              aria-label={`Ir para: ${slide.titulo}`}
            >
              {i === atual && !pausado && <span key={atual} className={estilos.tempo} />}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => ir(atual + 1)} aria-label="Próximo">
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  )
}

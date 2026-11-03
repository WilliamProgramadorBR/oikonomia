import { useState, type UIEvent } from 'react'
import { ShieldCheck } from 'lucide-react'
import { DECLARACAO_ACEITE, TERMO_OPEN_FINANCE, VERSAO_TERMO_OPEN_FINANCE } from '@compartilhado/constantes/termoOpenFinance'
import { useAcao } from '../../hooks/useAcao'
import { openFinanceServico } from '../../servicos/openFinanceServico'
import { Marcador } from '../acesso/CamposAcesso'
import { Botao } from '../ui/Botao'
import { Modal } from '../ui/Modal'
import estilos from './OpenFinance.module.css'

// Termo de ciência: o aceite só é liberado depois de rolar até o fim e marcar a declaração.
export function ModalTermoOpenFinance({ aberto, aoFechar, somenteLeitura = false }: { aberto: boolean; aoFechar: () => void; somenteLeitura?: boolean }) {
  const executar = useAcao()
  const [leuTudo, setLeuTudo] = useState(false)
  const [concordo, setConcordo] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const aoRolar = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setLeuTudo(true)
  }

  async function aceitar() {
    setSalvando(true)
    const ok = await executar(() => openFinanceServico.aceitarTermo(VERSAO_TERMO_OPEN_FINANCE), 'Termo aceito. Agora cadastre as credenciais da sua conta Pluggy.')
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Open Finance com a Pluggy: termo de ciência"
      descricao={`Versão ${VERSAO_TERMO_OPEN_FINANCE}. Leia com atenção: é sobre os seus dados bancários.`}
      rodape={
        somenteLeitura ? (
          <Botao onClick={aoFechar}>Fechar</Botao>
        ) : (
          <>
            <Botao variante="fantasma" onClick={aoFechar}>
              Agora não
            </Botao>
            <Botao icone={ShieldCheck} carregando={salvando} disabled={!leuTudo || !concordo} onClick={aceitar}>
              Aceitar e continuar
            </Botao>
          </>
        )
      }
    >
      <div className={estilos.termo} onScroll={aoRolar}>
        {TERMO_OPEN_FINANCE.map((secao) => (
          <section key={secao.titulo}>
            <h3>{secao.titulo}</h3>
            {secao.paragrafos.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ))}
      </div>
      {!somenteLeitura && (
        <div className={estilos.aceite}>
          {!leuTudo && <span className={estilos.lerAteOFim}>Role o termo até o fim para liberar o aceite.</span>}
          <Marcador marcado={concordo} aoAlterar={(v) => leuTudo && setConcordo(v)}>
            {DECLARACAO_ACEITE}
          </Marcador>
        </div>
      )}
    </Modal>
  )
}

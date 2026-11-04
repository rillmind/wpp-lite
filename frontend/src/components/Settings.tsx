import { Dialog } from './Dialog'

interface Props {
  noRead: boolean
  onToggleNoRead: () => void
  typingInList: boolean
  onToggleTypingInList: () => void
  onClose: () => void
}

/** Opções do app, guardadas neste navegador. */
export function Settings({ noRead, onToggleNoRead, typingInList, onToggleTypingInList, onClose }: Props) {
  return (
    <Dialog title="Configurações" onClose={onClose}>
      <label className="setting">
        <input type="checkbox" checked={noRead} onChange={onToggleNoRead} />
        <span>
          <span className="setting__name">Não visualizar ao abrir</span>
          <span className="setting__hint">
            Abrir a conversa não marca as mensagens como lidas: o contato não vê os tiques azuis.
          </span>
        </span>
      </label>
      <label className="setting">
        <input type="checkbox" checked={typingInList} onChange={onToggleTypingInList} />
        <span>
          <span className="setting__name">"Digitando…" nas conversas fechadas</span>
          <span className="setting__hint">
            Mostra na lista quem está digitando. Com o app em foco você aparece online mesmo sem conversa aberta, e o
            celular não vibra nesse tempo.
          </span>
        </span>
      </label>
      <div className="dialog__actions">
        <button type="button" className="btn" onClick={onClose}>
          Fechar
        </button>
      </div>
    </Dialog>
  )
}

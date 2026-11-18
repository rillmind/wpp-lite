import { useState } from 'react'
import { MODES, THEMES, type ThemeMode, type ThemeName } from '../api/theme'
import { Dialog } from './Dialog'

interface Props {
  theme: ThemeName
  onTheme: (t: ThemeName) => void
  mode: ThemeMode
  onMode: (m: ThemeMode) => void
  noRead: boolean
  onToggleNoRead: () => void
  typingInList: boolean
  onToggleTypingInList: () => void
  /** Devolve o erro, ou `null` se o pedido foi aceito. */
  onResyncContacts: () => Promise<string | null>
  onClose: () => void
}

/** Opções do app, guardadas neste navegador. */
export function Settings({
  theme,
  onTheme,
  mode,
  onMode,
  noRead,
  onToggleNoRead,
  typingInList,
  onToggleTypingInList,
  onResyncContacts,
  onClose,
}: Props) {
  const [resync, setResync] = useState<{ pending: boolean; result?: string }>({ pending: false })

  async function resyncContacts() {
    setResync({ pending: true })
    const err = await onResyncContacts()
    setResync({ pending: false, result: err ?? 'Pedido enviado. Os nomes chegam do celular em instantes.' })
  }

  return (
    <Dialog title="Configurações" onClose={onClose}>
      <label className="setting setting--select">
        <span className="setting__name">Tema</span>
        <select value={theme} onChange={(e) => onTheme(e.target.value as ThemeName)}>
          {THEMES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="setting setting--select">
        <span className="setting__name">Aparência</span>
        <select value={mode} onChange={(e) => onMode(e.target.value as ThemeMode)}>
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
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
      <div className="setting setting--action">
        <span>
          <span className="setting__name">Contatos do celular</span>
          <span className="setting__hint">
            Busca de novo os nomes da agenda, como ao conectar o app pela primeira vez. Não traz mensagens.
          </span>
          {resync.result && (
            <span className="setting__hint" role="status">
              {resync.result}
            </span>
          )}
        </span>
        <button type="button" className="btn" disabled={resync.pending} onClick={() => void resyncContacts()}>
          {resync.pending ? 'Pedindo…' : 'Ressincronizar'}
        </button>
      </div>
      <div className="dialog__actions">
        <button type="button" className="btn" onClick={onClose}>
          Fechar
        </button>
      </div>
    </Dialog>
  )
}

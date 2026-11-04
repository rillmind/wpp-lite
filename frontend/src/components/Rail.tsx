import type { NotifyState } from '../api/notify'
import { SECTION_TITLE, type Section } from './format'
import { Icon } from './Icon'

interface Props {
  section: Section
  /** Conversas com mensagens não lidas, por seção. */
  unread: Record<Section, number>
  onSection: (s: Section) => void
  /** Estado da conexão: cor do pontinho e texto do balão. */
  conn: { level: 'ok' | 'warn' | 'err'; text: string }
  notify: NotifyState
  onToggleNotify: () => void
  onSettings: () => void
}

const NOTIFY_TIP: Record<NotifyState, string> = {
  on: 'Notificações ligadas (com a aba aberta)',
  off: 'Ligar notificações',
  denied: 'Notificações bloqueadas no navegador: libere nas permissões do site',
  unsupported: 'Notificações só pelo endereço HTTPS (https://…ts.net)',
}
/** Barra lateral estreita, com as seções do app. */
export function Rail({ section, unread, onSection, conn, notify, onToggleNotify, onSettings }: Props) {
  const item = (s: Section) => (
    <button
      key={s}
      type="button"
      className="rail__btn"
      aria-current={section === s}
      title={SECTION_TITLE[s]}
      aria-label={unread[s] > 0 ? `${SECTION_TITLE[s]}, ${unread[s]} não lidas` : SECTION_TITLE[s]}
      onClick={() => onSection(s)}
    >
      <Icon name={s} />
      {unread[s] > 0 &&
        (s === 'chats' ? (
          <span className="rail__badge">{unread[s] > 99 ? '99+' : unread[s]}</span>
        ) : (
          <span className="rail__dot" aria-hidden="true" />
        ))}
    </button>
  )

  return (
    <nav className="rail" aria-label="Seções">
      {item('chats')}
      {item('status')}
      {item('channels')}
      <span className="rail__sep" aria-hidden="true" />
      {item('archived')}
      <span className="rail__spacer" />
      <button
        type="button"
        className="rail__btn rail__btn--notify"
        aria-pressed={notify === 'on'}
        aria-label={NOTIFY_TIP[notify]}
        title={NOTIFY_TIP[notify]}
        disabled={notify === 'unsupported'}
        onClick={onToggleNotify}
      >
        <Icon name={notify === 'on' ? 'bell' : 'bellOff'} />
      </button>
      <span
        className={`rail__conn conn--${conn.level}`}
        role="status"
        tabIndex={0}
        aria-label={conn.text}
        data-tip={conn.text}
      />
      <button type="button" className="rail__btn" aria-label="Configurações" title="Configurações" onClick={onSettings}>
        <Icon name="settings" />
      </button>
    </nav>
  )
}

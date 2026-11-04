import type { Chat, Live, MsgStatus } from '../api/types'
import { getDraft } from '../api/drafts'
import { Avatar } from './Avatar'
import { chatName, formatListTime, formatPerson, liveText } from './format'
import { Icon } from './Icon'

const TICK_LABEL: Record<MsgStatus, string> = { sent: 'enviada', delivered: 'entregue', read: 'lida' }

interface Props {
  chats: Chat[]
  selected: string | null
  onSelect: (jid: string) => void
  /** Botão direito (ou toque longo) numa conversa. */
  onMenu: (chat: Chat, x: number, y: number) => void
  /** "digitando…" por conversa. */
  live: Record<string, Live>
  /** Mostra o "digitando…" também nas conversas fechadas. */
  typingInList: boolean
}

export function ChatList({ chats, selected, onSelect, onMenu, live, typingInList }: Props) {
  if (chats.length === 0) {
    return <p className="empty">Nenhuma conversa ainda. Elas aparecem aqui assim que chegarem.</p>
  }
  return (
    <ul className="chat-list" role="listbox" aria-label="Conversas">
      {chats.map((c) => (
        <li key={c.jid}>
          <button
            type="button"
            className="chat-item"
            aria-selected={c.jid === selected}
            onClick={() => onSelect(c.jid)}
            onContextMenu={(e) => {
              e.preventDefault()
              onMenu(c, e.clientX, e.clientY)
            }}
          >
            <Avatar jid={c.jid} name={chatName(c)} />
            <span className="chat-item__body">
              <span className="chat-item__top">
                <span className="chat-item__name">{chatName(c)}</span>
                <span className={c.unread_count > 0 ? 'chat-item__time chat-item__time--unread' : 'chat-item__time'}>
                  {formatListTime(c.last_msg_ts)}
                </span>
              </span>
              <span className="chat-item__bottom">
                {live[c.jid]?.typing && (typingInList || c.jid === selected) ? (
                  <span className="chat-item__preview chat-item__typing">{liveText({ typing: live[c.jid].typing })}</span>
                ) : c.jid !== selected && getDraft(c.jid) ? (
                  <span className="chat-item__preview">
                    <span className="chat-item__draft">Rascunho:</span> {getDraft(c.jid)}
                  </span>
                ) : (
                  <span className="chat-item__preview">
                    {c.last_status && (
                      <span
                        className={c.last_status === 'read' ? 'chat-item__tick chat-item__tick--read' : 'chat-item__tick'}
                        aria-label={TICK_LABEL[c.last_status]}
                      >
                        <Icon name={c.last_status === 'sent' ? 'check' : 'checks'} size={15} />
                      </span>
                    )}
                    {c.last_sender && c.last_msg_preview && `${formatPerson(c.last_sender)}: `}
                    {c.last_msg_preview ?? ''}
                  </span>
                )}
                {c.muted && (
                  <Icon name="bellOff" size={16} className="chat-item__pin" label="Silenciada" />
                )}
                {c.pinned && (
                  <Icon name="pin" size={16} className="chat-item__pin" label="Fixada" />
                )}
                {c.unread_count > 0 && (
                  <span className="badge" aria-label={`${c.unread_count} não lidas`}>
                    {c.unread_count}
                  </span>
                )}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

import type { Chat, Message } from '../api/types'
import { Avatar } from './Avatar'
import { chatName, formatListTime, highlight, messageText, senderName, snippet } from './format'

export interface SearchResult {
  chats: Chat[]
  messages: Message[]
}

interface Props {
  query: string
  result: SearchResult | null
  loading: boolean
  /** Conversas conhecidas, para dar nome ao chat de cada mensagem achada. */
  chats: Chat[]
  onOpenChat: (chat: Chat) => void
  onOpenMessage: (m: Message) => void
}

function Marked({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlight(text, query).map((p, i) =>
        p.hit ? (
          <mark key={i} className="search-hit">
            {p.text}
          </mark>
        ) : (
          p.text
        ),
      )}
    </>
  )
}

/** Conversas pelo nome e mensagens pelo texto, tudo do banco local. */
export function SearchResults({ query, result, loading, chats, onOpenChat, onOpenMessage }: Props) {
  if (!result) return <p className="empty">{loading ? 'Buscando…' : ''}</p>
  if (result.chats.length === 0 && result.messages.length === 0) {
    return <p className="empty">Nada encontrado para “{query.trim()}”.</p>
  }
  const byJid = new Map(chats.map((c) => [c.jid, c]))
  for (const c of result.chats) byJid.set(c.jid, c)
  return (
    <div className="chat-list search-results">
      {result.chats.length > 0 && (
        <>
          <h3 className="search-results__title">Conversas</h3>
          <ul className="search-results__list">
            {result.chats.map((c) => (
              <li key={c.jid}>
                <button type="button" className="chat-item" onClick={() => onOpenChat(c)}>
                  <Avatar jid={c.jid} name={chatName(c)} />
                  <span className="chat-item__body">
                    <span className="chat-item__top">
                      <span className="chat-item__name">
                        <Marked text={chatName(c)} query={query} />
                      </span>
                      <span className="chat-item__time">{formatListTime(c.last_msg_ts)}</span>
                    </span>
                    <span className="chat-item__bottom">
                      <span className="chat-item__preview">{c.last_msg_preview ?? ''}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {result.messages.length > 0 && (
        <>
          <h3 className="search-results__title">Mensagens</h3>
          <ul className="search-results__list">
            {result.messages.map((m) => {
              const chat = byJid.get(m.chat_jid)
              const name = chat ? chatName(chat) : 'Conversa'
              const who = m.from_me ? 'Você' : chat?.is_group ? senderName(m) : null
              return (
                <li key={`${m.chat_jid}/${m.id}`}>
                  <button type="button" className="chat-item" onClick={() => onOpenMessage(m)}>
                    <Avatar jid={m.chat_jid} name={name} />
                    <span className="chat-item__body">
                      <span className="chat-item__top">
                        <span className="chat-item__name">{name}</span>
                        <span className="chat-item__time">{formatListTime(m.ts)}</span>
                      </span>
                      <span className="chat-item__bottom">
                        <span className="chat-item__preview">
                          {who && `${who}: `}
                          <Marked text={snippet(messageText(m), query)} query={query} />
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}

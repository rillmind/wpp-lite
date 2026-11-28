import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { Chat } from '../api/types'
import { Avatar } from './Avatar'
import { Dialog } from './Dialog'
import { chatName, foldText, formatPhone } from './format'

interface Props {
  /** O contato escolhido, como a conversa com ele (vazia se ainda não houver). */
  onPick: (chat: Chat) => void
  onClose: () => void
}

/** "Nova conversa": todos os contatos salvos na agenda do celular e os grupos, com busca. */
export function NewChatDialog({ onPick, onClose }: Props) {
  const [contacts, setContacts] = useState<Chat[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    api.contacts().then(setContacts, (e: unknown) => setError(e instanceof Error ? e.message : 'Falha ao carregar'))
  }, [])

  const options = useMemo(() => {
    const q = foldText(query.trim())
    const digits = q.replace(/\D/g, '')
    return (contacts ?? []).filter(
      (c) => !q || foldText(chatName(c)).includes(q) || (digits !== '' && (c.phone ?? '').includes(digits)),
    )
  }, [contacts, query])

  return (
    <Dialog title="Nova conversa" onClose={onClose} blur>
      <input
        className="dialog__search"
        type="search"
        placeholder="Buscar contato ou grupo"
        aria-label="Buscar contato ou grupo"
        value={query}
        autoFocus
        onChange={(e) => setQuery(e.target.value)}
      />
      {error ? (
        <p className="dialog__text empty--error" role="alert">
          {error}
        </p>
      ) : contacts === null ? (
        <p className="dialog__text">Carregando…</p>
      ) : options.length === 0 ? (
        <p className="dialog__text">
          {contacts.length === 0
            ? 'Nenhum contato nem grupo ainda. Use "Contatos do celular" nas configurações.'
            : 'Nenhum contato encontrado.'}
        </p>
      ) : (
        <ul className="forward__list">
          {options.map((c) => (
            <li key={c.jid}>
              <button type="button" className="forward__item new-chat__item" onClick={() => onPick(c)}>
                <Avatar jid={c.jid} name={chatName(c)} size="sm" />
                <span className="forward__name">
                  {chatName(c)}
                  {c.phone && <span className="new-chat__phone">{formatPhone(c.phone)}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { api } from './client'
import type { ServerEvent } from './types'

export type StreamState = 'open' | 'connecting' | 'closed'

// O EventSource só entrega evento com nome que tenha ouvinte. Como `Record`, esquecer um
// tipo novo de `ServerEvent` aqui vira erro de compilação, em vez de o evento sumir calado.
const NAMES: Record<ServerEvent['type'], true> = {
  'message.new': true,
  'message.status': true,
  'message.updated': true,
  'message.deleted': true,
  'chat.updated': true,
  'chat.deleted': true,
  'history.loaded': true,
  'connection.state': true,
  'chat.typing': true,
  'chat.presence': true,
}

/**
 * Assina `/api/events`. O EventSource reconecta sozinho; `onResync` é chamado
 * ao reabrir (ou quando o servidor avisa que eventos foram perdidos), para
 * recarregar do banco o que possa ter passado.
 */
export function useEvents(onEvent: (ev: ServerEvent) => void, onResync: () => void): StreamState {
  const [state, setState] = useState<StreamState>('connecting')
  const handlers = useRef({ onEvent, onResync })
  useLayoutEffect(() => {
    handlers.current = { onEvent, onResync }
  })

  useEffect(() => {
    const es = new EventSource(api.eventsUrl())
    let opened = false
    es.onopen = () => {
      setState('open')
      if (opened) handlers.current.onResync()
      opened = true
    }
    es.onerror = () => setState(es.readyState === EventSource.CLOSED ? 'closed' : 'connecting')
    for (const name of Object.keys(NAMES)) {
      es.addEventListener(name, (e) => {
        try {
          handlers.current.onEvent(JSON.parse((e as MessageEvent<string>).data) as ServerEvent)
        } catch {
          // Evento malformado: ignora.
        }
      })
    }
    es.addEventListener('resync', () => handlers.current.onResync())
    return () => es.close()
  }, [])

  return state
}

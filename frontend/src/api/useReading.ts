import { useEffect } from 'react'
import { sendReading } from './client'

/** Sem mexer no app por este tempo, deixa de contar como lendo. */
const IDLE_MS = 2 * 60_000
/** Renovação do aviso; o servidor o descarta depois de 45 s sem renovar. */
const RENEW_MS = 20_000

/**
 * Enquanto `active`, com a aba visível e em foco e a pessoa mexendo, o servidor aparece
 * online e o WhatsApp não faz o celular vibrar. Fora disso, offline.
 */
export function useReading(active: boolean) {
  useEffect(() => {
    if (!active) return
    let lastInput = Date.now()
    let reading = false

    const update = () => {
      const now =
        document.visibilityState === 'visible' && document.hasFocus() && Date.now() - lastInput < IDLE_MS
      if (now) sendReading(true)
      else if (reading) sendReading(false)
      reading = now
    }
    const onInput = () => {
      const wasIdle = Date.now() - lastInput >= IDLE_MS
      lastInput = Date.now()
      if (wasIdle || !reading) update()
    }

    update()
    const timer = setInterval(update, RENEW_MS)
    const inputs = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const
    for (const e of inputs) window.addEventListener(e, onInput, { passive: true })
    window.addEventListener('focus', update)
    window.addEventListener('blur', update)
    document.addEventListener('visibilitychange', update)
    window.addEventListener('pagehide', update)
    return () => {
      clearInterval(timer)
      for (const e of inputs) window.removeEventListener(e, onInput)
      window.removeEventListener('focus', update)
      window.removeEventListener('blur', update)
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('pagehide', update)
      if (reading) sendReading(false)
    }
  }, [active])
}

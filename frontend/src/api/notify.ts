// Notificações do app (no navegador, com a aba aberta). Não mexem nas do celular, que
// o WhatsApp entrega por conta própria.

const PREF_KEY = 'wpp.notify'

export type NotifyState = 'unsupported' | 'off' | 'on' | 'denied'

/** O navegador só libera notificação em página segura (HTTPS ou localhost). */
export function notifySupported(): boolean {
  return window.isSecureContext && 'Notification' in window && 'serviceWorker' in navigator
}

export function notifyState(): NotifyState {
  if (!notifySupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  let on = false
  try {
    on = localStorage.getItem(PREF_KEY) === '1'
  } catch {
    // Sem storage: começa desligado.
  }
  return on && Notification.permission === 'granted' ? 'on' : 'off'
}

export function registerNotifyWorker(): void {
  if (notifySupported()) navigator.serviceWorker.register('/sw.js').catch(() => undefined)
}

/** Liga (pedindo permissão, se preciso) ou desliga. Devolve o estado novo. */
export async function toggleNotify(): Promise<NotifyState> {
  if (!notifySupported()) return 'unsupported'
  const turnOn = notifyState() !== 'on'
  if (turnOn && Notification.permission !== 'granted') {
    const p = await Notification.requestPermission()
    if (p !== 'granted') return p === 'denied' ? 'denied' : 'off'
  }
  try {
    localStorage.setItem(PREF_KEY, turnOn ? '1' : '0')
  } catch {
    // Preferência vale só nesta aba.
  }
  return notifyState()
}

/** Uma notificação por conversa (`tag`): mensagens novas substituem a anterior. */
export async function showNotification(title: string, body: string, jid: string): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification(title, { body, tag: jid, data: { jid } })
}

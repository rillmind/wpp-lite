// Notificações do app (no navegador, com a aba aberta). Não mexem nas do celular, que
// o WhatsApp entrega por conta própria.

import { api } from './client'
import { loadImage } from './images'

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
  const [reg, icon] = await Promise.all([navigator.serviceWorker.ready, notifyIcon(jid)])
  await reg.showNotification(title, { body, tag: jid, data: { jid }, icon: icon ?? APP_ICON })
}

const APP_ICON = '/icon-192.png'
const ICON_PX = 128
// Fotos já recortadas para notificação, só na memória desta aba (como as outras imagens).
const icons = new Map<string, Promise<string | null>>()

/**
 * A foto da conversa (pessoa ou grupo) como `data:` URL redonda. A notificação não consegue
 * ler a URL de blob da aba nem mandar o token, por isso vai a imagem pronta.
 */
function notifyIcon(jid: string): Promise<string | null> {
  let p = icons.get(jid)
  if (!p) {
    p = loadImage(api.avatarPath(jid)).then((url) => (url ? roundIcon(url) : null))
    p.catch(() => icons.delete(jid))
    icons.set(jid, p)
  }
  return p.catch(() => null)
}

async function roundIcon(url: string): Promise<string | null> {
  const img = new Image()
  img.src = url
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = ICON_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.beginPath()
  ctx.arc(ICON_PX / 2, ICON_PX / 2, ICON_PX / 2, 0, Math.PI * 2)
  ctx.clip()
  // Corta o centro, como o avatar da lista (object-fit: cover).
  const side = Math.min(img.naturalWidth, img.naturalHeight)
  const sx = (img.naturalWidth - side) / 2
  const sy = (img.naturalHeight - side) / 2
  ctx.drawImage(img, sx, sy, side, side, 0, 0, ICON_PX, ICON_PX)
  return canvas.toDataURL('image/png')
}

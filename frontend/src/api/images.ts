import { useEffect, useState } from 'react'
import { fetchImage } from './client'

// Mídias baixadas (imagens, vídeos, áudios) ficam no cache do navegador (Cache Storage):
// continuam lá ao recarregar a página ou reabrir o navegador, e só somem com o Ctrl+Shift+R
// (ou Ctrl+F5), que pede tudo de novo. Nada vai para o banco. Fotos de perfil não entram:
// mudam e precisam vir atualizadas. Na aba, cada uma vira uma URL de blob.
const cache = new Map<string, Promise<string | null>>()

const STORE = 'wpp-midia'
const HARD_RELOAD_KEY = 'wpp.limparMidia'

function storeSupported(): boolean {
  return window.isSecureContext && 'caches' in window
}

/**
 * Recarga forçada: o navegador não diz à página se foi F5 ou Ctrl+Shift+R, então o atalho é
 * visto aqui e marcado; a página nova limpa o cache antes de baixar qualquer mídia.
 */
const cleared: Promise<unknown> = (() => {
  if (!storeSupported()) return Promise.resolve()
  window.addEventListener('keydown', (e) => {
    const hard = (e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key.toLowerCase() === 'r') || e.key === 'F5')
    if (!hard) return
    try {
      localStorage.setItem(HARD_RELOAD_KEY, '1')
    } catch {
      // Sem storage: o cache fica.
    }
  })
  try {
    if (localStorage.getItem(HARD_RELOAD_KEY) !== '1') return Promise.resolve()
    localStorage.removeItem(HARD_RELOAD_KEY)
  } catch {
    return Promise.resolve()
  }
  return caches.delete(STORE).catch(() => undefined)
})()

async function fetchStored(path: string): Promise<Blob | null> {
  if (!storeSupported() || path.endsWith('/avatar')) return fetchImage(path)
  await cleared
  const store = await caches.open(STORE).catch(() => null)
  const hit = await store?.match(path).catch(() => undefined)
  if (hit) return hit.blob()
  const blob = await fetchImage(path)
  // Sem espaço (cota do navegador) ou outro erro: a mídia aparece igual, só não fica guardada.
  if (blob && store) await store.put(path, new Response(blob, { headers: { 'Content-Type': blob.type } })).catch(() => undefined)
  return blob
}

export function loadImage(path: string): Promise<string | null> {
  let p = cache.get(path)
  if (!p) {
    p = fetchStored(path).then((blob) => (blob ? URL.createObjectURL(blob) : null))
    // Falha (rede, WhatsApp desconectado) não fica no cache: tenta de novo depois.
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return p
}

export type ImageState = { status: 'idle' | 'loading' | 'none' | 'error' } | { status: 'ready'; url: string }

/** Baixa `path` quando `enabled` (ex.: o elemento apareceu na tela ou a pessoa clicou). */
export function useImage(path: string, enabled: boolean): ImageState {
  const [state, setState] = useState<{ path: string; value: ImageState }>({ path, value: { status: 'idle' } })
  useEffect(() => {
    if (!enabled) return
    let alive = true
    loadImage(path).then(
      (url) => alive && setState({ path, value: url ? { status: 'ready', url } : { status: 'none' } }),
      () => alive && setState({ path, value: { status: 'error' } }),
    )
    return () => {
      alive = false
    }
  }, [path, enabled])
  if (state.path !== path) return { status: enabled ? 'loading' : 'idle' }
  return state.value.status === 'idle' && enabled ? { status: 'loading' } : state.value
}

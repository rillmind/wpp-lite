import { useEffect, useState } from 'react'
import { fetchImage } from './client'

// Mídias baixadas (imagens, vídeos, áudios, documentos) ficam guardadas no navegador, no
// IndexedDB: continuam ao trocar de conversa, recarregar a página ou reabrir o navegador, e só
// somem com o Ctrl+Shift+R (ou Ctrl+F5), que pede tudo de novo. IndexedDB, e não Cache
// Storage, porque este só existe em HTTPS, e o app também é aberto por http (IP da rede ou do
// Tailscale). Nada vai para o servidor. Fotos de perfil não entram: mudam e precisam vir
// atualizadas. Na aba, cada mídia vira uma URL de blob.
const urls = new Map<string, Promise<string | null>>()
/** Já baixadas nesta aba: a URL de blob está pronta. */
const loaded = new Set<string>()

const DB_NAME = 'wpp-midia'
const STORE = 'midia'
const HARD_RELOAD_KEY = 'wpp.limparMidia'

function done<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

/** Recarga forçada pedida na página anterior (o navegador não conta se foi F5 ou Ctrl+Shift+R). */
function takeHardReload(): boolean {
  window.addEventListener('keydown', (e) => {
    const hard = (e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key.toLowerCase() === 'r') || e.key === 'F5')
    if (!hard) return
    try {
      localStorage.setItem(HARD_RELOAD_KEY, '1')
    } catch {
      // Sem storage: as mídias ficam.
    }
  })
  try {
    if (localStorage.getItem(HARD_RELOAD_KEY) !== '1') return false
    localStorage.removeItem(HARD_RELOAD_KEY)
    return true
  } catch {
    return false
  }
}

/** Banco das mídias, ou `null` sem IndexedDB (ex.: janela anônima de alguns navegadores). */
const db: Promise<IDBDatabase | null> = (() => {
  const clear = takeHardReload()
  // Versão anterior guardava no Cache Storage (só em HTTPS): libera o espaço.
  if ('caches' in window) void caches.delete('wpp-midia').catch(() => undefined)
  if (!('indexedDB' in window)) return Promise.resolve(null)
  const request = indexedDB.open(DB_NAME, 1)
  request.onupgradeneeded = () => request.result.createObjectStore(STORE)
  return done(request)
    .then(async (conn) => {
      if (clear) await done(conn.transaction(STORE, 'readwrite').objectStore(STORE).clear()).catch(() => undefined)
      return conn
    })
    .catch(() => null)
})()

const storable = (path: string) => !path.endsWith('/avatar')

async function getStored(path: string): Promise<Blob | null> {
  const conn = await db
  if (!conn) return null
  try {
    const value: unknown = await done(conn.transaction(STORE).objectStore(STORE).get(path))
    return value instanceof Blob ? value : null
  } catch {
    return null
  }
}

async function putStored(path: string, blob: Blob): Promise<void> {
  const conn = await db
  if (!conn) return
  try {
    await done(conn.transaction(STORE, 'readwrite').objectStore(STORE).put(blob, path))
  } catch {
    // Sem espaço (cota do navegador) ou outro erro: a mídia aparece igual, só não fica guardada.
  }
}

async function fetchStored(path: string): Promise<Blob | null> {
  if (!storable(path)) return fetchImage(path)
  const hit = await getStored(path)
  if (hit) return hit
  const blob = await fetchImage(path)
  if (blob) await putStored(path, blob)
  return blob
}

/** Já está pronta nesta aba (dá para mostrar sem esperar). */
export function isLoaded(path: string): boolean {
  return loaded.has(path)
}

/** Já foi baixada antes: nesta aba ou guardada no navegador. */
export async function isStored(path: string): Promise<boolean> {
  if (loaded.has(path)) return true
  if (!storable(path)) return false
  const conn = await db
  if (!conn) return false
  try {
    return (await done(conn.transaction(STORE).objectStore(STORE).count(path))) > 0
  } catch {
    return false
  }
}

export function loadImage(path: string): Promise<string | null> {
  let p = urls.get(path)
  if (!p) {
    p = fetchStored(path).then((blob) => {
      if (!blob) return null
      loaded.add(path)
      return URL.createObjectURL(blob)
    })
    // Falha (rede, WhatsApp desconectado) não fica guardada: tenta de novo depois.
    p.catch(() => urls.delete(path))
    urls.set(path, p)
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

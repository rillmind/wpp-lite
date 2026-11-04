// A tela de carregamento fica no index.html, para aparecer antes do JavaScript baixar.

/** Se o servidor não responder, libera a tela depois deste tempo (o app mostra o erro). */
const MAX_WAIT_MS = 10_000
const FADE_MS = 150

/** Tira a tela de carregamento. Pode ser chamada mais de uma vez. */
export function hideSplash() {
  const splash = document.getElementById('splash')
  if (!splash) return
  splash.classList.add('splash--out')
  setTimeout(() => splash.remove(), FADE_MS)
}

setTimeout(hideSplash, MAX_WAIT_MS)

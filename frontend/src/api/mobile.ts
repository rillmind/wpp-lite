import { useEffect, useRef } from 'react'

/**
 * Teclado do celular: a tela do app passa a ter a altura da área visível (`--app-height`),
 * em vez de o navegador rolar a página para mostrar a caixa de mensagem e esconder o topo
 * da conversa (voltar, foto e nome). O Chrome do Android já encolhe a página com o
 * `interactive-widget=resizes-content` do index.html; isto cobre os demais (ex.: Safari).
 */
export function fitKeyboard() {
  const vv = window.visualViewport
  if (!vv) return
  const root = document.documentElement
  const fit = () => {
    root.style.setProperty('--app-height', `${vv.height}px`)
    if (window.scrollY !== 0) window.scrollTo(0, 0)
  }
  vv.addEventListener('resize', fit)
  vv.addEventListener('scroll', fit)
  fit()
}

/**
 * Botão voltar do celular (e do navegador): nunca sai do app. Mantém uma entrada extra no
 * histórico; cada voltar a consome, chama `onBack` (fechar a conversa, um menu…) e ela é
 * recolocada na hora.
 */
export function useBackButton(onBack: () => void) {
  const ref = useRef(onBack)
  useEffect(() => {
    ref.current = onBack
  })
  useEffect(() => {
    const arm = () => {
      if (!(history.state as { wppBack?: boolean } | null)?.wppBack) history.pushState({ wppBack: true }, '')
    }
    const onPop = () => {
      ref.current()
      arm()
    }
    arm()
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
}

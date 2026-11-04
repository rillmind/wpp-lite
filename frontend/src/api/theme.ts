import { useEffect, useState } from 'react'

export const THEMES = [
  { id: 'catppuccin', label: 'Catppuccin' },
  { id: 'gruvbox', label: 'Gruvbox' },
  { id: 'whatsapp', label: 'WhatsApp' },
] as const
export const MODES = [
  { id: 'system', label: 'Seguir o sistema' },
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Escuro' },
] as const

export type ThemeName = (typeof THEMES)[number]['id']
export type ThemeMode = (typeof MODES)[number]['id']

// As mesmas chaves e padrões são lidos pelo script no <head> do index.html, que aplica o
// tema antes da primeira pintura.
const THEME_KEY = 'wpp.theme'
const MODE_KEY = 'wpp.themeMode'

function load<T extends string>(key: string, options: readonly { id: T }[], fallback: T): T {
  try {
    const saved = localStorage.getItem(key)
    return options.find((o) => o.id === saved)?.id ?? fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Preferência vale só nesta aba.
  }
}

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)')

function apply(theme: ThemeName, mode: ThemeMode) {
  const resolved = mode === 'system' ? (systemDark().matches ? 'dark' : 'light') : mode
  const root = document.documentElement
  root.dataset.theme = `${theme}-${resolved}`
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', resolved)
  // Cor da barra do navegador e do app instalado.
  const bar = getComputedStyle(root).getPropertyValue('--bg-bar').trim()
  if (bar) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar)
}

/** O tema escolhido neste navegador; em "seguir o sistema", acompanha quando o sistema muda. */
export function useTheme() {
  const [theme, setThemeState] = useState(() => load(THEME_KEY, THEMES, 'catppuccin'))
  const [mode, setModeState] = useState(() => load(MODE_KEY, MODES, 'dark'))

  useEffect(() => {
    apply(theme, mode)
    if (mode !== 'system') return
    const media = systemDark()
    const onChange = () => apply(theme, mode)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme, mode])

  return {
    theme,
    mode,
    setTheme: (t: ThemeName) => {
      setThemeState(t)
      save(THEME_KEY, t)
    },
    setMode: (m: ThemeMode) => {
      setModeState(m)
      save(MODE_KEY, m)
    },
  }
}

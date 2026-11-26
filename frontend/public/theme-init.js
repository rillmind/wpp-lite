// Aplica o tema antes da primeira pintura, sem piscar (a lógica completa está em api/theme.ts).
try {
  var mode = localStorage.getItem('wpp.themeMode') || 'dark'
  if (mode === 'system') mode = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.dataset.theme = (localStorage.getItem('wpp.theme') || 'catppuccin') + '-' + mode
  document.querySelector('meta[name="color-scheme"]').content = mode
} catch {}

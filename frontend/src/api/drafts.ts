// Rascunho por conversa: o que foi escrito e não enviado volta ao abrir a conversa de novo.
// Fica na memória e na sessionStorage desta aba (sobrevive a recarregar, some ao fechar a
// aba); nunca vai para o servidor.

const PREFIX = 'wpp.draft.'
const memory = new Map<string, string>()

export function getDraft(jid: string): string {
  const cached = memory.get(jid)
  if (cached !== undefined) return cached
  try {
    const stored = sessionStorage.getItem(PREFIX + jid) ?? ''
    memory.set(jid, stored)
    return stored
  } catch {
    return ''
  }
}

export function setDraft(jid: string, text: string): void {
  const value = text.trim() ? text : ''
  memory.set(jid, value)
  try {
    if (value) sessionStorage.setItem(PREFIX + jid, value)
    else sessionStorage.removeItem(PREFIX + jid)
  } catch {
    // Sem storage: o rascunho vale só até recarregar.
  }
}

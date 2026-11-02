import type { Chat, Live, Mention, Message } from '../api/types'

const PLACEHOLDER: Record<string, string> = {
  image: '[imagem]',
  audio: '[áudio]',
  video: '[vídeo]',
  doc: '[documento]',
  sticker: '[figurinha]',
  // O WhatsApp não entrega o conteúdo a aparelhos conectados.
  view_once: '📷 Visualização única — abra no celular',
  revoked: '🚫 Mensagem apagada',
  other: '[mensagem]',
}

export function messageText(m: Message): string {
  const body = m.body && withMentionNames(m.body, m.mentions)
  if (m.kind === 'text') return body ?? ''
  const tag = PLACEHOLDER[m.kind] ?? '[mensagem]'
  return body ? `${tag} ${body}` : tag
}

/** Marcação de todos do grupo (o backend usa este "jid"; não é uma pessoa). */
const MENTION_EVERYONE = 'everyone'
/** Como o "@todos" aparece escrito, conforme o idioma de quem mandou. */
const EVERYONE_WORDS = 'todos|todas|todes|all|everyone|todo'

/** Uma parte do texto: comum ou uma marcação (`@Nome`). */
export type TextPart = { text: string; mention?: Mention }

/** Divide o texto nas marcações (`@` + usuário do jid), na ordem em que aparecem. */
export function splitMentions(text: string, mentions: Mention[] | undefined): TextPart[] {
  const byUser = new Map<string, Mention>()
  let everyone: Mention | undefined
  for (const m of mentions ?? []) {
    if (m.jid === MENTION_EVERYONE) everyone = m
    else byUser.set(m.jid.split('@')[0], m)
  }
  if (byUser.size === 0 && !everyone) return [{ text }]
  // Usuários mais longos primeiro, e sem dígito depois, para @123 não pegar o começo de @1234.
  const users = [...byUser.keys()].sort((a, b) => b.length - a.length).map(escapeRe)
  // "Marcar todos" chega sem jid: destaca a palavra como foi escrita.
  if (everyone) users.push(EVERYONE_WORDS)
  const re = new RegExp(`@(${users.join('|')})(?![\\w])`, 'gi')
  const parts: TextPart[] = []
  let last = 0
  for (const match of text.matchAll(re)) {
    const at = match.index
    if (at > last) parts.push({ text: text.slice(last, at) })
    const person = byUser.get(match[1])
    if (person) parts.push({ text: `@${person.name ?? match[1]}`, mention: person })
    else parts.push({ text: match[0], mention: everyone })
    last = at + match[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

/** O texto com cada marcação trocada pelo `@Nome`. */
export function withMentionNames(text: string, mentions: Mention[] | undefined): string {
  return splitMentions(text, mentions)
    .map((p) => p.text)
    .join('')
}

/** Uma parte do texto: comum ou um link (`url`: endereço http/https pronto para abrir). */
export type LinkPart = { text: string; url?: string }

// http(s)://… ou www.…, até o primeiro espaço. A pontuação do fim fica de fora (veja `trimUrl`).
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi

/** Tira do fim a pontuação da frase e o `)` que não abriu dentro do link. */
function trimUrl(raw: string): string {
  let url = raw.replace(/[.,;:!?'"*_~]+$/, '')
  while (url.endsWith(')') && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0)) {
    url = url.slice(0, -1).replace(/[.,;:!?'"*_~]+$/, '')
  }
  return url
}

/** Divide o texto nos links que dá para abrir. Só http e https. */
export function splitLinks(text: string): LinkPart[] {
  const parts: LinkPart[] = []
  let last = 0
  for (const match of text.matchAll(URL_RE)) {
    const shown = trimUrl(match[0])
    const href = /^www\./i.test(shown) ? `https://${shown}` : shown
    let url: URL
    try {
      url = new URL(href)
    } catch {
      continue
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') continue
    if (match.index > last) parts.push({ text: text.slice(last, match.index) })
    parts.push({ text: shown, url: url.href })
    last = match.index + shown.length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

/** Uma parte do texto: comum ou um telefone (`phone`: só dígitos, com DDI). */
export type PhonePart = { text: string; phone?: string }

// Com `+` (qualquer país) ou no formato brasileiro com DDD: (11) 99999-8888, 11 3333-4444,
// 11999998888. Sem pontos nem barras, para não pegar CPF, valores e datas.
const PHONE_RE = /(?<![\w+])(?:\+\d[\d ()-]{6,18}\d|\(?\d{2}\)?[ -]?\d{4,5}[ -]?\d{4})(?!\w)/g

/** Só dígitos, com DDI, se o trecho parece um telefone; senão `null`. */
export function phoneDigits(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (raw.startsWith('+')) return digits.length >= 10 && digits.length <= 15 ? digits : null
  // Brasil sem DDI: DDD (sem zero) e fixo (8 dígitos) ou celular (9, começando com 9).
  if (!/^[1-9][1-9]/.test(digits)) return null
  if (digits.length === 11 && digits[2] === '9') return `55${digits}`
  if (digits.length === 10 && digits[2] >= '2' && digits[2] <= '8') return `55${digits}`
  return null
}

/** Divide o texto nos telefones que dá para abrir no WhatsApp. */
export function splitPhones(text: string): PhonePart[] {
  const parts: PhonePart[] = []
  let last = 0
  for (const match of text.matchAll(PHONE_RE)) {
    const phone = phoneDigits(match[0])
    if (!phone) continue
    if (match.index > last) parts.push({ text: text.slice(last, match.index) })
    parts.push({ text: match[0], phone })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export type Section = 'chats' | 'archived' | 'status' | 'channels'

export const SECTION_TITLE: Record<Section, string> = {
  chats: 'Conversas',
  archived: 'Arquivadas',
  status: 'Status',
  channels: 'Canais',
}

/** Seção da barra lateral onde a conversa aparece. */
export function chatSection(c: Chat): Section {
  if (c.jid === 'status@broadcast') return 'status'
  if (c.jid.endsWith('@newsletter')) return 'channels'
  return c.archived ? 'archived' : 'chats'
}

/** Status e canais: só leitura (enviar no status publicaria um status). */
export function isReadOnly(jid: string): boolean {
  return jid === 'status@broadcast' || jid.endsWith('@newsletter')
}

export function chatName(c: Chat): string {
  if (c.name) return c.name
  if (c.phone) return formatPhone(c.phone)
  if (c.jid.endsWith('@broadcast')) return 'Status'
  if (c.jid.endsWith('@newsletter')) return 'Canal'
  // Sem nome nem telefone, o id interno (@lid) não diz nada a ninguém.
  return c.is_group ? 'Grupo sem nome' : 'Contato sem nome'
}

/** Telefone legível; números do Brasil como "+55 11 98888-7777". */
export function formatPhone(digits: string): string {
  const br = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(digits)
  return br ? `+55 ${br[1]} ${br[2]}-${br[3]}` : `+${digits}`
}

/** Nome vindo do backend: "+5511..." (sem nome) vira telefone formatado. */
export function formatPerson(name: string): string {
  return name.startsWith('+') ? formatPhone(name.slice(1)) : name
}

export function senderName(m: Message): string {
  return m.sender_name ? formatPerson(m.sender_name) : 'Desconhecido'
}

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** "820 B", "340 KB", "2,4 MB". */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${decimal.format(n / (1024 * 1024))} MB`
}

/** "0:07", "12:34", "1:02:03". */
export function formatDuration(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(Math.floor(total % 60)).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

export function formatTime(ts: number): string {
  return time.format(new Date(ts * 1000))
}

/** Hora se for hoje; data caso contrário. */
export function formatListTime(ts: number | null): string {
  if (ts == null) return ''
  const d = new Date(ts * 1000)
  return d.toDateString() === new Date().toDateString() ? time.format(d) : day.format(d)
}

/** Código de verificação na mensagem (4 a 8 dígitos, com ou sem hífen/espaço no meio). */
export function securityCode(text: string | null): string | null {
  const m = text?.match(/(?<![\d])(\d{3}[- ]?\d{3}|\d{4,8})(?![\d])/)
  return m ? m[1].replace(/[- ]/g, '') : null
}

/**
 * Copia texto. A API de área de transferência só existe em contexto seguro (HTTPS ou
 * localhost); pelo IP do Tailscale em HTTP cai no método antigo.
 */
export async function copyText(text: string): Promise<void> {
  if (window.isSecureContext && navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  if (!ok) throw new Error('Não foi possível copiar')
}

/** Cores de destaque do Catppuccin Mocha para os nomes em grupos. */
export const SENDER_COLORS = [
  'rosewater',
  'flamingo',
  'pink',
  'mauve',
  'red',
  'maroon',
  'peach',
  'yellow',
  'green',
  'teal',
  'sky',
  'sapphire',
  'blue',
  'lavender',
]

/** As cores em ordem aleatória: cada abertura da conversa sorteia de novo. */
export function shuffledPalette(): number[] {
  const order = SENDER_COLORS.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

/** Um caractere minúsculo e sem acento (o mesmo `fold` do backend, caractere a caractere). */
function foldChar(c: string): string {
  const base = c.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return base.length === 1 ? base : c.toLowerCase()
}

/** Texto minúsculo e sem acento, para comparar na busca. */
export function foldText(text: string): string {
  return Array.from(text, foldChar).join('')
}

/** Uma parte do texto, marcada quando é o trecho buscado. */
export type HitPart = { text: string; hit?: boolean }

/** Divide `text` nos trechos que batem com `query` (sem ligar para maiúsculas e acentos). */
export function highlight(text: string, query: string): HitPart[] {
  const needle = foldText(query.trim())
  if (!needle) return [{ text }]
  const chars = Array.from(text)
  const folded = chars.map(foldChar)
  const parts: HitPart[] = []
  let plain = ''
  let i = 0
  while (i < chars.length) {
    if (folded.slice(i, i + needle.length).join('') === needle) {
      if (plain) parts.push({ text: plain })
      plain = ''
      const len = Array.from(needle).length
      parts.push({ text: chars.slice(i, i + len).join(''), hit: true })
      i += len
    } else {
      plain += chars[i]
      i += 1
    }
  }
  if (plain) parts.push({ text: plain })
  return parts
}

/** Recorte do texto começando um pouco antes do primeiro trecho buscado. */
export function snippet(text: string, query: string, before = 30): string {
  const flat = text.replace(/\s+/g, ' ')
  const at = foldText(flat).indexOf(foldText(query.trim()))
  if (at <= before) return flat
  const start = flat.lastIndexOf(' ', at - before)
  return `…${flat.slice(start > 0 ? start + 1 : at - before)}`
}

/** "digitando…", "Ana está gravando áudio…", "online", "visto por último hoje às 14:03". */
export function liveText(live: Live | undefined): string | null {
  if (!live) return null
  if (live.typing) {
    const what = live.typing.kind === 'audio' ? 'gravando áudio…' : 'digitando…'
    return live.typing.who ? `${formatPerson(live.typing.who)} está ${what}` : what
  }
  if (live.online) return 'online'
  if (live.lastSeen) {
    const d = new Date(live.lastSeen * 1000)
    const today = new Date()
    const yesterday = new Date(today.getTime() - 86_400_000)
    const when =
      d.toDateString() === today.toDateString()
        ? 'hoje'
        : d.toDateString() === yesterday.toDateString()
          ? 'ontem'
          : `em ${day.format(d)}`
    return `visto por último ${when} às ${time.format(d)}`
  }
  return null
}

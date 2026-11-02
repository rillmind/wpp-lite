// Mensagem de voz gravada no navegador. O WhatsApp espera Ogg/Opus: o Firefox grava assim
// direto; o Chrome só grava Opus dentro de WebM, então os mesmos pacotes Opus são
// reembalados em Ogg aqui (sem recodificar). O Safari grava MP4/AAC, que vai como está.

export interface Recorded {
  blob: Blob
  seconds: number
  /** 64 valores de 0 a 100, em hexadecimal (a forma de onda da mensagem de voz). */
  waveform: string | null
}

/** Gravar áudio só funciona em contexto seguro (HTTPS ou localhost). */
export function voiceSupported(): boolean {
  return window.isSecureContext && !!navigator.mediaDevices?.getUserMedia && 'MediaRecorder' in window
}

const PREFERRED = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/mp4']

export class VoiceRecorder {
  private recorder: MediaRecorder
  private chunks: Blob[] = []
  private stream: MediaStream
  private done: Promise<void>

  private constructor(stream: MediaStream) {
    this.stream = stream
    const mimeType = PREFERRED.find((t) => MediaRecorder.isTypeSupported(t))
    this.recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32_000 } : undefined)
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.done = new Promise((resolve) => {
      this.recorder.onstop = () => resolve()
    })
    this.recorder.start()
  }

  /** Pede o microfone e começa a gravar. */
  static async start(): Promise<VoiceRecorder> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    })
    return new VoiceRecorder(stream)
  }

  /** Para e descarta. */
  cancel(): void {
    if (this.recorder.state !== 'inactive') this.recorder.stop()
    this.release()
  }

  /** Para e devolve o áudio pronto para enviar. */
  async finish(): Promise<Recorded> {
    if (this.recorder.state !== 'inactive') this.recorder.stop()
    await this.done
    this.release()
    const type = this.recorder.mimeType || this.chunks[0]?.type || ''
    const raw = new Blob(this.chunks, { type })
    let blob = raw
    let seconds: number | null = null
    if (type.startsWith('audio/webm')) {
      const ogg = webmToOgg(new Uint8Array(await raw.arrayBuffer()))
      blob = new Blob([ogg.bytes], { type: 'audio/ogg' })
      seconds = ogg.seconds
    } else if (type.startsWith('audio/ogg')) {
      blob = new Blob([raw], { type: 'audio/ogg' })
    } else {
      blob = new Blob([raw], { type: 'audio/mp4' })
    }
    const wave = await waveform(raw)
    return {
      blob,
      seconds: Math.max(1, Math.round(seconds ?? wave.seconds ?? 1)),
      waveform: wave.hex,
    }
  }

  private release() {
    for (const t of this.stream.getTracks()) t.stop()
  }
}

/** Forma de onda (64 barras de 0 a 100) e duração, decodificando o áudio gravado. */
async function waveform(blob: Blob): Promise<{ hex: string | null; seconds: number | null }> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return { hex: null, seconds: null }
  const ctx = new Ctx()
  try {
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer())
    const data = audio.getChannelData(0)
    const bars = 64
    const step = Math.max(1, Math.floor(data.length / bars))
    const levels: number[] = []
    for (let b = 0; b < bars; b++) {
      let sum = 0
      const end = Math.min(data.length, (b + 1) * step)
      for (let i = b * step; i < end; i++) sum += data[i] * data[i]
      levels.push(Math.sqrt(sum / Math.max(1, end - b * step)))
    }
    const peak = Math.max(...levels, 1e-6)
    const hex = levels
      .map((v) => Math.round((v / peak) * 100))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
    return { hex, seconds: audio.duration }
  } catch {
    // Sem forma de onda a mensagem de voz vai igual (o celular desenha reta).
    return { hex: null, seconds: null }
  } finally {
    void ctx.close()
  }
}

// --- WebM (Matroska) → Ogg, só para uma faixa de Opus ---

const ID = {
  ebml: 0x1a45dfa3,
  segment: 0x18538067,
  cluster: 0x1f43b675,
  tracks: 0x1654ae6b,
  trackEntry: 0xae,
  blockGroup: 0xa0,
  codecPrivate: 0x63a2,
  simpleBlock: 0xa3,
  block: 0xa1,
}
/** Elementos "contêiner": entra neles em vez de pular (o tamanho pode ser desconhecido). */
const MASTERS = new Set([ID.segment, ID.cluster, ID.tracks, ID.trackEntry, ID.blockGroup])

function readId(buf: Uint8Array, pos: number): [number, number] {
  const first = buf[pos]
  let len = 1
  while (len <= 4 && !(first & (0x80 >> (len - 1)))) len++
  let id = 0
  for (let i = 0; i < len; i++) id = id * 256 + buf[pos + i]
  return [id, len]
}

/** Tamanho (sem o bit de marcação); `-1` quando é "desconhecido" (todos os bits 1). */
function readSize(buf: Uint8Array, pos: number): [number, number] {
  const first = buf[pos]
  let len = 1
  while (len <= 8 && !(first & (0x80 >> (len - 1)))) len++
  let value = first & (0xff >> len)
  let allOnes = value === 0xff >> len
  for (let i = 1; i < len; i++) {
    value = value * 256 + buf[pos + i]
    if (buf[pos + i] !== 0xff) allOnes = false
  }
  return [allOnes ? -1 : value, len]
}

function webmToOgg(webm: Uint8Array): { bytes: Uint8Array<ArrayBuffer>; seconds: number } {
  let head: Uint8Array | null = null
  const packets: Uint8Array[] = []
  let pos = 0
  while (pos < webm.length - 1) {
    const [id, idLen] = readId(webm, pos)
    const [size, sizeLen] = readSize(webm, pos + idLen)
    const start = pos + idLen + sizeLen
    if (MASTERS.has(id)) {
      pos = start
      continue
    }
    if (size < 0) break
    const end = Math.min(webm.length, start + size)
    if (id === ID.codecPrivate) head = webm.slice(start, end)
    if (id === ID.simpleBlock || id === ID.block) {
      // Faixa (vint), tempo (2 bytes), flags (1 byte); depois o pacote (sem "lacing").
      const [, trackLen] = readSize(webm, start)
      const flags = webm[start + trackLen + 2]
      if ((flags & 0x06) === 0) packets.push(webm.slice(start + trackLen + 3, end))
    }
    pos = end
  }
  return oggOpus(head ?? opusHead(1), packets)
}

/** Cabeçalho Opus padrão (para quando o WebM não trouxer o dele). */
function opusHead(channels: number): Uint8Array {
  const h = new Uint8Array(19)
  h.set(new TextEncoder().encode('OpusHead'))
  const v = new DataView(h.buffer)
  v.setUint8(8, 1)
  v.setUint8(9, channels)
  v.setUint16(10, 312, true)
  v.setUint32(12, 48_000, true)
  return h
}

/** Amostras (a 48 kHz) de um pacote Opus, pelo byte TOC. */
function opusSamples(p: Uint8Array): number {
  if (p.length === 0) return 0
  const config = p[0] >> 3
  const ms =
    config < 12 ? [10, 20, 40, 60][config % 4] : config < 16 ? [10, 20][config % 2] : [2.5, 5, 10, 20][config % 4]
  const code = p[0] & 3
  const frames = code === 0 ? 1 : code === 3 ? (p[1] ?? 0) & 0x3f : 2
  return frames * ms * 48
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let r = i << 24
    for (let j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1
    t[i] = r >>> 0
  }
  return t
})()

function crc(bytes: Uint8Array): number {
  let c = 0
  for (const b of bytes) c = ((c << 8) ^ CRC_TABLE[((c >>> 24) ^ b) & 0xff]) >>> 0
  return c
}

function oggOpus(head: Uint8Array, packets: Uint8Array[]): { bytes: Uint8Array<ArrayBuffer>; seconds: number } {
  const serial = (Math.random() * 0xffffffff) >>> 0
  const pages: Uint8Array[] = []
  let seq = 0
  const page = (data: Uint8Array[], granule: number, flags: number) => {
    const lacing: number[] = []
    for (const p of data) {
      let n = p.length
      while (n >= 255) {
        lacing.push(255)
        n -= 255
      }
      lacing.push(n)
    }
    const body = data.reduce((s, p) => s + p.length, 0)
    const out = new Uint8Array(27 + lacing.length + body)
    const v = new DataView(out.buffer)
    out.set(new TextEncoder().encode('OggS'))
    v.setUint8(5, flags)
    v.setBigUint64(6, BigInt(granule), true)
    v.setUint32(14, serial, true)
    v.setUint32(18, seq++, true)
    v.setUint8(26, lacing.length)
    out.set(lacing, 27)
    let at = 27 + lacing.length
    for (const p of data) {
      out.set(p, at)
      at += p.length
    }
    v.setUint32(22, crc(out), true)
    pages.push(out)
  }
  const vendor = new TextEncoder().encode('wpp-lite')
  const tags = new Uint8Array(8 + 4 + vendor.length + 4)
  tags.set(new TextEncoder().encode('OpusTags'))
  new DataView(tags.buffer).setUint32(8, vendor.length, true)
  tags.set(vendor, 12)

  page([head], 0, 0x02)
  page([tags], 0, 0)
  let granule = 0
  // Até ~1 s de áudio por página (no máximo 255 segmentos de lacing).
  for (let i = 0; i < packets.length; ) {
    const batch: Uint8Array[] = []
    let segs = 0
    while (i < packets.length && batch.length < 50) {
      const need = Math.floor(packets[i].length / 255) + 1
      if (segs + need > 255) break
      batch.push(packets[i])
      segs += need
      granule += opusSamples(packets[i])
      i++
    }
    if (batch.length === 0) break
    page(batch, granule, i >= packets.length ? 0x04 : 0)
  }
  const total = pages.reduce((s, p) => s + p.length, 0)
  const bytes = new Uint8Array(total)
  let at = 0
  for (const p of pages) {
    bytes.set(p, at)
    at += p.length
  }
  return { bytes, seconds: granule / 48_000 }
}

export const _test = { webmToOgg, opusSamples, crc }

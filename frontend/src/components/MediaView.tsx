import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { api } from '../api/client'
import { isLoaded, isStored, loadImage, useImage } from '../api/images'
import type { Message } from '../api/types'
import { formatBytes, formatDuration } from './format'
import { Icon } from './Icon'

const MAX_W = 280
const MAX_H = 320
const STICKER = 140
const AUDIO_W = 260

const LABEL: Record<string, string> = {
  image: 'Imagem',
  sticker: 'Figurinha',
  video: 'Vídeo',
  audio: 'Áudio',
  doc: 'Documento',
}

/** Caixa com a proporção da mídia, para a conversa não pular quando ela chegar. */
function boxSize(m: Message): CSSProperties {
  if (m.kind === 'sticker') return { width: STICKER, height: STICKER }
  if (m.kind === 'audio' || m.kind === 'doc') return { width: AUDIO_W }
  const w = m.media?.width ?? 0
  const h = m.media?.height ?? 0
  if (!w || !h) return { width: MAX_W, height: Math.round(MAX_W * 0.75) }
  const scale = Math.min(MAX_W / w, MAX_H / h, 1)
  return { width: Math.max(Math.round(w * scale), 160), height: Math.max(Math.round(h * scale), 90) }
}

/**
 * Imagem, figurinha, vídeo ou áudio de uma mensagem. Só baixa quando a pessoa clica; o que já
 * foi baixado aparece direto, ao reabrir a conversa ou a página (ver `api/images.ts`).
 */
export function MediaView({ chatJid, message }: { chatJid: string; message: Message }) {
  const path = api.mediaPath(chatJid, message.id)
  // Cada tentativa remonta o download (uma falha não fica guardada). 0 = ainda não pedida.
  const [attempt, setAttempt] = useState(() => (isLoaded(path) ? 1 : 0))
  // Pedida agora, com clique: só então vídeo e áudio tocam e o documento é salvo.
  const [clicked, setClicked] = useState(false)
  useEffect(() => {
    if (attempt !== 0) return
    let alive = true
    void isStored(path).then((hit) => {
      if (alive && hit) setAttempt((a) => a || 1)
    })
    return () => {
      alive = false
    }
  }, [path, attempt])
  const kind = message.kind
  const label = kind === 'doc' ? (message.media?.file_name ?? LABEL.doc) : (LABEL[kind] ?? 'Mídia')
  const sound = message.media?.sound ? api.soundPath(chatJid, message.id) : null
  const details = [
    sound ? 'com som' : null,
    message.media?.seconds ? formatDuration(message.media.seconds) : null,
    message.media?.size ? formatBytes(message.media.size) : null,
  ].filter(Boolean)

  return (
    <div className={`media media--${kind}`} style={boxSize(message)}>
      {attempt === 0 ? (
        <button
          type="button"
          className="media__download"
          onClick={() => {
            setClicked(true)
            setAttempt(1)
          }}
        >
          <span className="media__icon" aria-hidden="true">
            <Icon name={kind === 'audio' || kind === 'video' ? 'play' : kind === 'doc' ? 'file' : 'download'} size={20} />
          </span>
          <span className="media__label">{[label, ...details].join(' · ')}</span>
          {kind !== 'audio' && kind !== 'doc' && <span className="media__hint">Clique para baixar</span>}
        </button>
      ) : (
        <Download
          key={attempt}
          path={path}
          kind={kind}
          label={label}
          sound={sound}
          clicked={clicked}
          onRetry={() => {
            setClicked(true)
            setAttempt((a) => a + 1)
          }}
        />
      )}
    </div>
  )
}

interface DownloadProps {
  path: string
  kind: string
  label: string
  /** Som da figurinha com som (caminho na API). */
  sound: string | null
  /** Pedida com clique agora; sem isso (já baixada antes) não toca nem salva sozinha. */
  clicked: boolean
  onRetry: () => void
}

function Download({ path, kind, label, sound, clicked, onRetry }: DownloadProps) {
  const file = useImage(path, true)
  const [zoom, setZoom] = useState(false)
  const save = useRef<HTMLAnchorElement>(null)

  // Documento: assim que baixa, entrega ao navegador para salvar (uma vez).
  const readyUrl = file.status === 'ready' ? file.url : null
  useEffect(() => {
    if (kind === 'doc' && readyUrl && clicked) save.current?.click()
  }, [kind, readyUrl, clicked])

  if (file.status === 'ready') {
    // Vídeo e áudio já tocam: o clique em "baixar" foi o pedido para ver/ouvir.
    if (kind === 'video') return <video src={file.url} controls autoPlay={clicked} playsInline />
    if (kind === 'audio') return <audio src={file.url} controls autoPlay={clicked} />
    if (kind === 'doc')
      return (
        <a ref={save} className="media__download media__saved" href={file.url} download={label}>
          <span className="media__icon" aria-hidden="true">
            <Icon name="file" size={20} />
          </span>
          <span className="media__label">{label}</span>
          <span className="media__hint">Salvar de novo</span>
        </a>
      )
    if (kind === 'sticker')
      return (
        <>
          <img src={file.url} alt={label} />
          {sound && <StickerSound path={sound} />}
        </>
      )
    return (
      <>
        <button type="button" className="media__open" onClick={() => setZoom(true)} aria-label="Ampliar imagem">
          <img src={file.url} alt={label} />
        </button>
        {zoom && <Lightbox url={file.url} onClose={() => setZoom(false)} />}
      </>
    )
  }
  if (file.status === 'none' || file.status === 'error') {
    return (
      <button type="button" className="media__download" onClick={onRetry}>
        <span>{label} indisponível</span>
        <span className="media__hint">Clique para tentar de novo</span>
      </button>
    )
  }
  return <span className="media__placeholder">Baixando…</span>
}

/** Quantas vezes o som toca por clique, como no WhatsApp. */
const SOUND_PLAYS = 3

/** Botão do som da figurinha: chega mudo, como no WhatsApp, e toca ao clicar. */
function StickerSound({ path }: { path: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle')
  // Elemento na página: ao sair da tela (trocou de conversa) o navegador para o som sozinho.
  const audio = useRef<HTMLAudioElement>(null)
  const plays = useRef(0)

  const toggle = async () => {
    const el = audio.current
    if (!el) return
    if (state === 'playing') {
      el.pause()
      setState('idle')
      return
    }
    setState('loading')
    try {
      const url = await loadImage(path)
      if (!url) throw new Error('sem som')
      if (el.src !== url) el.src = url
      plays.current = 0
      el.currentTime = 0
      await el.play()
      setState('playing')
    } catch {
      setState('error')
    }
  }

  const onEnded = () => {
    plays.current += 1
    if (plays.current < SOUND_PLAYS) void audio.current?.play()
    else setState('idle')
  }

  const label =
    state === 'playing' ? 'Parar o som' : state === 'error' ? 'Som indisponível; tentar de novo' : 'Tocar o som'
  return (
    <>
      <audio ref={audio} onEnded={onEnded} hidden />
      <button
        type="button"
        className={`media__sound media__sound--${state}`}
        onClick={() => void toggle()}
        aria-label={label}
        title={label}
      >
        <Icon name="sound" size={16} />
      </button>
    </>
  )
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  // Em captura e sem propagar: com a imagem ampliada, Esc só fecha a imagem (não a conversa).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  return (
    <div className="lightbox" role="dialog" aria-label="Imagem ampliada" onClick={onClose}>
      <img src={url} alt="Imagem ampliada" />
    </div>
  )
}

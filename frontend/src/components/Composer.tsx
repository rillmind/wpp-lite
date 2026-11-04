import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { getDraft, setDraft } from '../api/drafts'
import { VoiceRecorder, voiceSupported, type Recorded } from '../api/voice'
import { formatBytes, formatDuration } from './format'
import { Icon } from './Icon'

/** Maior arquivo aceito pelo backend (o limite do WhatsApp para mídia). */
const MAX_FILE_BYTES = 100 * 1024 * 1024
/** Segurar o microfone por mais que isso e soltar envia; um toque rápido só começa a gravar. */
const HOLD_MS = 500
/** Mensagem de voz mais longa que isso para sozinha e envia. */
const MAX_VOICE_SECS = 15 * 60

export interface FileMeta {
  width?: number
  height?: number
  seconds?: number
}

interface Props {
  /** Conversa: o rascunho fica guardado por ela. */
  jid: string
  disabled: boolean
  onSend: (text: string) => Promise<void>
  /** Um arquivo por vez; `caption` só no primeiro de um lote. */
  onSendFile: (file: File, caption: string | null, meta: FileMeta) => Promise<void>
  onSendVoice: (rec: Recorded) => Promise<void>
  /** Respondendo a esta mensagem (só texto vai como resposta). */
  reply: { who: string; text: string } | null
  onCancelReply: () => void
  /** Editando esta mensagem sua: a caixa vem com o texto dela e "Salvar" troca o texto. */
  editing: { id: string; text: string } | null
  onCancelEdit: () => void
}

interface Pending {
  id: number
  file: File
  /** URL local (memória da aba) para a miniatura de imagens. */
  preview: string | null
}

function isTouch(): boolean {
  return window.matchMedia('(pointer: coarse)').matches
}

/** Dimensões (e duração) que o celular de quem recebe usa para montar a mensagem. */
async function probe(file: File): Promise<FileMeta> {
  const url = URL.createObjectURL(file)
  try {
    if (file.type.startsWith('image/')) {
      const img = new Image()
      img.src = url
      await img.decode()
      return { width: img.naturalWidth, height: img.naturalHeight }
    }
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.src = url
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('vídeo ilegível'))
      })
      return {
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
        seconds: Number.isFinite(video.duration) ? Math.round(video.duration) : undefined,
      }
    }
  } catch {
    // Sem dimensões o envio funciona igual.
  } finally {
    URL.revokeObjectURL(url)
  }
  return {}
}

let nextId = 1

export function Composer({
  jid,
  disabled,
  onSend,
  onSendFile,
  onSendVoice,
  reply,
  onCancelReply,
  editing,
  onCancelEdit,
}: Props) {
  const [text, setTextState] = useState(() => getDraft(jid))
  const [files, setFiles] = useState<Pending[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const picker = useRef<HTMLInputElement>(null)
  // O que está escrito vira o rascunho da conversa (some ao enviar).
  // Editando uma mensagem, a caixa não é rascunho: o rascunho volta ao terminar.
  const setText = (value: string) => {
    setTextState(value)
    if (!editingRef.current) setDraft(jid, value)
  }
  const editingRef = useRef(editing !== null)
  editingRef.current = editing !== null
  const filesRef = useRef(files)
  useEffect(() => {
    filesRef.current = files
  }, [files])

  // Ao abrir a conversa (o componente é montado por conversa), já deixa pronto para
  // escrever. Em tela de toque não: abriria o teclado só para ler.
  useEffect(() => {
    if (!disabled && !isTouch()) input.current?.focus()
  }, [disabled])

  // Ao escolher "Editar", a caixa recebe o texto da mensagem (o que estava escrito é
  // guardado e volta ao cancelar).
  const editingId = editing?.id ?? null
  const beforeEdit = useRef<string | null>(null)
  useEffect(() => {
    if (!editing) {
      if (beforeEdit.current !== null) setText(beforeEdit.current)
      beforeEdit.current = null
      return
    }
    beforeEdit.current ??= text
    setText(editing.text)
    input.current?.focus()
    // Só quando muda a mensagem sendo editada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId])

  // Ao escolher "Responder", volta o foco para a caixa.
  const replyKey = reply ? `${reply.who}\n${reply.text}` : null
  useEffect(() => {
    if (replyKey) input.current?.focus()
  }, [replyKey])

  // Gravação de voz: o gravador, desde quando (para o relógio) e o relógio em si.
  const recorder = useRef<VoiceRecorder | null>(null)
  const startedAt = useRef(0)
  const [recording, setRecording] = useState<{ since: number } | null>(null)
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!recording) return
    const t = setInterval(() => {
      const secs = (Date.now() - recording.since) / 1000
      setElapsed(secs)
      if (secs >= MAX_VOICE_SECS) void stopRecording(true)
    }, 250)
    return () => clearInterval(t)
    // stopRecording só lê refs e estado estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording])
  // Saiu da conversa gravando: descarta.
  useEffect(() => () => recorder.current?.cancel(), [])

  async function startRecording(e: React.PointerEvent) {
    if (recorder.current || disabled) return
    const pressedAt = Date.now()
    // Segurou e soltou: envia. Toque rápido: continua gravando, com os botões.
    const onUp = () => {
      window.removeEventListener('pointerup', onUp)
      if (Date.now() - pressedAt >= HOLD_MS) void stopRecording(true)
    }
    if (e.pointerType !== 'mouse' || e.button === 0) window.addEventListener('pointerup', onUp)
    setError(null)
    try {
      recorder.current = await VoiceRecorder.start()
      startedAt.current = Date.now()
      setElapsed(0)
      setRecording({ since: Date.now() })
    } catch {
      window.removeEventListener('pointerup', onUp)
      setError('Não deu para usar o microfone: libere a permissão do site.')
    }
  }

  async function stopRecording(send: boolean) {
    const rec = recorder.current
    if (!rec) return
    recorder.current = null
    setRecording(null)
    // Menos de 1 s é toque sem querer: descarta, como no celular.
    if (!send || Date.now() - startedAt.current < 1000) {
      rec.cancel()
      return
    }
    setSending(true)
    try {
      await onSendVoice(await rec.finish())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar o áudio')
    } finally {
      setSending(false)
    }
  }

  // Esc gravando: descarta (antes de o Esc da conversa tirar o foco ou fechar).
  useEffect(() => {
    if (!recording) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      void stopRecording(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording])

  // Solta as miniaturas da memória ao sair da conversa.
  useEffect(() => () => filesRef.current.forEach((p) => p.preview && URL.revokeObjectURL(p.preview)), [])

  function addFiles(list: FileList | File[]) {
    const added: Pending[] = []
    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE_BYTES) {
        setError(`${file.name || 'Arquivo'} passa de ${formatBytes(MAX_FILE_BYTES)}`)
        continue
      }
      added.push({
        id: nextId++,
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      })
    }
    if (added.length) setFiles((fs) => [...fs, ...added])
  }

  function removeFile(id: number) {
    setFiles((fs) => {
      const gone = fs.find((p) => p.id === id)
      if (gone?.preview) URL.revokeObjectURL(gone.preview)
      return fs.filter((p) => p.id !== id)
    })
  }

  async function submit() {
    const value = text.trim()
    if ((!value && files.length === 0) || sending || disabled) return
    if (editing) {
      setSending(true)
      setError(null)
      try {
        await onSend(value)
        // Salvo: a caixa volta ao que estava escrito antes de editar.
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha ao editar')
      } finally {
        setSending(false)
      }
      return
    }
    setSending(true)
    setError(null)
    try {
      if (files.length === 0) {
        await onSend(value)
      } else {
        // O texto vira a legenda do primeiro arquivo.
        let caption: string | null = value || null
        for (const p of files) {
          await onSendFile(p.file, caption, await probe(p.file))
          caption = null
          removeFile(p.id)
        }
      }
      setText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao enviar')
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Computador: Enter envia, Shift+Enter quebra linha (e não interfere em composição IME).
    // Tela de toque: Enter sempre quebra linha; só o botão envia.
    if (isTouch()) return
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void submit()
    }
  }

  // Colar uma imagem (print, imagem copiada) ou arquivo anexa em vez de virar texto.
  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    if (e.clipboardData.files.length === 0) return
    e.preventDefault()
    addFiles(e.clipboardData.files)
  }

  const canSend = !disabled && !sending && (text.trim() !== '' || files.length > 0)
  // Sem nada escrito nem anexado, o botão de enviar vira o microfone.
  const showMic = voiceSupported() && !editing && text.trim() === '' && files.length === 0

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      {error && (
        <p className="composer__error" role="alert">
          {error}
        </p>
      )}
      {reply && (
        <div className="reply-bar">
          <span className="reply-bar__body">
            <span className="quote__who">{reply.who}</span>
            <span className="quote__text">{reply.text}</span>
          </span>
          <button
            type="button"
            className="attachment__remove"
            aria-label="Cancelar resposta"
            onPointerDown={(e) => e.preventDefault()}
            onClick={onCancelReply}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      )}
      {editing && (
        <div className="reply-bar">
          <span className="reply-bar__body">
            <span className="quote__who">Editando mensagem</span>
            <span className="quote__text">{editing.text}</span>
          </span>
          <button
            type="button"
            className="attachment__remove"
            aria-label="Cancelar edição"
            onPointerDown={(e) => e.preventDefault()}
            onClick={onCancelEdit}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      )}
      {files.length > 0 && (
        <ul className="attachments" aria-label="Arquivos para enviar">
          {files.map((p) => (
            <li key={p.id} className="attachment">
              {p.preview ? (
                <img className="attachment__thumb" src={p.preview} alt="" />
              ) : (
                <span className="attachment__thumb attachment__thumb--file" aria-hidden="true">
                  <Icon name="file" />
                </span>
              )}
              <span className="attachment__name">{p.file.name || 'Imagem colada'}</span>
              <span className="attachment__size">{formatBytes(p.file.size)}</span>
              <button
                type="button"
                className="attachment__remove"
                aria-label={`Remover ${p.file.name || 'arquivo'}`}
                disabled={sending}
                onClick={() => removeFile(p.id)}
              >
                <Icon name="close" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {recording ? (
        <div className="composer__row composer__row--recording">
          <button
            type="button"
            className="btn btn--ghost"
            aria-label="Descartar áudio"
            title="Descartar (Esc)"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => void stopRecording(false)}
          >
            <Icon name="trash" size={20} />
          </button>
          <span className="recording" role="status">
            <span className="recording__dot" aria-hidden="true" />
            {formatDuration(elapsed)}
          </span>
          <button
            type="button"
            className="btn btn--primary"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => void stopRecording(true)}
          >
            Enviar
          </button>
        </div>
      ) : (
        <div className="composer__row">
          <input
            ref={picker}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="btn btn--ghost composer__attach"
            aria-label="Anexar arquivo"
            title="Anexar imagem, vídeo ou documento"
            disabled={disabled || sending}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => picker.current?.click()}
          >
            <Icon name="clip" size={20} />
          </button>
          <textarea
            ref={input}
            className="composer__input"
            rows={1}
            value={text}
            placeholder={disabled ? 'Desconectado' : files.length ? 'Legenda (opcional)' : 'Mensagem'}
            aria-label="Mensagem"
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            enterKeyHint="enter"
          />
          {showMic ? (
            <button
              type="button"
              className="btn btn--primary composer__mic"
              aria-label="Gravar áudio"
              title="Gravar áudio (segure e solte para enviar, ou toque para gravar)"
              disabled={disabled || sending}
              onPointerDown={(e) => {
                e.preventDefault()
                void startRecording(e)
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {sending ? '…' : <Icon name="mic" size={20} />}
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!canSend}
              // Não tira o foco da caixa: no celular, isso fecharia o teclado a cada envio.
              onPointerDown={(e) => e.preventDefault()}
            >
              {editing ? 'Salvar' : sending && files.length ? 'Enviando…' : 'Enviar'}
            </button>
          )}
        </div>
      )}
    </form>
  )
}

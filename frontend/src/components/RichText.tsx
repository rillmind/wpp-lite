import { Fragment } from 'react'
import type { Mention } from '../api/types'
import { splitLinks, splitMentions, splitPhones } from './format'

interface Props {
  text: string
  mentions?: Mention[]
  /** Clique numa marcação (de outra pessoa): abre a conversa com ela. */
  onMention?: (jid: string) => void
  /** Clique num telefone (só dígitos, com DDI): abre a conversa com o número. */
  onPhone?: (digits: string) => void
}

/** Texto de mensagem com as marcações (`@Nome`), os links e os telefones clicáveis. */
export function RichText({ text, mentions, onMention, onPhone }: Props) {
  return (
    <>
      {splitMentions(text, mentions).map((p, i) => {
        const m = p.mention
        if (!m) return <Links key={i} text={p.text} onPhone={onPhone} />
        if (m.me || !onMention) {
          return (
            <span key={i} className={m.me ? 'mention mention--me' : 'mention'}>
              {p.text}
            </span>
          )
        }
        return (
          <button
            key={i}
            type="button"
            className="mention mention--link"
            title="Abrir conversa"
            onClick={() => onMention(m.jid)}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            {p.text}
          </button>
        )
      })}
    </>
  )
}

/** Links abrem numa aba nova, sem passar o endereço do app (`noreferrer`). */
function Links({ text, onPhone }: { text: string; onPhone?: (digits: string) => void }) {
  return (
    <>
      {splitLinks(text).map((p, i) =>
        p.url ? (
          <a
            key={i}
            className="text-link"
            href={p.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            title={p.url}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            {p.text}
          </a>
        ) : (
          <Phones key={i} text={p.text} onPhone={onPhone} />
        ),
      )}
    </>
  )
}

function Phones({ text, onPhone }: { text: string; onPhone?: (digits: string) => void }) {
  if (!onPhone) return <>{text}</>
  return (
    <>
      {splitPhones(text).map((p, i) =>
        p.phone ? (
          <button
            key={i}
            type="button"
            className="phone-link"
            title="Abrir conversa no WhatsApp"
            onClick={() => onPhone(p.phone!)}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            {p.text}
          </button>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  )
}

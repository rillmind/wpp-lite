/** Traços dos ícones, numa grade de 24×24. */
const PATHS = {
  chats: 'M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1z',
  status: 'M12 3a9 9 0 1 1-6.4 2.6M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  channels: 'M3 10v4h3l6 4V6L6 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  archived: 'M3 4h18v4H3zM5 8h14v12H5zM10 12h4',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0',
  bellOff: 'M6 16V11a6 6 0 0 1 9-5.2M18 11v5l1.5 2H6M10 20a2 2 0 0 0 4 0M4 4l16 16',
  pin: 'M9 4h6l-1 6 3 3v1H7v-1l3-3zM12 14v6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  close: 'M6 6l12 12M18 6L6 18',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5',
  clip: 'M21 11.5l-9 9a6 6 0 0 1-8.5-8.5l9-9a4 4 0 0 1 5.7 5.7l-9 9a2 2 0 0 1-2.9-2.9l8.3-8.3',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3M9 21h6',
  play: 'M8 5l11 7-11 7z',
  download: 'M12 4v12M6 11l6 6 6-6M5 20h14',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z',
  check: 'M5 13l4 4L19 7',
  checks: 'M2 12.5L6.5 17 16 7M11 15.5l1.5 1.5L22 7',
  camera: 'M4 7h4l2-3h4l2 3h4v13H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  ban: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8',
}

export type IconName = keyof typeof PATHS

interface Props {
  name: IconName
  size?: number
  className?: string
  /** Texto para leitor de tela; sem ele, o ícone é só decoração. */
  label?: string
}

/** Ícone de traço, na cor do texto ao redor. */
export function Icon({ name, size = 22, className, label }: Props) {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

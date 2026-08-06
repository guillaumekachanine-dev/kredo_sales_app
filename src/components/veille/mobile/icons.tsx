/**
 * Glyphes de la refonte mobile /veille.
 *
 * Même parti-pris que `src/components/cockpit/mobile/icons.tsx` : un seul
 * module par surface, tracé unique (stroke 1.7, `currentColor`), plutôt que des
 * `<svg>` recopiés à la main dans chaque écran.
 */
import { cn } from "@/lib/utils"

type IconProps = { className?: string }

function Glyph({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-5", className)}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IconDocument({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5Z" />
      <path d="M14 3v4.5h4.5M8.75 12.5h6.5M8.75 16h4" />
    </Glyph>
  )
}

export function IconChevronRight({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
    </Glyph>
  )
}

export function IconChevronDown({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="m5.5 9.5 6.5 6.5 6.5-6.5" />
    </Glyph>
  )
}

export function IconChevronLeft({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </Glyph>
  )
}

export function IconSearch({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <circle cx="11" cy="11" r="6.25" />
      <path d="m15.6 15.6 4.4 4.4" />
    </Glyph>
  )
}

export function IconClose({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Glyph>
  )
}

export function IconTag({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M3.5 11.2V4.8a1.3 1.3 0 0 1 1.3-1.3h6.4a1.3 1.3 0 0 1 .92.38l8 8a1.3 1.3 0 0 1 0 1.84l-6.4 6.4a1.3 1.3 0 0 1-1.84 0l-8-8a1.3 1.3 0 0 1-.38-.92Z" />
      <path d="M7.75 7.75h.01" />
    </Glyph>
  )
}

export function IconCalendar({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="1.5" />
      <path d="M3.5 9.75h17M8 3.5V6.5M16 3.5V6.5" />
    </Glyph>
  )
}

export function IconFilter({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M3.5 5.5h17l-6.75 7.6v5.6l-3.5 1.8v-7.4Z" />
    </Glyph>
  )
}

export function IconExternalLink({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M13.5 4.5H19.5V10.5M19.5 4.5 11 13" />
      <path d="M18 14.5v4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6h4" />
    </Glyph>
  )
}

export function IconAlertCircle({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M12 7.75v4.75M12 16h.01" />
    </Glyph>
  )
}

export function IconBook({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M12 6.75C10.4 5.4 8.5 4.75 6 4.75H3.5v13H6c2.5 0 4.4.65 6 2 1.6-1.35 3.5-2 6-2h2.5v-13H18c-2.5 0-4.4.65-6 1.9Z" />
      <path d="M12 6.75v12" />
    </Glyph>
  )
}

export function IconTarget({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <circle cx="12" cy="12" r="8.75" />
      <circle cx="12" cy="12" r="4.75" />
      <circle cx="12" cy="12" r="1" />
    </Glyph>
  )
}

export function IconBulb({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M9.25 17.5a5.75 5.75 0 1 1 5.5 0v1.75a1.5 1.5 0 0 1-1.5 1.5h-2.5a1.5 1.5 0 0 1-1.5-1.5Z" />
      <path d="M9.5 17.5h5" />
    </Glyph>
  )
}

export function IconWarningTriangle({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M12 3.75 21 19.5H3Z" />
      <path d="M12 10v3.75M12 16.75h.01" />
    </Glyph>
  )
}

export function IconCheckCircle({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <circle cx="12" cy="12" r="8.75" />
      <path d="m8.5 12.25 2.4 2.4 4.6-5.05" />
    </Glyph>
  )
}

export function IconRadar({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M19.1 6.4A8.75 8.75 0 1 0 20.75 12" />
      <path d="M16.2 9.1A5 5 0 1 0 17 12" />
      <path d="M12 12 20.5 4.5" />
    </Glyph>
  )
}

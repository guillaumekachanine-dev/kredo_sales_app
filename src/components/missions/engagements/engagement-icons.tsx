import type { SVGProps } from "react"

// Jeu d'icônes local (KREDO n'a aucune librairie d'icônes installée).
// Trait fin, monochrome, currentColor — même facture que les SVG inline du repo.

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function FileTextIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="14" y2="17" />
    </Icon>
  )
}

export function BriefcaseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </Icon>
  )
}

export function BadgeCheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2.5 14 4.4l2.7-.3.9 2.6 2.4 1.3-1 2.6 1 2.6-2.4 1.3-.9 2.6-2.7-.3L12 21.5l-2-1.9-2.7.3-.9-2.6L4 15.9l1-2.6-1-2.6 2.4-1.3.9-2.6 2.7.3z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  )
}

export function WrenchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8 6.2 21l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.8 2.8-2.4-2.4z" />
    </Icon>
  )
}

export function MapPinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </Icon>
  )
}

export function CalendarRangeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
      <path d="M7 14h4" />
      <path d="M13 18h4" />
    </Icon>
  )
}

export function BadgeEuroIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9.5a4 4 0 0 0-6 3.5 4 4 0 0 0 6 3.5" />
      <line x1="7" y1="11" x2="12.5" y2="11" />
      <line x1="7" y1="13.5" x2="11.5" y2="13.5" />
    </Icon>
  )
}

export function UserRoundIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </Icon>
  )
}

export function WalletCardsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3H17" />
      <circle cx="16.5" cy="15" r="1.2" />
    </Icon>
  )
}

export function ContactRoundIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="12" cy="11" r="2.5" />
      <path d="M8.5 17a3.5 3.5 0 0 1 7 0" />
      <line x1="8" y1="4" x2="8" y2="2.5" />
      <line x1="16" y1="4" x2="16" y2="2.5" />
    </Icon>
  )
}

export function LayoutGridIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </Icon>
  )
}

export function ActivityIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 12h4l3 8 4-16 3 8h4" />
    </Icon>
  )
}

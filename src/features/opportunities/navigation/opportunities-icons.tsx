import type { SVGProps } from "react"

// Jeu d'icônes local de la surface Opportunités — même pattern que
// `missions/engagements/engagement-icons.tsx` et
// `features/consultants/navigation/consultants-icons.tsx` : KREDO n'embarque
// aucune librairie d'icônes, les tracés sont posés en dur (Heroicons v2 outline).
// Le rail (`SectionRail`) les enveloppe dans un `<span className="size-4">`.

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

// Heroicons v2 · squares-2x2 — Synthèse
export function SyntheseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </Icon>
  )
}

// Heroicons v2 · users — Besoins & staffing
export function BesoinsStaffingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </Icon>
  )
}

// Heroicons v2 · clipboard-document-check — Avant-vente
export function AvantVenteIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C8.755 4.04 8.25 4.629 8.25 5.328V6h7.5V5.328c0-.7-.505-1.288-1.176-1.412a48.176 48.176 0 0 0-1.124-.08M15 6.75a48.667 48.667 0 0 1 3.7.293c1.09.14 1.8 1.048 1.8 2.142v10.056c0 1.06-.784 2.02-1.837 2.175a48.5 48.5 0 0 1-13.926 0C3.784 21.505 3 20.545 3 19.485V9.185c0-1.094.71-2.003 1.8-2.142A48.66 48.66 0 0 1 8.25 6.75M9 12.75 11.25 15l3-4.5" />
    </Icon>
  )
}

// Heroicons v2 · calendar-days — Planning
export function PlanningIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </Icon>
  )
}

// Heroicons v2 · sparkles — Matching profil (module)
export function MatchingProfilIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </Icon>
  )
}

// Heroicons v2 · calculator — Simulation devis (module)
export function SimulationDevisIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008ZM8.25 15h.008v.008H8.25V15Zm0 2.25h.008v.008H8.25v-.008ZM10.5 15h.008v.008H10.5V15Zm0 2.25h.008v.008H10.5v-.008ZM12.75 15h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008ZM15 15h.008v.008H15V15Zm0-2.25h.008v.008H15v-.008ZM6.75 6.75h10.5v3H6.75v-3ZM6 3.75A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6Z" />
    </Icon>
  )
}

// Heroicons v2 · document-magnifying-glass — Post-Mortem (module)
export function PostMortemIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm-1.5 12a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </Icon>
  )
}

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import styles from "./MobileOverviewShell.module.css"

export type MobileOverviewTone =
  | "home"
  | "agenda"
  | "accounts-contacts"
  | "opportunities"
  | "engagements"
  | "consultants"
  | "finance"
  | "business-intelligence"
  | "prospection"
  | "watch-news"
  | "reports-writing"

export interface MobileOverviewShellProps {
  tone: MobileOverviewTone
  heroLabel: string
  icon: ReactNode
  artwork: ReactNode
  children: ReactNode
  heroContent?: ReactNode
  surfaceLabel?: string
  className?: string
  artworkClassName?: string
  decorativeShapeClassName?: string
}

/**
 * Contenant visuel canonique des pages mobiles Accueil / Synthèse.
 *
 * Il standardise uniquement le Hero coloré et la surface blanche superposée.
 * La navigation basse reste la responsabilité d'AppShell et le contenu métier
 * est entièrement fourni par la page appelante.
 */
export function MobileOverviewShell({
  tone,
  heroLabel,
  icon,
  artwork,
  children,
  heroContent,
  surfaceLabel = "Contenu de la vue d’ensemble mobile",
  className,
  artworkClassName,
  decorativeShapeClassName,
}: MobileOverviewShellProps) {
  return (
    <section className={cn(styles.shell, className)} data-tone={tone}>
      <section className={styles.hero} aria-label={heroLabel}>
        <div className={cn(styles.decorativeShape, decorativeShapeClassName)} aria-hidden="true" />
        <div className={styles.icon}>{icon}</div>
        <div className={cn(styles.artwork, artworkClassName)}>{artwork}</div>
        {heroContent}
      </section>

      <section className={styles.surface} aria-label={surfaceLabel}>
        {children}
      </section>
    </section>
  )
}

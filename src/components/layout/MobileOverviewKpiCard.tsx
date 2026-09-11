import type { ReactNode } from "react"
import { getNavigationIcon } from "./navigation-icons"
import styles from "./MobileOverviewKpiCard.module.css"

export type MobileOverviewKpiCardTone = "primary" | "brass"

interface MobileOverviewKpiCardProps {
  label: string
  value: ReactNode
  icon: ReactNode
  tone: MobileOverviewKpiCardTone
  onClick: () => void
  ariaLabel: string
}

/**
 * Point d’entrée compact vers le détail d’un KPI dans une vue Overview mobile.
 * Les données, le détail ouvert et les règles métier restent chez le consommateur.
 */
export function MobileOverviewKpiCard({
  label,
  value,
  icon,
  tone,
  onClick,
  ariaLabel,
}: MobileOverviewKpiCardProps) {
  return (
    <button
      type="button"
      className={styles.card}
      data-tone={tone}
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={ariaLabel}
    >
      <span className={styles.decorativeShape} aria-hidden="true" />
      <span className={styles.icon} aria-hidden="true">{icon}</span>
      <span className={styles.content}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
      </span>
      <span className={styles.detailIcon} aria-hidden="true">
        {getNavigationIcon("arrow-right", "size-4", 2)}
      </span>
    </button>
  )
}

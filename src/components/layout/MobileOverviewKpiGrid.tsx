import type { ReactNode } from "react"
import styles from "./MobileOverviewKpiGrid.module.css"

interface MobileOverviewKpiGridProps {
  children?: ReactNode
  label: string
}

/** Grille de présentation neutre pour deux actions KPI de même importance. */
export function MobileOverviewKpiGrid({ children, label }: MobileOverviewKpiGridProps) {
  return (
    <section className={styles.section} aria-label={label}>
      <div className={styles.grid}>{children}</div>
    </section>
  )
}

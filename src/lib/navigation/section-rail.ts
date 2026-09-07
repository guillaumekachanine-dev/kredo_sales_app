import type { ReactNode } from "react"

export type SectionRailAction =
  | {
      href: string
      onSelect?: never
    }
  | {
      href?: never
      onSelect: () => void
    }

export type SectionRailEntry = SectionRailAction & {
  key: string
  label: string
  icon?: ReactNode
  active?: boolean
  title?: string
}

export type SectionRailProps = {
  ariaLabel: string
  title: string
  home: SectionRailAction
  chapters: readonly SectionRailEntry[]
  contextualModules?: readonly SectionRailEntry[]
  className?: string
}

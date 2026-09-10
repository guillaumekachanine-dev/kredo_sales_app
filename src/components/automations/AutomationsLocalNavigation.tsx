"use client"

import type { ReactNode } from "react"
import { SectionRail } from "@/components/layout/SectionRail"
import type { SectionRailEntry, SectionRailProps } from "@/lib/navigation/section-rail"
import type { AutomationsTabKey } from "./automations-desktop-navigation"

export type { AutomationsTabKey }

export interface AutomationsDesktopChapter {
  key: AutomationsTabKey
  label: string
  icon: ReactNode
}

export const AUTOMATIONS_DESKTOP_CHAPTERS: readonly AutomationsDesktopChapter[] = [
  {
    key: "journal",
    label: "Journal d'exécution",
    icon: (
      <svg
        className="size-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    key: "sante",
    label: "Fiabilité des workflows",
    icon: (
      <svg
        className="size-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    key: "couts",
    label: "Coûts",
    icon: (
      <svg
        className="size-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
] as const

export function getAutomationsDesktopChapterLabel(tab: AutomationsTabKey): string {
  return (
    AUTOMATIONS_DESKTOP_CHAPTERS.find((chapter) => chapter.key === tab)?.label ??
    "Journal d'exécution"
  )
}

export type AutomationsActiveModule = "metrics" | "cadence-simulator" | null

export interface AutomationsLocalNavigationProps {
  activeTab: AutomationsTabKey
  onTabChange: (tab: AutomationsTabKey) => void
  onMetricsClick?: () => void
  onCadenceSimulatorClick?: () => void
  activeModule?: AutomationsActiveModule
}

export function buildAutomationsRailProps({
  activeTab,
  onTabChange,
  onMetricsClick,
  onCadenceSimulatorClick,
  activeModule,
}: AutomationsLocalNavigationProps): SectionRailProps {
  const modules: SectionRailEntry[] = []

  if (onMetricsClick) {
    modules.push({
      key: "metrics",
      label: "Métriques",
      icon: (
        <svg
          className="size-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
      active: activeModule === "metrics",
      onSelect: onMetricsClick,
    })
  }

  if (onCadenceSimulatorClick) {
    modules.push({
      key: "cadence-simulator",
      label: "Simulateur de cadence",
      icon: (
        <svg
          className="size-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      ),
      active: activeModule === "cadence-simulator",
      onSelect: onCadenceSimulatorClick,
    })
  }

  return {
    ariaLabel: "Navigation locale Automatisations",
    title: "Automatisations",
    home: { onSelect: () => onTabChange("journal") },
    chapters: AUTOMATIONS_DESKTOP_CHAPTERS.map((chapter) => ({
      key: chapter.key,
      label: chapter.label,
      icon: chapter.icon,
      active: activeTab === chapter.key,
      onSelect: () => onTabChange(chapter.key),
    })),
    contextualModules: modules.length > 0 ? modules : undefined,
  }
}

export function AutomationsLocalNavigation(props: AutomationsLocalNavigationProps) {
  return <SectionRail {...buildAutomationsRailProps(props)} />
}

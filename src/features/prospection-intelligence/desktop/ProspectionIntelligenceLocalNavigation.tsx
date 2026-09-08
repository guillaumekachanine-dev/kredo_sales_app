"use client"

import type { ReactNode } from "react"
import { SectionRail } from "@/components/layout/SectionRail"
import type { SectionRailProps } from "@/lib/navigation/section-rail"
import type { PiTabKey } from "./prospection-intelligence-desktop-navigation"

export type { PiTabKey }

export interface ProspectionDesktopChapter {
  key: PiTabKey
  label: string
  icon: ReactNode
}

export const PROSPECTION_DESKTOP_CHAPTERS: readonly ProspectionDesktopChapter[] = [
  {
    key: "strategy",
    label: "Brief",
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
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    key: "chapter_1",
    label: "Fenêtres d'opportunités",
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
        <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M3 15h6" />
        <path d="M3 18h6" />
      </svg>
    ),
  },
  {
    key: "chapter_2",
    label: "Approches commerciales",
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
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "chapter_3",
    label: "Playbooks",
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
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      </svg>
    ),
  },
] as const

export function getProspectionDesktopChapterLabel(tab: PiTabKey): string {
  return (
    PROSPECTION_DESKTOP_CHAPTERS.find((chapter) => chapter.key === tab)?.label ?? "Brief"
  )
}

export interface ProspectionIntelligenceLocalNavigationProps {
  active: PiTabKey
  onChange: (tab: PiTabKey) => void
}

export function buildProspectionRailProps({
  active,
  onChange,
}: ProspectionIntelligenceLocalNavigationProps): SectionRailProps {
  return {
    ariaLabel: "Navigation locale Prospection",
    title: "Prospection",
    home: { onSelect: () => onChange("strategy") },
    chapters: PROSPECTION_DESKTOP_CHAPTERS.map((chapter) => ({
      key: chapter.key,
      label: chapter.label,
      icon: chapter.icon,
      active: active === chapter.key,
      onSelect: () => onChange(chapter.key),
    })),
    contextualModules: undefined,
  }
}

export function ProspectionIntelligenceLocalNavigation(
  props: ProspectionIntelligenceLocalNavigationProps,
) {
  return <SectionRail {...buildProspectionRailProps(props)} />
}

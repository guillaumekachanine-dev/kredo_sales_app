"use client"

import { SectionRail } from "@/components/layout/SectionRail"
import type { SectionRailEntry, SectionRailProps } from "@/lib/navigation/section-rail"
import { BI_CHAPTERS, type BiChapter } from "../navigation/business-intelligence-chapters"

export type BiTabKey = BiChapter

function BiSidebarIcon({ name }: { name: BiChapter }) {
  const commonProps = {
    className: "size-4 shrink-0",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  if (name === "home") {
    return (
      <svg {...commonProps}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    )
  }
  if (name === "regulatory-calendar") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    )
  }
  if (name === "value-chain") {
    return (
      <svg {...commonProps}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    )
  }
  if (name === "competitive-environment") {
    return (
      <svg {...commonProps}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    )
  }
  return (
    <svg {...commonProps}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function StudiesIcon() {
  return (
    <svg
      className="size-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function PlaybooksIcon() {
  return (
    <svg
      className="size-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  )
}

export interface BusinessIntelligenceLocalNavigationProps {
  active: BiTabKey
  onChange: (tab: BiTabKey) => void
  studiesAvailable: boolean
  playbooksAvailable: boolean
  onStudiesClick?: () => void
  onPlaybooksClick?: () => void
}

export function buildBusinessIntelligenceRailProps({
  active,
  onChange,
  studiesAvailable,
  playbooksAvailable,
  onStudiesClick,
  onPlaybooksClick,
}: BusinessIntelligenceLocalNavigationProps): SectionRailProps {
  const availableContextualModules: SectionRailEntry[] = []

  if (studiesAvailable && onStudiesClick) {
    availableContextualModules.push({
      key: "studies",
      label: "Études sectorielles",
      icon: <StudiesIcon />,
      onSelect: onStudiesClick,
    })
  }

  if (playbooksAvailable && onPlaybooksClick) {
    availableContextualModules.push({
      key: "playbooks",
      label: "Playbooks",
      icon: <PlaybooksIcon />,
      onSelect: onPlaybooksClick,
    })
  }

  const contextualModules = availableContextualModules.length > 0
    ? availableContextualModules
    : undefined

  return {
    ariaLabel: "Navigation locale Business Intelligence",
    title: "Business Intelligence",
    home: { onSelect: () => onChange("home") },
    chapters: BI_CHAPTERS.map((chapter) => ({
      key: chapter.id,
      label: chapter.label,
      icon: <BiSidebarIcon name={chapter.id} />,
      active: active === chapter.id,
      onSelect: () => onChange(chapter.id),
    })),
    contextualModules,
  }
}

export function BusinessIntelligenceLocalNavigation({
  active,
  onChange,
  studiesAvailable,
  playbooksAvailable,
  onStudiesClick,
  onPlaybooksClick,
}: BusinessIntelligenceLocalNavigationProps) {
  return (
    <SectionRail
      {...buildBusinessIntelligenceRailProps({
        active,
        onChange,
        studiesAvailable,
        playbooksAvailable,
        onStudiesClick,
        onPlaybooksClick,
      })}
    />
  )
}

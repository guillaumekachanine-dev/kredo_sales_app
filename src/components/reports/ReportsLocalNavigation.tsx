"use client"

import { SectionRail } from "@/components/layout/SectionRail"
import type { SectionRailEntry, SectionRailProps } from "@/lib/navigation/section-rail"

export type ReportsSection = "documents" | "knowledge" | "generation"

export {
  buildReportsSectionHref,
  parseReportsSection,
} from "./reports-desktop-navigation"

export const REPORTS_DESKTOP_CHAPTERS = [
  { key: "documents", label: "Bibliothèque" },
  { key: "knowledge", label: "Connaissances" },
  { key: "generation", label: "Génération" },
] as const satisfies ReadonlyArray<{ key: ReportsSection; label: string }>

export function getReportsDesktopChapterLabel(section: ReportsSection): string {
  return REPORTS_DESKTOP_CHAPTERS.find((chapter) => chapter.key === section)?.label ?? "Bibliothèque"
}

function ReportsSidebarIcon({
  name,
}: {
  name: ReportsSection | "knowledge-management"
}) {
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

  if (name === "documents") {
    return (
      <svg {...commonProps}>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    )
  }
  if (name === "generation") {
    return (
      <svg {...commonProps}>
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z" />
      </svg>
    )
  }
  if (name === "knowledge-management") {
    return (
      <svg {...commonProps}>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    )
  }
  return (
    <svg {...commonProps}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <rect x="3" y="10" width="11" height="4" rx="1" />
      <rect x="3" y="16" width="14" height="4" rx="1" />
    </svg>
  )
}

export interface ReportsLocalNavigationProps {
  active: ReportsSection
  onChange: (section: ReportsSection) => void
  onOpenKnowledgeManagement?: () => void
}

export function buildReportsRailProps({
  active,
  onChange,
  onOpenKnowledgeManagement,
}: ReportsLocalNavigationProps): SectionRailProps {
  const contextualModules: SectionRailEntry[] | undefined = onOpenKnowledgeManagement
    ? [
        {
          key: "knowledge-management",
          label: "Gestion de la connaissance",
          icon: <ReportsSidebarIcon name="knowledge-management" />,
          onSelect: onOpenKnowledgeManagement,
        },
      ]
    : undefined

  return {
    ariaLabel: "Navigation locale Rapports & rédaction",
    title: "Rapports & rédaction",
    home: { onSelect: () => onChange("documents") },
    chapters: REPORTS_DESKTOP_CHAPTERS.map((chapter) => ({
      key: chapter.key,
      label: chapter.label,
      icon: <ReportsSidebarIcon name={chapter.key} />,
      active: active === chapter.key,
      onSelect: () => onChange(chapter.key),
    })),
    contextualModules,
  }
}

export function ReportsLocalNavigation(props: ReportsLocalNavigationProps) {
  return <SectionRail {...buildReportsRailProps(props)} />
}

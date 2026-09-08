"use client"

import { SectionRail } from "@/components/layout/SectionRail"
import type { SectionRailEntry, SectionRailProps } from "@/lib/navigation/section-rail"
import type { VeilleSection } from "./veille-desktop-contracts"

export const VEILLE_DESKTOP_CHAPTERS = [
  { key: "news", label: "Actualités" },
  { key: "watched-accounts", label: "Veille ciblée" },
  { key: "strategic-analysis", label: "Analyses" },
  { key: "history", label: "Archives" },
] as const satisfies ReadonlyArray<{ key: VeilleSection; label: string }>

export function getVeilleDesktopChapterLabel(section: VeilleSection): string {
  return VEILLE_DESKTOP_CHAPTERS.find((chapter) => chapter.key === section)?.label ?? "Actualités"
}

function VeilleSidebarIcon({ name }: { name: VeilleSection }) {
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

  if (name === "news") {
    return (
      <svg {...commonProps}>
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
        <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z" />
      </svg>
    )
  }
  if (name === "watched-accounts") {
    return (
      <svg {...commonProps}>
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  if (name === "strategic-analysis") {
    return (
      <svg {...commonProps}>
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" />
        <path d="m16.24 7.76-2.12 5.66-5.66 2.12 2.12-5.66 5.66-2.12Z" />
      </svg>
    )
  }
  return (
    <svg {...commonProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

export interface VeilleLocalNavigationProps {
  active: VeilleSection
  onChange: (section: VeilleSection) => void
  onOpenSourceManagement?: () => void
}

export function buildVeilleRailProps({
  active,
  onChange,
  onOpenSourceManagement,
}: VeilleLocalNavigationProps): SectionRailProps {
  const availableContextualModules: SectionRailEntry[] = []

  if (onOpenSourceManagement) {
    availableContextualModules.push({
      key: "source-management",
      label: "Gestion des sources",
      icon: (
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
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      ),
      onSelect: onOpenSourceManagement,
    })
  }

  const contextualModules = availableContextualModules.length > 0
    ? availableContextualModules
    : undefined

  return {
    ariaLabel: "Navigation locale Veille & actualités",
    title: "Veille & actualités",
    home: { onSelect: () => onChange("news") },
    chapters: VEILLE_DESKTOP_CHAPTERS.map((chapter) => ({
      key: chapter.key,
      label: chapter.label,
      icon: <VeilleSidebarIcon name={chapter.key} />,
      active: active === chapter.key,
      onSelect: () => onChange(chapter.key),
    })),
    contextualModules,
  }
}

export function VeilleLocalNavigation(props: VeilleLocalNavigationProps) {
  return <SectionRail {...buildVeilleRailProps(props)} />
}

"use client"

import { SectionRail } from "@/components/layout/SectionRail"
import type {
  SectionRailEntry,
  SectionRailProps,
} from "@/lib/navigation/section-rail"
import type { TabKey } from "./intelligence-process"

type SidebarIconName = "home" | "socle" | "company" | "sector" | "issues" | "strategy" | "roadmap" | "contacts" | "documents" | "playbook"
export type ClientIntelligenceDesktopTabKey = Exclude<TabKey, "actualite">

export const CLIENT_INTELLIGENCE_NAV_ITEMS: ReadonlyArray<{
  key: ClientIntelligenceDesktopTabKey
  label: string
  icon: SidebarIconName
}> = [
  { key: "accueil", label: "Accueil", icon: "home" },
  { key: "socle", label: "Socle", icon: "socle" },
  { key: "connaissance", label: "Entreprise", icon: "company" },
  { key: "secteur", label: "Secteur", icon: "sector" },
  { key: "enjeux", label: "Enjeux", icon: "issues" },
  { key: "strategie", label: "Stratégie", icon: "strategy" },
  { key: "roadmap", label: "Roadmap", icon: "roadmap" },
] as const

interface ClientIntelligenceSidebarProps {
  activeTab: ClientIntelligenceDesktopTabKey
  onTabChange: (tab: ClientIntelligenceDesktopTabKey) => void
  onOpenContactDirectory?: () => void
  onOpenDocuments?: () => void
  playbookSlug?: string | null
}

export function getClientIntelligenceDesktopTabLabel(
  tab: ClientIntelligenceDesktopTabKey,
): string {
  return CLIENT_INTELLIGENCE_NAV_ITEMS.find((item) => item.key === tab)?.label ?? "Accueil"
}

function SidebarIcon({ name }: { name: SidebarIconName }) {
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
    return <svg {...commonProps}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></svg>
  }
  if (name === "socle") {
    return <svg {...commonProps}><rect x="3" y="16" width="18" height="5" rx="1" /><path d="m5 16 2.5-9h9L19 16" /><path d="M9 7V4h6v3" /></svg>
  }
  if (name === "company") {
    return <svg {...commonProps}><path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16" /><path d="M17 9h3v12" /><path d="M8 7h5M8 11h5M8 15h5M3 21h18" /></svg>
  }
  if (name === "sector") {
    return <svg {...commonProps}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
  }
  if (name === "issues") {
    return <svg {...commonProps}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></svg>
  }
  if (name === "strategy") {
    return <svg {...commonProps}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.1 5-4.9 2 2.1-5 4.9-2Z" /></svg>
  }
  if (name === "roadmap") {
    return <svg {...commonProps}><path d="M5 21V4" /><path d="M5 5c4-3 7 3 14 0v10c-7 3-10-3-14 0" /></svg>
  }
  if (name === "contacts") {
    return (
      <svg {...commonProps}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c.7-3.4 2.5-5.2 5.5-5.2s4.8 1.8 5.5 5.2" />
        <path d="M16 7h4" />
        <path d="M16 11h4" />
        <path d="M17 15h3" />
      </svg>
    )
  }
  if (name === "documents") {
    return (
      <svg {...commonProps}>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M10 13h5" />
        <path d="M10 17h5" />
      </svg>
    )
  }
  return (
    <svg {...commonProps}>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  )
}

export function ClientIntelligenceSidebar({
  activeTab,
  onTabChange,
  onOpenContactDirectory,
  onOpenDocuments,
  playbookSlug,
}: ClientIntelligenceSidebarProps) {
  const railProps = buildClientIntelligenceRailProps({
    activeTab,
    onTabChange,
    onOpenContactDirectory,
    onOpenDocuments,
    playbookSlug,
  })

  return <SectionRail {...railProps} />
}

export function buildClientIntelligenceRailProps({
  activeTab,
  onTabChange,
  onOpenContactDirectory,
  onOpenDocuments,
  playbookSlug,
}: ClientIntelligenceSidebarProps): SectionRailProps {
  const contextualModules: SectionRailEntry[] = []

  if (onOpenContactDirectory) {
    contextualModules.push({
      key: "contacts",
      label: "Répertoire",
      icon: <SidebarIcon name="contacts" />,
      onSelect: onOpenContactDirectory,
    })
  }

  if (onOpenDocuments) {
    contextualModules.push({
      key: "documents",
      label: "Bibliothèque",
      icon: <SidebarIcon name="documents" />,
      onSelect: onOpenDocuments,
    })
  }

  if (playbookSlug) {
    contextualModules.push({
      key: "playbook",
      label: "Playbook",
      icon: <SidebarIcon name="playbook" />,
      href: `/ressources/playbook/${playbookSlug}`,
    })
  }

  return {
    ariaLabel: "Navigation Account Intelligence",
    title: "Account Intelligence",
    home: { onSelect: () => onTabChange("accueil") },
    chapters: CLIENT_INTELLIGENCE_NAV_ITEMS.map((item) => ({
      key: item.key,
      label: item.label,
      icon: <SidebarIcon name={item.icon} />,
      active: item.key === activeTab,
      onSelect: () => onTabChange(item.key),
    })),
    contextualModules,
  }
}

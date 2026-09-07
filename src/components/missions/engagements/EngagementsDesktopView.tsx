"use client"

import { useEffect, type ReactNode } from "react"
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse"
import { SectionRail } from "@/components/layout/SectionRail"
import {
  ActivityIcon,
  BriefcaseIcon,
  CalendarRangeIcon,
  ChartBarIcon,
  LayoutGridIcon,
} from "./engagement-icons"

// ─────────────────────────────────────────────────────────────────────────────
//  Shell Desktop d'Engagements — chrome uniquement (thème + repli sidebar + nav
//  secondaire verticale + header). Le contenu (Synthèse, Missions AT, Projets,
//  Activité & congés, ou Planning des engagements) est composé côté serveur et
//  passé en `children`.
//
//  SHELL-0018 V2 : le rail local est remplacé par la primitive canonique
//  `SectionRail`. Le titre de page principal reste dans le chapeau ; le header
//  de la zone principale affiche toujours le nom exact de l'onglet actif.
// ─────────────────────────────────────────────────────────────────────────────

export type EngagementsView =
  | "synthese"
  | "missions-at"
  | "projets"
  | "activite-conges"
  | "planning-at"

export interface NavEntry {
  view: EngagementsView
  label: string
  icon: ReactNode
}

export const NAV_ENTRIES: NavEntry[] = [
  { view: "synthese", label: "Synthèse", icon: <LayoutGridIcon /> },
  { view: "missions-at", label: "Missions AT", icon: <ActivityIcon /> },
  { view: "projets", label: "Projets", icon: <BriefcaseIcon /> },
  { view: "activite-conges", label: "Activité & congés", icon: <ChartBarIcon /> },
  { view: "planning-at", label: "Planning des engagements", icon: <CalendarRangeIcon /> },
]

interface EngagementsDesktopViewProps {
  activeView: EngagementsView
  children: ReactNode
}

export const HEADER_TITLE_BY_VIEW: Record<EngagementsView, string> = {
  synthese: "Synthèse",
  "missions-at": "Missions AT",
  projets: "Projets",
  "activite-conges": "Activité & congés",
  "planning-at": "Planning des engagements",
}

export function EngagementsDesktopView({ activeView, children }: EngagementsDesktopViewProps) {
  // Repli automatique de la sidebar principale (même pattern que /reports).
  useEffect(() => {
    useSidebarCollapse.getState().requestCollapse()
    return () => useSidebarCollapse.getState().requestRestore()
  }, [])

  return (
    <div
      data-theme="edito-bright-engagements"
      className="flex h-full min-h-0 w-full overflow-hidden bg-canvas text-body"
    >
      <SectionRail
        ariaLabel="Navigation Engagements"
        title="Engagements"
        home={{ href: "/missions" }}
        chapters={NAV_ENTRIES.map((entry) => ({
          key: entry.view,
          label: entry.label,
          icon: entry.icon,
          href: `/missions?vue=${entry.view}`,
          active: activeView === entry.view,
        }))}
      />

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-[76px] shrink-0 items-center justify-between gap-5 border-b border-border bg-surface px-5 py-4">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
            {HEADER_TITLE_BY_VIEW[activeView]}
          </h1>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>
      </section>
    </div>
  )
}

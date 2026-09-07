"use client"

import { useEffect, type ReactNode } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse"
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
//  Paradigme repris fidèlement de /reports (ReportsDesktopView) : nav verticale
//  w-[11.5rem], boîte titre, boutons border-l-2.
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

function NavItem({ entry, active }: { entry: NavEntry; active: boolean }) {
  return (
    <Link
      href={`/missions?vue=${entry.view}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-10 w-full items-center gap-2.5 rounded-r-md border-l-2 px-3 text-left text-xs font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30",
        active
          ? "border-l-edito-brass bg-edito-surface text-edito-navy"
          : "border-l-transparent text-edito-muted hover:bg-edito-surface/70 hover:text-edito-body",
      )}
    >
      <span className={cn("text-edito-navy", !active && "opacity-75")}>
        <span className="block size-4">{entry.icon}</span>
      </span>
      <span className="min-w-0 flex-1 truncate">{entry.label}</span>
    </Link>
  )
}

interface EngagementsDesktopViewProps {
  activeView: EngagementsView
  children: ReactNode
}

export const HEADER_TITLE_BY_VIEW: Record<EngagementsView, string> = {
  synthese: "Engagements",
  "missions-at": "Missions en cours",
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
      <nav
        aria-label="Navigation Engagements"
        className="flex h-full w-[11.5rem] shrink-0 flex-col border-r border-edito-border bg-edito-canvas px-3 py-5"
      >
        <div className="flex min-h-10 w-full select-none items-center gap-2 rounded-md border border-edito-border bg-edito-surface px-3 text-left text-xs font-bold text-edito-navy">
          <span>Engagements</span>
        </div>

        <div className="mt-5 space-y-1">
          {NAV_ENTRIES.map((entry) => (
            <NavItem key={entry.view} entry={entry} active={activeView === entry.view} />
          ))}
        </div>
      </nav>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-[76px] shrink-0 items-center justify-between gap-5 border-b border-border bg-surface px-5 py-4">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
            {HEADER_TITLE_BY_VIEW[activeView] ?? "Engagements"}
          </h1>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>
      </section>
    </div>
  )
}

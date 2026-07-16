"use client"

import Link from "next/link"
import React, { useEffect, useId, useRef } from "react"
import type { CockpitMobileSnapshot } from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"
import type { CockpitModuleId } from "./CockpitMobileModuleGrid"
import { CockpitPrioritiesModule } from "./CockpitPrioritiesModule"
import { CockpitMeetingsModule } from "./CockpitMeetingsModule"
import { CockpitOpportunitiesModule } from "./CockpitOpportunitiesModule"

interface MobileCockpitModuleSheetProps {
  module: CockpitModuleId
  snapshot: CockpitMobileSnapshot | null
  onClose: () => void
  returnFocusRef: React.MutableRefObject<HTMLButtonElement | null>
  suspended?: boolean
  onComposerOpen: () => void
}

const MODULE_TITLES: Record<CockpitModuleId, string> = {
  priorities: "Priorités",
  meetings: "Mes RDV",
  opportunities: "Opportunités",
  weeklyBrief: "Brief hebdo",
  diagnostic: "Diagnostic IA",
  signals: "Signaux",
}

function ModuleUnavailable() {
  return <p className="cockpit-sheet-empty">Les données Cockpit ne sont pas disponibles pour le moment.</p>
}

function ModuleContent({ module, snapshot, onComposerOpen }: Pick<MobileCockpitModuleSheetProps, "module" | "snapshot"> & { onComposerOpen: () => void }) {
  if (!snapshot) return <ModuleUnavailable />

  if (module === "priorities") {
    return <CockpitPrioritiesModule snapshot={snapshot} />
  }

  if (module === "meetings") {
    return <CockpitMeetingsModule snapshot={snapshot} onComposerOpen={onComposerOpen} />
  }

  if (module === "opportunities") {
    return <CockpitOpportunitiesModule snapshot={snapshot} onComposerOpen={onComposerOpen} />
  }

  if (module === "weeklyBrief") {
    const brief = snapshot.weeklyBrief
    if (!brief) return <p className="cockpit-sheet-empty">Aucun brief hebdomadaire enregistré pour cette semaine.</p>
    return <div className="cockpit-sheet-list"><p className="cockpit-sheet-summary">{brief.narrative.executiveSummary}</p>{brief.narrative.topPriorities.slice(0, 3).map((priority) => <article className="cockpit-sheet-row" key={priority.title}><span className="cockpit-sheet-row__content"><span className="cockpit-sheet-row__title">{priority.title}</span><span className="cockpit-sheet-row__detail">{priority.recommendedAction}</span></span></article>)}</div>
  }

  if (module === "diagnostic") {
    const diagnostic = snapshot.diagnostic?.diagnostic
    if (!diagnostic) return <p className="cockpit-sheet-empty">Aucun diagnostic enregistré pour le workspace.</p>
    return <div className="cockpit-sheet-list"><p className="cockpit-sheet-summary">{diagnostic.executiveSummary}</p>{diagnostic.priorities.slice(0, 3).map((priority) => <article className="cockpit-sheet-row" key={priority.rank}><span className="cockpit-sheet-row__meta">{priority.rank}</span><span className="cockpit-sheet-row__content"><span className="cockpit-sheet-row__title">{priority.action}</span><span className="cockpit-sheet-row__detail">{priority.rationale}</span></span></article>)}</div>
  }

  return (
    <div className="cockpit-sheet-list">
      {snapshot.signals.items.length === 0 ? <p className="cockpit-sheet-empty">Aucun signal exploitable à afficher.</p> : snapshot.signals.items.map((signal) => (
        <Link href={signal.href} key={signal.id} className="cockpit-sheet-row">
          <span className="cockpit-sheet-row__meta">{signal.globalScore === null ? "Veille" : `${Math.round(signal.globalScore * 100)}%`}</span>
          <span className="cockpit-sheet-row__content"><span className="cockpit-sheet-row__title">{signal.title}</span><span className="cockpit-sheet-row__detail">{signal.recommendedAction ?? signal.companyName ?? signal.summary ?? "Signal à qualifier"}</span></span>
        </Link>
      ))}
    </div>
  )
}

export function MobileCockpitModuleSheet({ module, snapshot, onClose, returnFocusRef, suspended = false, onComposerOpen }: MobileCockpitModuleSheetProps) {
  const titleId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const suspendedRef = useRef(suspended)

  useEffect(() => { suspendedRef.current = suspended }, [suspended])

  useEffect(() => {
    if (suspended) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== "Tab") return
      const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable || focusable.length === 0) return
      const targets = Array.from(focusable)
      const first = targets[0]
      const last = targets[targets.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", onKeyDown)
      if (!suspendedRef.current) returnFocusRef.current?.focus()
    }
  }, [onClose, returnFocusRef, suspended])

  return (
    <div className="cockpit-module-sheet-backdrop" role="presentation" data-suspended={suspended || undefined}>
      <section ref={sheetRef} role="dialog" aria-modal="true" aria-hidden={suspended || undefined} aria-labelledby={titleId} className="cockpit-module-sheet" data-suspended={suspended || undefined}>
        <header className="cockpit-module-sheet__header">
          <h2 id={titleId}>{MODULE_TITLES[module]}</h2>
          <button ref={closeRef} type="button" className="cockpit-module-sheet__close" onClick={onClose} aria-label={`Fermer ${MODULE_TITLES[module]}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <div className="cockpit-module-sheet__content"><ModuleContent module={module} snapshot={snapshot} onComposerOpen={onComposerOpen} /></div>
      </section>
    </div>
  )
}

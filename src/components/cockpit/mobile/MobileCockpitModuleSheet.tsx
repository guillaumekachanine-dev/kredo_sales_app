"use client"

import React, { useEffect, useId, useRef } from "react"
import type { CockpitMobileSnapshot } from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"
import type { CockpitModuleId } from "./CockpitMobileModuleGrid"
import { CockpitPrioritiesModule } from "./CockpitPrioritiesModule"
import { CockpitMeetingsModule } from "./CockpitMeetingsModule"
import { CockpitOpportunitiesModule } from "./CockpitOpportunitiesModule"
import { CockpitWeeklyBriefModule } from "./CockpitWeeklyBriefModule"
import { CockpitDiagnosticModule } from "./CockpitDiagnosticModule"
import { CockpitSignalsModule } from "./CockpitSignalsModule"

interface MobileCockpitModuleSheetProps {
  module: CockpitModuleId
  snapshot: CockpitMobileSnapshot | null
  onClose: () => void
  returnFocusRef: React.MutableRefObject<HTMLButtonElement | null>
  suspended?: boolean
  onComposerOpen: () => void
  onOpenModule: (module: CockpitModuleId) => void
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

function ModuleContent({ module, snapshot, onComposerOpen, onOpenModule }: Pick<MobileCockpitModuleSheetProps, "module" | "snapshot" | "onComposerOpen" | "onOpenModule">) {
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
    return <CockpitWeeklyBriefModule snapshot={snapshot} onOpenPriorities={() => onOpenModule("priorities")} />
  }

  if (module === "diagnostic") {
    return <CockpitDiagnosticModule snapshot={snapshot} />
  }

  return <CockpitSignalsModule snapshot={snapshot} onComposerOpen={onComposerOpen} />
}

export function MobileCockpitModuleSheet({ module, snapshot, onClose, returnFocusRef, suspended = false, onComposerOpen, onOpenModule }: MobileCockpitModuleSheetProps) {
  const titleId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const suspendedRef = useRef(suspended)

  useEffect(() => { suspendedRef.current = suspended }, [suspended])

  useEffect(() => {
    if (suspended) return
    const previousOverflow = document.body.style.overflow
    const returnFocusTarget = returnFocusRef.current
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
      if (!suspendedRef.current) returnFocusTarget?.focus()
    }
  }, [onClose, returnFocusRef, suspended])

  return (
    <div className="cockpit-module-sheet-backdrop" role="presentation" data-suspended={suspended || undefined}>
      <section
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={suspended || undefined}
        aria-labelledby={titleId}
        className="cockpit-module-sheet"
        data-suspended={suspended || undefined}
        data-theme={module === "diagnostic" ? "intelligence-reports" : undefined}
      >
        <header className="cockpit-module-sheet__header">
          <h2 id={titleId}>{MODULE_TITLES[module]}</h2>
          <button ref={closeRef} type="button" className="cockpit-module-sheet__close" onClick={onClose} aria-label={`Fermer ${MODULE_TITLES[module]}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <div className="cockpit-module-sheet__content">
          <ModuleContent module={module} snapshot={snapshot} onComposerOpen={onComposerOpen} onOpenModule={onOpenModule} />
        </div>
      </section>
    </div>
  )
}

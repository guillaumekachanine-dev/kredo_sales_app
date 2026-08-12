"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { AccountScanSetupSummary } from "./AccountScanSetup"

type ConsoleStage = "scope" | "scan" | "decide"

interface AccountScanConsoleChromeProps {
  company: { name: string; hqLocation: string | null }
  isMobile: boolean
  stage: ConsoleStage
  mode: "information" | "contacts"
  setupSummary: AccountScanSetupSummary
  proposalCount: number
  resultSourceCount: number
  children: ReactNode
  onNewScan?: () => void
  onContacts?: () => void
}

const STEPS: { id: ConsoleStage; label: string }[] = [
  { id: "scope", label: "Cadrer" },
  { id: "scan", label: "Scanner" },
  { id: "decide", label: "Décider" },
]

function stageIndex(stage: ConsoleStage) {
  return STEPS.findIndex((step) => step.id === stage)
}

function ProgressSteps({ stage, horizontal = false }: { stage: ConsoleStage; horizontal?: boolean }) {
  const activeIndex = stageIndex(stage)
  return (
    <ol className={cn(horizontal ? "grid grid-cols-3" : "space-y-0")} aria-label="Progression du scan">
      {STEPS.map((step, index) => {
        const done = index < activeIndex
        const active = index === activeIndex
        return (
          <li key={step.id} className={cn("relative flex items-center", horizontal ? "flex-col gap-1" : "min-h-12 gap-3")}>
            {index > 0 ? <span className={cn("absolute bg-white/30", horizontal ? "right-1/2 top-3 h-px w-full" : "-top-3 left-3 h-6 w-px", (done || active) && "bg-edito-brass")} /> : null}
            <span className={cn("relative z-10 flex size-6 items-center justify-center rounded-full border text-[10px] font-black", active ? "border-edito-brass bg-edito-brass text-edito-ink" : done ? "border-white bg-white/10 text-white" : "border-white/60 text-white/70")}>{done ? "✓" : index + 1}</span>
            <span className={cn("relative z-10 text-[11px] font-bold", active || done ? "text-white" : "text-white/65")}>{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function AccountScanConsoleChrome({ company, isMobile, stage, mode, setupSummary, proposalCount, resultSourceCount, children, onNewScan, onContacts }: AccountScanConsoleChromeProps) {
  if (isMobile) {
    return (
      <div className="min-h-full bg-edito-canvas">
        <div className="border-b border-edito-brass/70 bg-edito-navy px-4 pb-2.5 pt-2 text-white">
          <ProgressSteps stage={stage} horizontal />
        </div>
        {children}
      </div>
    )
  }

  const deciding = stage === "decide"
  return (
    <div className="grid h-full min-h-0 grid-cols-[200px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col bg-edito-navy px-6 py-6 text-white overflow-y-auto">
        <div><ProgressSteps stage={stage} /></div>
        <div className="my-5 border-t border-white/10" />
        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-white/65">{deciding ? "Résumé du scan" : "Périmètre du scan"}</p>
        <dl className="mt-3 space-y-3 text-[11px]">
          <div className="flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded border border-white/15 text-[9px]">□</span><dd><strong className="text-white">{deciding ? proposalCount : setupSummary.elementCount}</strong> {deciding ? "changements proposés" : "éléments sélectionnés"}</dd></div>
          <div className="flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded border border-white/15 text-[9px]">S</span><dd><strong className="text-white">{deciding ? resultSourceCount : setupSummary.sourceCount}</strong> sources {deciding ? "consultées" : "actives"}</dd></div>
          {!deciding ? <div className="flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded border border-white/15 text-[9px]">◷</span><dd>Estimation : <strong className="text-white">2–4 min</strong></dd></div> : null}
        </dl>
        {!deciding && (
          <>
            <div className="my-5 border-t border-white/10" />
            <p className="text-[9px] font-black uppercase tracking-[0.1em] text-white/65">Mode</p>
            <p className="mt-2 text-xs font-bold">{mode === "contacts" ? "Contacts" : setupSummary.mode === "verify" ? "Vérifier" : "Compléter"}</p>
          </>
        )}
        <div className={cn("border-t border-white/10 pt-5", deciding ? "mt-5" : "mt-auto")}>
          <p className="text-[9px] font-black uppercase tracking-[0.1em] text-white/65">Actions</p>
          <div className="mt-3 space-y-2">
            {onNewScan && <button type="button" onClick={onNewScan} className="w-full rounded border border-white/20 bg-white/5 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-white/10">Nouveau scan</button>}
            {onContacts && <button type="button" onClick={onContacts} className="w-full rounded border border-primary/50 bg-primary/10 py-1.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary/20 hover:text-white">Scanner les contacts</button>}
            {deciding && <button type="button" className="w-full rounded border border-white/20 bg-white/5 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-white/10">Archiver</button>}
          </div>
        </div>
        {deciding && (
          <div className="mt-5 border-t border-white/10 pt-5">
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between text-[9px] font-black uppercase tracking-[0.1em] text-white/65 hover:text-white">
                Versions
                <span className="transition-transform duration-200 group-open:rotate-180">▼</span>
              </summary>
              <div className="mt-3 space-y-2 text-[10px] text-white/50">
                <p>Aucune version archivée.</p>
              </div>
            </details>
          </div>
        )}
      </aside>
      <main className="min-h-0 min-w-0 overflow-hidden bg-edito-canvas">{children}</main>
    </div>
  )
}

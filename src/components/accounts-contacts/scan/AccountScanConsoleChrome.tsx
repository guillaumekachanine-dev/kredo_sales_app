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

export function AccountScanConsoleChrome({ company, isMobile, stage, mode, setupSummary, proposalCount, resultSourceCount, children }: AccountScanConsoleChromeProps) {
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
    <div className="grid h-full min-h-0 grid-cols-[220px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col bg-edito-navy px-6 py-6 text-white">
        <h3 className="truncate text-lg font-black tracking-tight">{company.name}</h3>
        <div className="mt-5"><ProgressSteps stage={stage} /></div>
        <div className="my-5 border-t border-white/10" />
        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-white/65">{deciding ? "Résumé du scan" : "Périmètre du scan"}</p>
        <dl className="mt-3 space-y-3 text-[11px]">
          <div className="flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded border border-white/15 text-[9px]">□</span><dd><strong className="text-white">{deciding ? proposalCount : setupSummary.elementCount}</strong> {deciding ? "changements proposés" : "éléments sélectionnés"}</dd></div>
          <div className="flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded border border-white/15 text-[9px]">S</span><dd><strong className="text-white">{deciding ? resultSourceCount : setupSummary.sourceCount}</strong> sources {deciding ? "consultées" : "actives"}</dd></div>
          {!deciding ? <div className="flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded border border-white/15 text-[9px]">◷</span><dd>Estimation : <strong className="text-white">2–4 min</strong></dd></div> : null}
        </dl>
        <div className="my-5 border-t border-white/10" />
        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-white/65">Mode</p>
        <p className="mt-2 text-xs font-bold">{mode === "contacts" ? "Contacts" : setupSummary.mode === "verify" ? "Vérifier" : "Compléter"}</p>
        <div className="mt-auto border-t border-white/10 pt-5">
          <p className="text-[9px] font-black uppercase tracking-[0.1em] text-white/65">Compte</p>
          <p className="mt-2 text-sm font-black">{company.name}</p>
          {company.hqLocation ? <p className="mt-1 text-[10px] leading-relaxed text-white/65">{company.hqLocation}</p> : null}
        </div>
      </aside>
      <main className="min-h-0 min-w-0 overflow-hidden bg-edito-canvas">{children}</main>
    </div>
  )
}

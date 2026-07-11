"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { CommunicationOutputKind, CommunicationScenario } from "@/lib/n8n/types"
import { getScenarioRegistryItem, type ActivityCategory } from "@/lib/communication/communication-scenario-registry"
import { ScenarioPickerModal } from "./ScenarioPickerModal"

// ADR-0013 Lot 1 — remplace le <Select> à plat (69+ scénarios en vrac,
// illisible) par un déclencheur ouvrant ScenarioPickerModal (catégorie →
// scénario), même pattern qu'OfferPicker/OfferPickerModal.
export function ScenarioPicker({
  outputKind,
  value,
  onChange,
  isMobile,
  hideLabel = false,
  allowedCategories,
  allowedScenarios,
}: {
  outputKind: CommunicationOutputKind
  value: CommunicationScenario
  onChange: (scenario: CommunicationScenario) => void
  isMobile?: boolean
  hideLabel?: boolean
  allowedCategories?: ActivityCategory[]
  allowedScenarios?: CommunicationScenario[]
}) {
  const [modalOpen, setModalOpen] = useState(false)

  const selected = useMemo(() => getScenarioRegistryItem(value) ?? null, [value])

  const triggerCls = cn(
    "flex w-full items-center justify-between gap-1 rounded-lg border border-border/35 bg-surface/20 pl-2.5 pr-1.5 text-left font-medium text-white transition-all duration-150 hover:bg-surface/30 focus:bg-surface/40 focus:border-primary/60 focus:outline-none focus:ring-0",
    isMobile ? "h-9 text-[10px]" : "h-7 text-[10px]",
  )
  const labelCls = "mb-1 block text-[8.5px] font-semibold uppercase tracking-[0.1em] text-muted"

  return (
    <div>
      {!hideLabel ? <label className={labelCls}>Scénario</label> : null}
      <button type="button" onClick={() => setModalOpen(true)} className={triggerCls}>
        <span className="min-w-0 flex-1 truncate pr-1">{selected?.label ?? "Choisir un scénario…"}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="size-3 shrink-0 text-muted"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
        </svg>
      </button>
      <ScenarioPickerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        outputKind={outputKind}
        value={value}
        onSelect={onChange}
        allowedCategories={allowedCategories}
        allowedScenarios={allowedScenarios}
      />
    </div>
  )
}

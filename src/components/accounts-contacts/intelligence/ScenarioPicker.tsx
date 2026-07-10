"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { CommunicationScenario } from "@/lib/n8n/types"
import { getScenarioRegistryItem } from "@/lib/communication/communication-scenario-registry"
import { ScenarioPickerModal } from "./ScenarioPickerModal"

// ADR-0013 Lot 1 — remplace le <Select> à plat (69+ scénarios en vrac,
// illisible) par un déclencheur ouvrant ScenarioPickerModal (catégorie →
// scénario), même pattern qu'OfferPicker/OfferPickerModal.
export function ScenarioPicker({
  useCase,
  value,
  onChange,
  isMobile,
}: {
  useCase: "mail" | "pitch"
  value: CommunicationScenario
  onChange: (scenario: CommunicationScenario) => void
  isMobile?: boolean
}) {
  const [modalOpen, setModalOpen] = useState(false)

  const selected = useMemo(() => getScenarioRegistryItem(value) ?? null, [value])

  const triggerCls = cn(
    "flex w-full items-center justify-between gap-2 rounded-lg border border-border/35 bg-surface/20 px-3 text-left font-medium text-body transition-all duration-150 hover:bg-surface/30 focus:bg-surface/40 focus:border-primary/60 focus:outline-none focus:ring-0",
    isMobile ? "h-11 text-xs" : "h-10 text-sm",
  )
  const labelCls = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"

  return (
    <div>
      <label className={labelCls}>Scénario</label>
      <button type="button" onClick={() => setModalOpen(true)} className={triggerCls}>
        <span className="truncate">{selected?.label ?? "Choisir un scénario…"}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="size-3.5 shrink-0 text-muted"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
        </svg>
      </button>
      <ScenarioPickerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        useCase={useCase}
        value={value}
        onSelect={onChange}
      />
    </div>
  )
}

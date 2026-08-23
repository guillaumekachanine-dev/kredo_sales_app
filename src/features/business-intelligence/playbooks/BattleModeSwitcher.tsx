"use client"

import { cn } from "@/lib/utils"
import type { BattleTab } from "./battle-workspace-model"

type BattleModeSwitcherProps = {
  value: BattleTab
  onChange: (tab: BattleTab) => void
  isMobile?: boolean
}

const TABS: { value: BattleTab; label: string; hint: string }[] = [
  { value: "revision", label: "Révision", hint: "Réviser la fiche du compte" },
  { value: "situation", label: "Situation", hint: "Décrire la situation commerciale" },
]

/**
 * Bascule Révision / Situation à l'intérieur du Battle Workspace.
 *
 * Les deux onglets existent dès le Lot 1 : l'onglet Situation monte le point
 * d'accroche `BattleSituationView`, que A2 remplace au Lot 3 sans toucher à ce
 * fichier ni à `SectorPlaybooksModal`.
 */
export function BattleModeSwitcher({ value, onChange, isMobile = false }: BattleModeSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Mode Battle"
      className={cn(
        "inline-flex shrink-0 gap-0.5 rounded-lg border border-white/10 bg-slate-950/50 p-0.5",
        isMobile && "w-full",
      )}
    >
      {TABS.map((tab) => {
        const isSelected = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            title={tab.hint}
            onClick={() => onChange(tab.value)}
            className={cn(
              "rounded-md px-3 text-xs font-bold transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-brand-brass motion-reduce:transition-none",
              isMobile ? "min-h-11 flex-1" : "min-h-8",
              isSelected
                ? "bg-brand-brass/15 text-brand-brass"
                : "text-white/55 hover:bg-white/[0.04] hover:text-white",
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

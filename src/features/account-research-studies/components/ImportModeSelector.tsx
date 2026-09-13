"use client"

// ─── Sélecteur de canal d'import d'étude (Desktop / Mobile) ─────────────────
//
// Propose les deux canaux d'acquisition :
// 1. ChatGPT Deep Research : export PDF, pipeline de conversion asynchrone n8n.
// 2. ChatGPT Work : bundle de 2 JSON structurés, intake déterministe synchrone.

import { cn } from "@/lib/utils"

export type ImportChannel = "deep_research" | "work"

export function ImportModeSelector({
  onSelectMode,
  isMobile = false,
}: {
  onSelectMode: (mode: ImportChannel) => void
  isMobile?: boolean
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1">
        <h3 className="font-heading text-sm font-bold text-edito-heading">
          Choisissez le canal d&apos;acquisition
        </h3>
        <p className="text-xs text-edito-muted">
          Sélectionnez la source de l&apos;étude pour ouvrir le flux d&apos;importation approprié.
        </p>
      </div>

      <div className={cn("grid gap-3", isMobile ? "grid-cols-1" : "grid-cols-2")}>
        {/* Option A : ChatGPT Deep Research */}
        <button
          type="button"
          onClick={() => onSelectMode("deep_research")}
          className={cn(
            "group relative flex flex-col items-start justify-between rounded-lg border border-edito-border bg-edito-surface p-4 text-left transition-all",
            "hover:border-edito-navy hover:bg-edito-canvas/60",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60",
            isMobile ? "min-h-[90px]" : "min-h-[120px]",
          )}
        >
          <div className="w-full space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-heading text-sm font-bold text-edito-navy group-hover:text-edito-heading">
                ChatGPT Deep Research
              </span>
              <span className="rounded bg-edito-canvas px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                1 PDF
              </span>
            </div>
            <p className="text-xs leading-relaxed text-edito-muted">
              Importer l’export PDF d’une recherche approfondie
            </p>
          </div>
          <div className="mt-3 flex items-center text-[11px] font-semibold text-edito-navy group-hover:underline">
            <span>Sélectionner le PDF</span>
            <span aria-hidden="true" className="ml-1">→</span>
          </div>
        </button>

        {/* Option B : ChatGPT Work */}
        <button
          type="button"
          onClick={() => onSelectMode("work")}
          className={cn(
            "group relative flex flex-col items-start justify-between rounded-lg border border-edito-border bg-edito-surface p-4 text-left transition-all",
            "hover:border-edito-navy hover:bg-edito-canvas/60",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60",
            isMobile ? "min-h-[90px]" : "min-h-[120px]",
          )}
        >
          <div className="w-full space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-heading text-sm font-bold text-edito-navy group-hover:text-edito-heading">
                ChatGPT Work
              </span>
              <span className="rounded bg-edito-chip px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-edito-navy">
                2 JSON
              </span>
            </div>
            <p className="text-xs leading-relaxed text-edito-muted">
              Importer le bundle structuré Account Intelligence
            </p>
          </div>
          <div className="mt-3 flex items-center text-[11px] font-semibold text-edito-navy group-hover:underline">
            <span>Déposer le bundle</span>
            <span aria-hidden="true" className="ml-1">→</span>
          </div>
        </button>
      </div>
    </div>
  )
}

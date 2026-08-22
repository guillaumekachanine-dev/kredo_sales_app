"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { TerrainDailyAngleModel } from "./terrain-home-model"
import { copyTextToClipboard } from "./clipboard"

export function TerrainAngleCard({
  angle,
  className,
}: {
  angle: TerrainDailyAngleModel
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!angle.copyText) return
    const success = await copyTextToClipboard(angle.copyText)
    if (success) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-edito-border border-t-3 border-t-edito-brass bg-edito-surface p-4 shadow-sm",
        className,
      )}
      aria-label="Angle du jour"
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-edito-muted">
        Angle du jour
      </p>

      <h2 className="mt-1.5 font-heading text-lg font-bold tracking-tight text-edito-heading">
        {angle.title}
      </h2>

      {angle.kind === "risk" ? (
        <div className="mt-3 space-y-2.5">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-edito-brass-hover">
              Risque
            </span>
            <p className="mt-0.5 text-xs leading-relaxed text-edito-body">
              {angle.text}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-edito-brass-hover">
              Opportunité
            </span>
            <p className="mt-0.5 text-xs leading-relaxed text-edito-body">
              {angle.opportunityText}
            </p>
          </div>
        </div>
      ) : angle.kind === "market" ? (
        <p className="mt-2.5 text-xs leading-relaxed text-edito-body">
          {angle.text}
        </p>
      ) : (
        <p className="mt-2.5 text-xs text-edito-muted italic">
          Aucun angle commercial disponible pour ce segment.
        </p>
      )}

      {angle.kind !== "unavailable" ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleCopy}
            aria-label={
              copied
                ? "Accroche copiée dans le presse-papier"
                : "Copier l'accroche dans le presse-papier"
            }
            className={cn(
              "flex min-h-12 w-full cursor-pointer items-center justify-center rounded-lg border px-4 font-sans text-xs font-extrabold transition-colors select-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              copied
                ? "border-success bg-success/10 text-success"
                : "border-edito-navy bg-edito-surface text-edito-navy hover:bg-edito-canvas active:bg-edito-chip",
            )}
          >
            <span aria-live="polite">{copied ? "Copié ✓" : "Copier l’accroche"}</span>
          </button>
        </div>
      ) : null}
    </section>
  )
}

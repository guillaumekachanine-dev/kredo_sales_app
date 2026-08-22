"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Une source de l'ANNEXE A d'une étude E4 (`04-secteur.md`/`.json`), résolue depuis son
 * `src_id` numérique via `getSectorSourceResolution` (source_corpus_items.src_number, colonne
 * générée depuis external_src_id "SRC-0NN" — migration 20260822092309). Le composant reste
 * volontairement prop-driven : c'est au consommateur de résoudre côté serveur et de passer le
 * résultat via `source`/`resolve`, jamais au composant d'aller le chercher lui-même.
 */
export type ResolvedSource = {
  srcId: number
  publisher: string
  url: string | null
  tier: number | null
  attests: string | null
  consultedAt: string | null
}

function formatConsultedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

function useDismissablePopover(open: boolean, onDismiss: () => void, rootRef: React.RefObject<HTMLSpanElement | null>) {
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onDismiss()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss()
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onDismiss, rootRef])
}

export type SourceChipProps = {
  srcId: number
  source?: ResolvedSource | null
  className?: string
  variant?: "light" | "dark"
}

export function SourceChip({ srcId, source = null, className, variant = "light" }: SourceChipProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement | null>(null)
  useDismissablePopover(open, () => setOpen(false), rootRef)

  const isDark = variant === "dark"

  return (
    <span ref={rootRef} className={cn("relative inline-block align-middle", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={source ? `Source ${srcId} : ${source.publisher}` : `Source ${srcId} non résolue`}
        className={cn(
          "inline-flex h-4 min-w-4 cursor-pointer items-center justify-center rounded px-1 font-mono text-[9px] font-bold transition-colors",
          isDark
            ? "bg-brand-brass/15 text-brand-brass hover:bg-brand-brass/25 hover:text-white"
            : "bg-edito-chip text-edito-muted hover:bg-edito-border hover:text-edito-navy",
          !source && "opacity-60",
        )}
      >
        S{srcId}
      </button>
      {open ? (
        <span
          role="tooltip"
          className={cn(
            "absolute left-0 top-full z-30 mt-1 w-64 rounded-lg p-3 text-left shadow-md",
            isDark
              ? "border border-white/15 bg-slate-900 text-white shadow-xl"
              : "border border-edito-border bg-edito-surface shadow-md",
          )}
        >
          {source ? (
            <>
              <span
                className={cn(
                  "block text-[10px] font-bold uppercase tracking-wide",
                  isDark ? "text-brand-brass" : "text-edito-navy",
                )}
              >
                {source.publisher}
              </span>
              {source.attests ? (
                <span
                  className={cn(
                    "mt-1 block text-[11px] leading-relaxed",
                    isDark ? "text-white/80" : "text-edito-body",
                  )}
                >
                  {source.attests}
                </span>
              ) : null}
              <span
                className={cn(
                  "mt-2 flex items-center justify-between gap-2 text-[10px]",
                  isDark ? "text-white/50" : "text-edito-muted",
                )}
              >
                <span>
                  {source.tier !== null ? `Tier ${source.tier}` : null}
                  {source.consultedAt ? ` · consulté le ${formatConsultedAt(source.consultedAt)}` : null}
                </span>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "font-semibold hover:underline",
                      isDark ? "text-brand-brass" : "text-edito-petrol",
                    )}
                  >
                    Source ↗
                  </a>
                ) : null}
              </span>
            </>
          ) : (
            <span
              className={cn(
                "block text-[11px] leading-relaxed",
                isDark ? "text-white/60" : "text-edito-muted",
              )}
            >
              Source S{srcId} non résolue dans le registre courant.
            </span>
          )}
        </span>
      ) : null}
    </span>
  )
}

export type SourceChipListProps = {
  srcIds: number[]
  resolve?: (srcId: number) => ResolvedSource | null
  className?: string
  variant?: "light" | "dark"
}

export function SourceChipList({ srcIds, resolve, className, variant = "light" }: SourceChipListProps) {
  if (srcIds.length === 0) return null
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {srcIds.map((id) => (
        <SourceChip key={id} srcId={id} source={resolve ? resolve(id) : null} variant={variant} />
      ))}
    </span>
  )
}

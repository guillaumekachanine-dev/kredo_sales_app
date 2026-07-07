"use client"

import { useMemo } from "react"
import { Select } from "@/components/ui/Select"
import { cn } from "@/lib/utils"
import type { SuggestedOffer } from "./get-suggested-offers"

// ADR-0009 — no-go : un pitch ne peut jamais s'ancrer hors catalogue. Ce
// composant est le seul point d'entrée pour context.offerRef ; le formulaire
// bloque la génération tant qu'aucune offre n'est choisie (voir IntelligenceActionDrawers).
export function OfferPicker({
  offers,
  suggestedPracticeSlugs,
  value,
  onChange,
  loading,
  isMobile,
}: {
  offers: SuggestedOffer[]
  suggestedPracticeSlugs: string[]
  value: string | undefined
  onChange: (offerId: string) => void
  loading: boolean
  isMobile?: boolean
}) {
  const selectCls = cn(
    "w-full rounded-lg border px-3 text-xs font-medium text-body transition-all duration-150 hover:bg-surface/30 focus:bg-surface/40 focus:border-primary/50 focus:outline-none focus:ring-0",
    isMobile ? "h-11" : "h-9",
    value ? "border-border/30 bg-surface/20" : "border-warning/30 bg-surface/10"
  )
  const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-muted mb-1"

  const { suggested, other } = useMemo(() => {
    const suggestedSet = new Set(suggestedPracticeSlugs)
    const suggestedList = offers.filter((o) => suggestedSet.has(o.practiceSlug))
    const otherList = offers.filter((o) => !suggestedSet.has(o.practiceSlug))
    return { suggested: suggestedList, other: otherList }
  }, [offers, suggestedPracticeSlugs])

  return (
    <div>
      <label className={labelCls}>Offre catalogue (obligatoire)</label>
      <Select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={selectCls}
        disabled={loading}
      >
        <option value="" disabled>
          {loading ? "Chargement du catalogue…" : "Choisir une offre…"}
        </option>
        {suggested.length > 0 && (
          <optgroup label="Suggérées pour ce compte">
            {suggested.map((o) => (
              <option key={o.id} value={o.id}>{o.name} — {o.practiceName}</option>
            ))}
          </optgroup>
        )}
        <optgroup label={suggested.length > 0 ? "Autres offres" : "Catalogue"}>
          {other.map((o) => (
            <option key={o.id} value={o.id}>{o.name} — {o.practiceName}</option>
          ))}
        </optgroup>
      </Select>
      {!value && !loading && (
        <p className="mt-1 text-[10px] text-warning">
          Un pitch doit toujours s&apos;ancrer sur une offre du catalogue Kredo.
        </p>
      )}
    </div>
  )
}

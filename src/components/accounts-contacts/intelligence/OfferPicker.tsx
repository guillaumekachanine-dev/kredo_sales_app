"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { SuggestedOffer } from "./get-suggested-offers"
import { OfferPickerModal } from "./OfferPickerModal"

// ADR-0009 — no-go : un pitch ne peut jamais s'ancrer hors catalogue. Ce
// composant est le seul point d'entrée pour context.offerRef ; le formulaire
// bloque la génération tant qu'aucune offre n'est choisie (voir IntelligenceActionDrawers).
// Le choix se fait via OfferPickerModal (practice → offre), pas un <select> à
// plat : 41 offres sur 8 practices sont illisibles listées en vrac.
// Conservé dans l'API publique (CommunicationBriefForm) — n'est plus
// consommé depuis que la pastille "Suggérée" a été retirée du picker.
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
  const [modalOpen, setModalOpen] = useState(false)

  const selected = useMemo(() => offers.find((o) => o.id === value) ?? null, [offers, value])

  const triggerCls = cn(
    "flex w-full items-center justify-between gap-2 rounded-lg border px-3 text-left text-xs font-medium text-body transition-all duration-150 hover:bg-surface/30 focus:bg-surface/40 focus:border-primary/50 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60",
    isMobile ? "h-11" : "h-9",
    value ? "border-border/30 bg-surface/20" : "border-warning/30 bg-surface/10",
  )
  const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-muted mb-1"

  return (
    <div>
      <label className={labelCls}>Offre catalogue (obligatoire)</label>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        disabled={loading}
        className={triggerCls}
      >
        <span className="truncate">
          {loading
            ? "Chargement du catalogue…"
            : selected
              ? `${selected.name} — ${selected.practiceName}`
              : "Choisir une offre…"}
        </span>
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
      {!value && !loading && (
        <p className="mt-1 text-[10px] text-warning">
          Un pitch doit toujours s&apos;ancrer sur une offre du catalogue Kredo.
        </p>
      )}
      <OfferPickerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        offers={offers}
        value={value}
        onSelect={onChange}
      />
    </div>
  )
}

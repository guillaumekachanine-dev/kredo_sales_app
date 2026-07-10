"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { SuggestedOffer } from "./get-suggested-offers"
import { OfferPickerModal } from "./OfferPickerModal"

// ADR-0009 §6 (supersédé par ADR-0013 D-5) — l'ancrage catalogue reste
// obligatoire pour les scénarios où scenario.requiresOffer === true (ex:
// cold_call_pitch, meeting_prep_cross_sell, renewal_pitch), optionnel pour
// les autres scénarios pitch (préparation RDV, crise, business review...).
// Le choix se fait via OfferPickerModal (practice → offre), pas un <select> à
// plat : 41 offres sur 8 practices sont illisibles listées en vrac.
export function OfferPicker({
  offers,
  value,
  onChange,
  loading,
  required,
  isMobile,
}: {
  offers: SuggestedOffer[]
  suggestedPracticeSlugs: string[]
  value: string | undefined
  onChange: (offerId: string) => void
  loading: boolean
  required: boolean
  isMobile?: boolean
}) {
  const [modalOpen, setModalOpen] = useState(false)

  const selected = useMemo(() => offers.find((o) => o.id === value) ?? null, [offers, value])

  const triggerCls = cn(
    "flex w-full items-center justify-between gap-2 rounded-lg border px-3 text-left font-medium text-body transition-all duration-150 hover:bg-surface/30 focus:bg-surface/40 focus:border-primary/60 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60",
    isMobile ? "h-11 text-xs" : "h-10 text-sm",
    !required || value ? "border-border/30 bg-surface/20" : "border-warning/30 bg-surface/10",
  )
  const labelCls = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"

  return (
    <div>
      <label className={labelCls}>Offre catalogue {required ? "(obligatoire)" : "(recommandée)"}</label>
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
      {required && !value && !loading && (
        <p className="mt-1 text-[10px] text-warning">
          Ce scénario doit s&apos;ancrer sur une offre du catalogue Kredo.
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

"use client"

import { useMemo, useState, type CSSProperties } from "react"
import Image from "next/image"
import { AppDialog } from "@/components/ui/AppDialog"
import { cn } from "@/lib/utils"
import type { SuggestedOffer } from "./get-suggested-offers"

// Logos KREDO par practice — 8 practices réelles (offer_practices.slug).
const PRACTICE_LOGOS: Record<string, string> = {
  "data-ai": "/images/practice_icons/practice_data_ia.png",
  "cloud-engineering": "/images/practice_icons/practice_cloud_engineering.png",
  "digital-business-solutions": "/images/practice_icons/practice_digital_business_solutions.png",
  "digital-experience": "/images/practice_icons/practice_digital_experience.png",
  cybersecurity: "/images/practice_icons/practice_cybersecurity.png",
  "legacy-systems-mainframe": "/images/practice_icons/practice_legacy_mainframe.png",
  "project-agile-delivery": "/images/practice_icons/practice_project_agile_delivery.png",
  "quality-engineering-testing": "/images/practice_icons/practice_QA_testing.png",
}

const BACK_COLLAPSE_MS = 130

// "Mise en relief" — lift + ombre portée au survol, courbe lente et sans
// à-coup (voir .kredo-relief-hover, globals.css), pas de balayage animé.
const RELIEF_HOVER = "kredo-relief-hover"

type PracticeGroup = {
  slug: string
  name: string
  color: string
  sortOrder: number
  offers: SuggestedOffer[]
}

// Sélecteur d'offre en 2 étapes : practice (cartes carrées) → offre (cartes
// rectangulaires). Remplace le <select> à plat — les 41 offres du catalogue
// réparties sur 8 practices sont illisibles listées en vrac.
export function OfferPickerModal({
  open,
  onOpenChange,
  offers,
  value,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  offers: SuggestedOffer[]
  value: string | undefined
  onSelect: (offerId: string) => void
}) {
  const [step, setStep] = useState<"practice" | "offers">("practice")
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)

  const practices = useMemo<PracticeGroup[]>(() => {
    const bySlug = new Map<string, PracticeGroup>()
    for (const offer of offers) {
      if (!offer.practiceSlug) continue
      const existing = bySlug.get(offer.practiceSlug)
      if (existing) {
        existing.offers.push(offer)
        continue
      }
      bySlug.set(offer.practiceSlug, {
        slug: offer.practiceSlug,
        name: offer.practiceName,
        color: offer.practiceColor,
        sortOrder: offer.practiceSortOrder,
        offers: [offer],
      })
    }
    return Array.from(bySlug.values()).sort((a, b) => a.sortOrder - b.sortOrder)
  }, [offers])

  const activePractice = practices.find((p) => p.slug === activeSlug) ?? null

  // Reset au moment de la fermeture (pas à l'ouverture) : évite un setState
  // synchrone dans un effect, la prochaine ouverture retrouve un état propre.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setStep("practice")
      setActiveSlug(null)
      setLeaving(false)
    }
    onOpenChange(next)
  }

  function handlePracticeSelect(slug: string) {
    setActiveSlug(slug)
    setStep("offers")
  }

  function handleBack() {
    setLeaving(true)
    window.setTimeout(() => {
      setStep("practice")
      setActiveSlug(null)
      setLeaving(false)
    }, BACK_COLLAPSE_MS)
  }

  function handleOfferSelect(offerId: string) {
    onSelect(offerId)
    handleOpenChange(false)
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      className="communication-picker-modal sm:max-w-2xl"
      headerClassName="communication-picker-modal-header"
      bodyClassName="communication-picker-modal-body"
      title={
        <div className="flex items-center gap-2">
          {step === "offers" && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Retour aux practices"
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-heading"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 className="truncate font-heading text-sm font-bold text-heading">
            {step === "practice" ? "Choisir une practice" : activePractice?.name ?? "Choisir une offre"}
          </h2>
        </div>
      }
    >
      {step === "practice" ? (
        <div key="practice-step" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {practices.map((practice, index) => {
            const logo = PRACTICE_LOGOS[practice.slug]
            const cardStyle: CSSProperties & Record<string, string> = {
              animationDelay: `${index * 40}ms`,
              "--practice-border": `${practice.color}35`,
              "--practice-border-hover": `${practice.color}70`,
              "--practice-bg": `${practice.color}0D`,
            }
            return (
              <button
                key={practice.slug}
                type="button"
                onClick={() => handlePracticeSelect(practice.slug)}
                style={cardStyle}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--practice-border)] bg-[var(--practice-bg)] p-3 text-center hover:border-[var(--practice-border-hover)]",
                  RELIEF_HOVER,
                  leaving ? "kredo-offer-card-out" : "kredo-offer-card-in",
                )}
              >
                {logo ? (
                  <Image
                    src={logo}
                    alt=""
                    width={64}
                    height={64}
                    className="relative z-10 size-14 object-contain"
                  />
                ) : (
                  <span
                    className="relative z-10 size-4 rounded-full"
                    style={{ background: practice.color }}
                  />
                )}
                <span className="relative z-10 line-clamp-2 text-[11px] font-bold leading-tight text-heading">
                  {practice.name}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div key="offers-step" className="flex flex-col gap-2">
          {activePractice?.offers.map((offer, index) => {
            const selected = offer.id === value
            return (
              <button
                key={offer.id}
                type="button"
                onClick={() => handleOfferSelect(offer.id)}
                style={{ animationDelay: `${index * 45}ms` }}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-left",
                  RELIEF_HOVER,
                  leaving ? "kredo-offer-card-out" : "kredo-offer-card-in",
                  selected ? "bg-primary/8" : "bg-canvas/50 hover:bg-canvas",
                )}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-heading">{offer.name}</span>
                  {offer.shortDescription && (
                    <span className="line-clamp-2 text-[11px] leading-relaxed text-muted">
                      {offer.shortDescription}
                    </span>
                  )}
                </div>
                {selected && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    className="mt-0.5 size-4 shrink-0 text-primary"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </AppDialog>
  )
}

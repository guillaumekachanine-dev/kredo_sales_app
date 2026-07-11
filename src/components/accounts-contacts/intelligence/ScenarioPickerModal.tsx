"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { AppDialog } from "@/components/ui/AppDialog"
import { cn } from "@/lib/utils"
import type { CommunicationOutputKind, CommunicationScenario } from "@/lib/n8n/types"
import {
  type ActivityCategory,
  type ScenarioRegistryItem,
} from "@/lib/communication/communication-scenario-registry"
import { getScenarioPurposeGroups } from "@/lib/communication/communication-purpose"

const BACK_COLLAPSE_MS = 130

// "Mise en relief" — même traitement que OfferPickerModal (lift + ombre
// portée au survol, sans balayage animé). Voir .kredo-relief-hover, globals.css.
const RELIEF_HOVER = "kredo-relief-hover"

const CATEGORY_IMAGE_SRC: Record<ActivityCategory, string> = {
  recrutement: "/icons_set/recrutement%20%26%20staffing/candidate_CV_sent.png",
  management_consultants: "/icons_set/recrutement%20%26%20staffing/candidate_CV_sent.png",
  internal_staff: "/icons_set/presentation_client_rt_2.png",
  commerce_prospection: "/icons_set/contexte_client.png",
  commerce_actif: "/icons_set/contacts_client.png",
  delivery: "/icons_set/Data_%26_IA.png",
}

type CategoryGroup = {
  value: ActivityCategory
  label: string
  dataviz: 1 | 2 | 3 | 4 | 5 | 6
  scenarios: ScenarioRegistryItem[]
}

// Le scanner Tailwind v4 exige des chaînes de classe littérales et complètes
// dans le code source — un template literal interpolé (`border-dataviz-${n}`)
// ne serait jamais détecté et ne générerait aucun CSS. D'où cette table
// exhaustive plutôt qu'une composition dynamique de classes.
const CATEGORY_TONE_CLASSES: Record<1 | 2 | 3 | 4 | 5 | 6, { card: string; icon: string }> = {
  1: { card: "border-dataviz-1/35 bg-dataviz-1/[0.05] hover:border-dataviz-1/70", icon: "text-dataviz-1" },
  2: { card: "border-dataviz-2/35 bg-dataviz-2/[0.05] hover:border-dataviz-2/70", icon: "text-dataviz-2" },
  3: { card: "border-dataviz-3/35 bg-dataviz-3/[0.05] hover:border-dataviz-3/70", icon: "text-dataviz-3" },
  4: { card: "border-dataviz-4/35 bg-dataviz-4/[0.05] hover:border-dataviz-4/70", icon: "text-dataviz-4" },
  5: { card: "border-dataviz-5/35 bg-dataviz-5/[0.05] hover:border-dataviz-5/70", icon: "text-dataviz-5" },
  6: { card: "border-dataviz-6/35 bg-dataviz-6/[0.05] hover:border-dataviz-6/70", icon: "text-dataviz-6" },
}

// Sélecteur de scénario en 2 étapes : catégorie d'activité (6 cartes) →
// scénario (liste), filtré par finalité canonique outputKind. Réplique la
// structure et les animations d'OfferPickerModal
// (practice → offre) — copie contrôlée (ADR-0013 D-8), pas d'abstraction
// générique prématurée pour deux usages.
export function ScenarioPickerModal({
  open,
  onOpenChange,
  outputKind,
  value,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  outputKind: CommunicationOutputKind
  value: CommunicationScenario | undefined
  onSelect: (scenario: CommunicationScenario) => void
}) {
  const [step, setStep] = useState<"category" | "scenarios">("category")
  const [activeCategory, setActiveCategory] = useState<ActivityCategory | null>(null)
  const [leaving, setLeaving] = useState(false)

  const categories = useMemo<CategoryGroup[]>(() => {
    return getScenarioPurposeGroups(outputKind)
  }, [outputKind])

  const activeGroup = categories.find((c) => c.value === activeCategory) ?? null

  // Reset au moment de la fermeture (pas à l'ouverture) — même pattern
  // qu'OfferPickerModal : évite un setState synchrone dans un effect, la
  // prochaine ouverture retrouve un état propre.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setStep("category")
      setActiveCategory(null)
      setLeaving(false)
    }
    onOpenChange(next)
  }

  function handleCategorySelect(category: ActivityCategory) {
    setActiveCategory(category)
    setStep("scenarios")
  }

  function handleBack() {
    setLeaving(true)
    window.setTimeout(() => {
      setStep("category")
      setActiveCategory(null)
      setLeaving(false)
    }, BACK_COLLAPSE_MS)
  }

  function handleScenarioSelect(scenario: CommunicationScenario) {
    onSelect(scenario)
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
          {step === "scenarios" && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Retour aux catégories"
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-heading"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 className="truncate font-heading text-sm font-bold text-heading">
            {step === "category" ? "Choisir une catégorie" : activeGroup?.label ?? "Choisir un scénario"}
          </h2>
        </div>
      }
    >
      {step === "category" ? (
        <div key="category-step" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.map((category, index) => (
            <button
              key={category.value}
              type="button"
              onClick={() => handleCategorySelect(category.value)}
              style={{ animationDelay: `${index * 40}ms` }}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center",
                CATEGORY_TONE_CLASSES[category.dataviz].card,
                RELIEF_HOVER,
                leaving ? "kredo-offer-card-out" : "kredo-offer-card-in",
              )}
            >
              <span className="relative z-10 flex size-11 items-center justify-center">
                <Image
                  src={CATEGORY_IMAGE_SRC[category.value]}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 object-contain"
                />
              </span>
              <span className="relative z-10 line-clamp-2 text-[11px] font-bold leading-tight text-heading">
                {category.label}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div key="scenarios-step" className="flex flex-col gap-2">
          {activeGroup?.scenarios.map((scenario, index) => {
            const selected = scenario.value === value
            return (
              <button
                key={scenario.value}
                type="button"
                onClick={() => handleScenarioSelect(scenario.value)}
                style={{ animationDelay: `${index * 45}ms` }}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-left",
                  RELIEF_HOVER,
                  leaving ? "kredo-offer-card-out" : "kredo-offer-card-in",
                  selected ? "bg-primary/8" : "bg-canvas/50 hover:bg-canvas",
                )}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-heading">{scenario.label}</span>
                  <span className="line-clamp-2 text-[11px] leading-relaxed text-muted">
                    {scenario.description}
                  </span>
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

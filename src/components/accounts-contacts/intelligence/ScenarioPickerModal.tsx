"use client"

import { useMemo, useState } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { cn } from "@/lib/utils"
import type { CommunicationScenario } from "@/lib/n8n/types"
import {
  ACTIVITY_CATEGORY_OPTIONS,
  SCENARIO_REGISTRY,
  filterScenariosByUseCase,
  type ActivityCategory,
  type ScenarioRegistryItem,
} from "@/lib/communication/communication-scenario-registry"

const BACK_COLLAPSE_MS = 130

// "Mise en relief" — même traitement que OfferPickerModal (lift + ombre
// portée au survol, sans balayage animé). Voir .kredo-relief-hover, globals.css.
const RELIEF_HOVER = "kredo-relief-hover"

// Icônes outline dessinées à la main (pas de librairie d'icônes dans ce
// projet) — même gabarit que la flèche retour d'OfferPickerModal.
function CategoryIcon({ category }: { category: ActivityCategory }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  switch (category) {
    case "commerce_prospection":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      )
    case "commerce_actif":
      return (
        <svg {...common}>
          <path d="M4 12a8 8 0 0114-5.3" />
          <path d="M20 6v5h-5" />
          <path d="M20 12a8 8 0 01-14 5.3" />
          <path d="M4 18v-5h5" />
        </svg>
      )
    case "delivery":
      return (
        <svg {...common}>
          <rect x="6" y="4" width="12" height="16" rx="2" />
          <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      )
    case "recrutement":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M3 20a6 6 0 0112 0" />
          <path d="M18 8v5" />
          <path d="M15.5 10.5h5" />
        </svg>
      )
    case "interne_management":
      return (
        <svg {...common}>
          <circle cx="8.5" cy="8" r="3" />
          <path d="M2.5 20a6 6 0 0112 0" />
          <path d="M14 5.2a3 3 0 010 5.6" />
          <path d="M17 20a5.2 5.2 0 00-3-4.7" />
        </svg>
      )
  }
}

type CategoryGroup = {
  value: ActivityCategory
  label: string
  dataviz: 1 | 2 | 3 | 4 | 5
  scenarios: ScenarioRegistryItem[]
}

// Le scanner Tailwind v4 exige des chaînes de classe littérales et complètes
// dans le code source — un template literal interpolé (`border-dataviz-${n}`)
// ne serait jamais détecté et ne générerait aucun CSS. D'où cette table
// exhaustive plutôt qu'une composition dynamique de classes.
const CATEGORY_TONE_CLASSES: Record<1 | 2 | 3 | 4 | 5, { card: string; icon: string }> = {
  1: { card: "border-dataviz-1/35 bg-dataviz-1/[0.05] hover:border-dataviz-1/70", icon: "text-dataviz-1" },
  2: { card: "border-dataviz-2/35 bg-dataviz-2/[0.05] hover:border-dataviz-2/70", icon: "text-dataviz-2" },
  3: { card: "border-dataviz-3/35 bg-dataviz-3/[0.05] hover:border-dataviz-3/70", icon: "text-dataviz-3" },
  4: { card: "border-dataviz-4/35 bg-dataviz-4/[0.05] hover:border-dataviz-4/70", icon: "text-dataviz-4" },
  5: { card: "border-dataviz-5/35 bg-dataviz-5/[0.05] hover:border-dataviz-5/70", icon: "text-dataviz-5" },
}

// Sélecteur de scénario en 2 étapes : catégorie d'activité (5 cartes) →
// scénario (liste), filtré par useCase (mail ou pitch selon le mode du
// composer). Réplique la structure et les animations d'OfferPickerModal
// (practice → offre) — copie contrôlée (ADR-0013 D-8), pas d'abstraction
// générique prématurée pour deux usages.
export function ScenarioPickerModal({
  open,
  onOpenChange,
  useCase,
  value,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  useCase: "mail" | "pitch"
  value: CommunicationScenario | undefined
  onSelect: (scenario: CommunicationScenario) => void
}) {
  const [step, setStep] = useState<"category" | "scenarios">("category")
  const [activeCategory, setActiveCategory] = useState<ActivityCategory | null>(null)
  const [leaving, setLeaving] = useState(false)

  const categories = useMemo<CategoryGroup[]>(() => {
    return ACTIVITY_CATEGORY_OPTIONS.map((cat) => ({
      ...cat,
      scenarios: filterScenariosByUseCase(
        SCENARIO_REGISTRY.filter((item) => item.activityCategory === cat.value),
        useCase,
      ),
    })).filter((group) => group.scenarios.length > 0)
  }, [useCase])

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
      className="sm:max-w-2xl"
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
              <span className={cn("relative z-10 flex size-9 items-center justify-center", CATEGORY_TONE_CLASSES[category.dataviz].icon)}>
                <CategoryIcon category={category.value} />
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

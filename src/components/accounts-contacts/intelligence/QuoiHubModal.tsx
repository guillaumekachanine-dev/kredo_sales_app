"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { AppDialog } from "@/components/ui/AppDialog"
import { cn } from "@/lib/utils"
import type {
  CommunicationObjective,
  CommunicationOutputKind,
  CommunicationScenario,
} from "@/lib/n8n/types"
import {
  type ActivityCategory,
  type ScenarioRegistryItem,
} from "@/lib/communication/communication-scenario-registry"
import { getScenarioPurposeGroups } from "@/lib/communication/communication-purpose"

// Hub unique de la section "Quoi" : une seule modale qui présente
// successivement Catégorie → Scénario → Objectif. Reprend le design (thème
// cobalt/or, cartes carrées, mise en relief au survol) et les animations
// (kredo-offer-card-in/out, kredo-relief-hover) de l'ancienne modale de
// scénario, étendues à trois étapes avec navigation arrière et transitions
// directionnelles homogènes.

// Durée de repli (sortie) avant de basculer d'étape. La distribution
// progressive (kredo-offer-card-in) rejoue à l'entrée via le remontage par
// `key={step}`. Un peu plus lent que l'ancienne valeur (130 ms) pour une
// sensation premium, pas réactive.
const STEP_LEAVE_MS = 190

const RELIEF_HOVER = "kredo-relief-hover"

const CATEGORY_IMAGE_SRC: Record<ActivityCategory, string> = {
  recrutement: "/icons_set/recrutement%20%26%20staffing/candidate_CV_sent.png",
  management_consultants: "/icons_set/recrutement%20%26%20staffing/candidate_CV_sent.png",
  internal_staff: "/icons_set/presentation_client_rt_2.png",
  commerce_prospection: "/icons_set/contexte_client.png",
  commerce_actif: "/icons_set/contacts_client.png",
  delivery: "/icons_set/Data_%26_IA.png",
}

// Le scanner Tailwind v4 exige des classes littérales complètes — pas
// d'interpolation (`border-dataviz-${n}`). D'où cette table exhaustive.
const CATEGORY_TONE_CLASSES: Record<1 | 2 | 3 | 4 | 5 | 6, { card: string }> = {
  1: { card: "border-dataviz-1/35 bg-dataviz-1/[0.05] hover:border-dataviz-1/70" },
  2: { card: "border-dataviz-2/35 bg-dataviz-2/[0.05] hover:border-dataviz-2/70" },
  3: { card: "border-dataviz-3/35 bg-dataviz-3/[0.05] hover:border-dataviz-3/70" },
  4: { card: "border-dataviz-4/35 bg-dataviz-4/[0.05] hover:border-dataviz-4/70" },
  5: { card: "border-dataviz-5/35 bg-dataviz-5/[0.05] hover:border-dataviz-5/70" },
  6: { card: "border-dataviz-6/35 bg-dataviz-6/[0.05] hover:border-dataviz-6/70" },
}

type CategoryGroup = {
  value: ActivityCategory
  label: string
  dataviz: 1 | 2 | 3 | 4 | 5 | 6
  scenarios: ScenarioRegistryItem[]
}

type HubStep = "category" | "scenarios" | "objective"

export type QuoiObjectiveOption = { value: CommunicationObjective; label: string }

export function QuoiHubModal({
  open,
  onOpenChange,
  outputKind,
  initialStep,
  showCategory,
  availableCategories,
  categoryValue,
  onSelectCategory,
  scenarioValue,
  allowedScenarios,
  onSelectScenario,
  objectiveOptions,
  objectiveValue,
  onSelectObjective,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  outputKind: CommunicationOutputKind
  initialStep: HubStep
  showCategory: boolean
  availableCategories: ActivityCategory[]
  categoryValue: ActivityCategory
  onSelectCategory: (category: ActivityCategory) => void
  scenarioValue: CommunicationScenario | undefined
  allowedScenarios?: CommunicationScenario[]
  onSelectScenario: (scenario: CommunicationScenario) => void
  objectiveOptions: QuoiObjectiveOption[]
  objectiveValue: CommunicationObjective
  onSelectObjective: (objective: CommunicationObjective) => void
}) {
  const firstStep: HubStep = showCategory ? "category" : "scenarios"
  const normalizedInitial: HubStep = !showCategory && initialStep === "category" ? "scenarios" : initialStep

  const [step, setStep] = useState<HubStep>(normalizedInitial)
  const [activeCategory, setActiveCategory] = useState<ActivityCategory>(categoryValue)
  const [leaving, setLeaving] = useState(false)
  const leaveTimer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (leaveTimer.current) window.clearTimeout(leaveTimer.current)
    },
    [],
  )

  const categories = useMemo<CategoryGroup[]>(() => {
    const groups = getScenarioPurposeGroups(outputKind)
    const categoryFilter = new Set(availableCategories)
    const scenarioFilter = allowedScenarios ? new Set(allowedScenarios) : null
    return groups
      .filter((group) => categoryFilter.has(group.value))
      .map((group) => ({
        ...group,
        scenarios: scenarioFilter
          ? group.scenarios.filter((scenario) => scenarioFilter.has(scenario.value))
          : group.scenarios,
      }))
      .filter((group) => group.scenarios.length > 0)
  }, [outputKind, availableCategories, allowedScenarios])

  const activeGroup = categories.find((c) => c.value === activeCategory) ?? categories[0] ?? null

  // Synchronise l'état interne à l'ouverture (pattern "ajuster l'état pendant le
  // rendu" plutôt qu'un effect avec setState) : l'ouverture est un changement de
  // prop, pas un événement local.
  const [trackedOpen, setTrackedOpen] = useState(open)
  if (open !== trackedOpen) {
    setTrackedOpen(open)
    if (open) {
      setStep(normalizedInitial)
      setActiveCategory(categoryValue)
      setLeaving(false)
    }
  }

  // Transition d'étape : repli (leaving) puis bascule. Le remontage par
  // `key={step}` rejoue la distribution progressive à l'entrée.
  function navigate(next: HubStep) {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current)
    setLeaving(true)
    leaveTimer.current = window.setTimeout(() => {
      setLeaving(false)
      setStep(next)
      leaveTimer.current = null
    }, STEP_LEAVE_MS)
  }

  function handleClose(next: boolean) {
    if (!next) {
      setStep(firstStep)
      setActiveCategory(categoryValue)
      setLeaving(false)
    }
    onOpenChange(next)
  }

  function handleCategorySelect(category: ActivityCategory) {
    onSelectCategory(category)
    setActiveCategory(category)
    navigate("scenarios")
  }

  function handleScenarioSelect(scenario: CommunicationScenario) {
    onSelectScenario(scenario)
    navigate("objective")
  }

  function handleObjectiveSelect(objective: CommunicationObjective) {
    onSelectObjective(objective)
    handleClose(false)
  }

  function handleBack() {
    navigate(step === "objective" ? "scenarios" : "category")
  }

  const canGoBack = (step === "scenarios" && showCategory) || step === "objective"

  // Objectif suggéré (valeur courante après cascade) épinglé en tête, puis le
  // reste dans l'ordre du référentiel.
  const orderedObjectives = useMemo<Array<QuoiObjectiveOption & { suggested: boolean }>>(() => {
    const suggested = objectiveOptions.find((o) => o.value === objectiveValue)
    const rest = objectiveOptions.filter((o) => o.value !== objectiveValue)
    return [
      ...(suggested ? [{ ...suggested, suggested: true }] : []),
      ...rest.map((o) => ({ ...o, suggested: false })),
    ]
  }, [objectiveOptions, objectiveValue])

  const title =
    step === "category"
      ? "Choisir une catégorie"
      : step === "scenarios"
        ? activeGroup?.label ?? "Choisir un scénario"
        : "Définir l'objectif"

  const panelCls = cn("min-h-[13rem]", leaving ? "kredo-quoi-panel-out" : "kredo-quoi-panel-in")

  return (
    <AppDialog
      open={open}
      onOpenChange={handleClose}
      className="communication-picker-modal sm:max-w-2xl"
      headerClassName="communication-picker-modal-header"
      bodyClassName="communication-picker-modal-body"
      title={
        <div className="flex items-center gap-2">
          {canGoBack && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Étape précédente"
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-heading"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 className="truncate font-heading text-sm font-bold text-heading">{title}</h2>
          <StepDots step={step} showCategory={showCategory} />
        </div>
      }
    >
      {step === "category" ? (
        <div key="category-step" className={cn(panelCls, "grid grid-cols-2 gap-3 sm:grid-cols-3")}>
          {categories.map((category, index) => (
            <button
              key={category.value}
              type="button"
              onClick={() => handleCategorySelect(category.value)}
              style={{ animationDelay: leaving ? "0ms" : `${index * 45}ms` }}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center",
                CATEGORY_TONE_CLASSES[category.dataviz].card,
                category.value === categoryValue && "ring-2 ring-primary/70",
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
      ) : step === "scenarios" ? (
        <div key="scenarios-step" className={cn(panelCls, "flex flex-col gap-2")}>
          {activeGroup?.scenarios.map((scenario, index) => {
            const selected = scenario.value === scenarioValue
            return (
              <button
                key={scenario.value}
                type="button"
                onClick={() => handleScenarioSelect(scenario.value)}
                style={{ animationDelay: leaving ? "0ms" : `${index * 42}ms` }}
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
                {selected && <CheckIcon />}
              </button>
            )
          })}
        </div>
      ) : (
        <div key="objective-step" className={cn(panelCls, "mx-auto flex max-w-md flex-col gap-2")}>
          <p className="mb-1 text-center text-[11px] leading-relaxed text-muted">
            Quel est le but recherché par ce message ?
          </p>
          {orderedObjectives.map((objective, index) => {
            const selected = objective.value === objectiveValue
            return (
              <button
                key={objective.value}
                type="button"
                onClick={() => handleObjectiveSelect(objective.value)}
                style={{ animationDelay: leaving ? "0ms" : `${index * 40}ms` }}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left",
                  RELIEF_HOVER,
                  leaving ? "kredo-offer-card-out" : "kredo-offer-card-in",
                  selected
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/40 bg-canvas/50 hover:bg-canvas",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className={cn("text-xs font-bold", selected ? "text-primary" : "text-heading")}>
                    {objective.label}
                  </span>
                  {objective.suggested && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em] text-primary">
                      Suggéré
                    </span>
                  )}
                </span>
                {selected && <CheckIcon />}
              </button>
            )
          })}
        </div>
      )}
    </AppDialog>
  )
}

function StepDots({ step, showCategory }: { step: HubStep; showCategory: boolean }) {
  const steps: HubStep[] = showCategory ? ["category", "scenarios", "objective"] : ["scenarios", "objective"]
  return (
    <span className="ml-auto flex items-center gap-1.5" aria-hidden="true">
      {steps.map((s) => (
        <span
          key={s}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            s === step ? "w-4 bg-primary" : "w-1.5 bg-border",
          )}
        />
      ))}
    </span>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      className="mt-0.5 size-4 shrink-0 text-primary"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

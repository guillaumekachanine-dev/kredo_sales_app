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
import {
  STEP_LEAVE_MS,
  StepDots,
  CategoryCard,
  ScenarioCard,
  ObjectiveCard,
} from "./QuoiHubShared"

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

  const steps = useMemo<HubStep[]>(() => showCategory ? ["category", "scenarios", "objective"] : ["scenarios", "objective"], [showCategory])
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
          <StepDots steps={steps} currentStep={step} />
        </div>
      }
    >
      {step === "category" ? (
        <div key="category-step" className={cn(panelCls, "grid grid-cols-2 gap-3 sm:grid-cols-3")}>
          {categories.map((category, index) => (
            <CategoryCard
              key={category.value}
              value={category.value}
              label={category.label}
              dataviz={category.dataviz}
              isSelected={category.value === categoryValue}
              onClick={() => handleCategorySelect(category.value)}
              style={{ animationDelay: leaving ? "0ms" : `${index * 45}ms` }}
              className={leaving ? "kredo-offer-card-out" : "kredo-offer-card-in"}
            />
          ))}
        </div>
      ) : step === "scenarios" ? (
        <div key="scenarios-step" className={cn(panelCls, "flex flex-col gap-2")}>
          {activeGroup?.scenarios.map((scenario, index) => (
            <ScenarioCard
              key={scenario.value}
              label={scenario.label}
              description={scenario.description}
              isSelected={scenario.value === scenarioValue}
              onClick={() => handleScenarioSelect(scenario.value)}
              style={{ animationDelay: leaving ? "0ms" : `${index * 42}ms` }}
              className={leaving ? "kredo-offer-card-out" : "kredo-offer-card-in"}
            />
          ))}
        </div>
      ) : (
        <div key="objective-step" className={cn(panelCls, "mx-auto flex max-w-md flex-col gap-2")}>
          <p className="mb-1 text-center text-[11px] leading-relaxed text-muted">
            Quel est le but recherché par ce message ?
          </p>
          {orderedObjectives.map((objective, index) => (
            <ObjectiveCard
              key={objective.value}
              label={objective.label}
              suggested={objective.suggested}
              isSelected={objective.value === objectiveValue}
              onClick={() => handleObjectiveSelect(objective.value)}
              style={{ animationDelay: leaving ? "0ms" : `${index * 40}ms` }}
              className={leaving ? "kredo-offer-card-out" : "kredo-offer-card-in"}
            />
          ))}
        </div>
      )}
    </AppDialog>
  )
}

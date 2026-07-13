"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ProgressivePickerModal } from "@/components/ui/ProgressivePickerModal"
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

const STEP_LEAVE_MS = 190

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

  const [trackedOpen, setTrackedOpen] = useState(open)
  if (open !== trackedOpen) {
    setTrackedOpen(open)
    if (open) {
      setStep(normalizedInitial)
      setActiveCategory(categoryValue)
      setLeaving(false)
    }
  }

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
  const stepsList = showCategory ? ["category", "scenarios", "objective"] : ["scenarios", "objective"]

  return (
    <ProgressivePickerModal
      open={open}
      onOpenChange={handleClose}
      title={title}
      step={step}
      steps={stepsList}
      onBack={canGoBack ? handleBack : undefined}
      leaving={leaving}
      variant="dark"
    >
      {step === "category" ? (
        <div key="category-step" className={cn(panelCls, "grid grid-cols-2 gap-3 sm:grid-cols-3")}>
          {categories.map((category, index) => (
            <ProgressivePickerModal.CategoryCard
              key={category.value}
              value={category.value}
              label={category.label}
              dataviz={category.dataviz}
              iconUrl={CATEGORY_IMAGE_SRC[category.value]}
              selected={category.value === categoryValue}
              onClick={() => handleCategorySelect(category.value)}
              index={index}
            />
          ))}
        </div>
      ) : step === "scenarios" ? (
        <div key="scenarios-step" className={cn(panelCls, "flex flex-col gap-2")}>
          {activeGroup?.scenarios.map((scenario, index) => {
            const selected = scenario.value === scenarioValue
            return (
              <ProgressivePickerModal.ItemRow
                key={scenario.value}
                value={scenario.value}
                label={scenario.label}
                description={scenario.description}
                selected={selected}
                onClick={() => handleScenarioSelect(scenario.value)}
                index={index}
              />
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
                  "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left cursor-pointer",
                  "kredo-relief-hover",
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
    </ProgressivePickerModal>
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

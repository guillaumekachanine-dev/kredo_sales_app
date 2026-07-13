"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { AppDialog } from "@/components/ui/AppDialog"
import { cn } from "@/lib/utils"
import type { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import type {
  CommunicationBrief,
  CommunicationChannel,
  CommunicationObjective,
  CommunicationOutputKind,
  CommunicationScenario,
} from "@/lib/n8n/types"
import {
  SCENARIO_REGISTRY,
  type ActivityCategory,
  type ScenarioRegistryItem,
} from "@/lib/communication/communication-scenario-registry"
import { CHANNEL_OPTIONS } from "@/components/accounts-contacts/intelligence/communication-brief-options"
import {
  NEUTRAL_LAUNCH_FAMILIES,
  buildNeutralCommunicationBrief,
  getNeutralObjectiveOptions,
  getNeutralScenariosByFamily,
  getNeutralSecondaryChannelOptions,
  type NeutralFamilyGroup,
} from "@/lib/communication/neutral-launch"
import {
  STEP_LEAVE_MS,
  RELIEF_HOVER,
  StepDots,
  CategoryCard,
  ScenarioCard,
  ObjectiveCard,
} from "@/components/accounts-contacts/intelligence/QuoiHubShared"

type NeutralHubStep = "category" | "scenarios" | "objective" | "format"

export const FAMILIES: NeutralFamilyGroup[] = NEUTRAL_LAUNCH_FAMILIES

type FormatPrincipalOption = {
  value: CommunicationOutputKind
  label: string
  image: string
}

const PRINCIPAL_FORMATS: FormatPrincipalOption[] = [
  {
    value: "written_message",
    label: "Mail",
    image: "/icons_set/cockpit_intelligence/redaction_message_ai.png",
  },
  {
    value: "spoken_pitch",
    label: "Pitch",
    image: "/icons_set/cockpit_intelligence/generation_pitch.png",
  },
  {
    value: "structured_briefing",
    label: "RDV",
    image: "/icons_set/cockpit_intelligence/generer_rapport.png",
  },
]

interface NeutralLaunchViewProps {
  activeCategory: ActivityCategory
  selectedScenario: CommunicationScenario | undefined
  selectedObjective: CommunicationObjective | undefined
  selectedOutputKind: CommunicationOutputKind | null
  allowedOutputKinds: CommunicationOutputKind[]
  secondaryChannelOptions: typeof CHANNEL_OPTIONS
  scenariosList: ScenarioRegistryItem[]
  leaving: boolean
  step: NeutralHubStep
  handleCategorySelect: (category: ActivityCategory) => void
  handleScenarioSelect: (scenario: CommunicationScenario) => void
  handleObjectiveSelect: (objective: CommunicationObjective) => void
  handleSelectOutputKind: (kind: CommunicationOutputKind) => void
  handleSelectChannel: (channel: CommunicationChannel) => void
  setSelectedOutputKind: (kind: CommunicationOutputKind | null) => void
  setSelectedChannel: (channel: CommunicationChannel | null) => void
  objectiveOptions: Array<{ value: CommunicationObjective; label: string; suggested: boolean }>
}

export function NeutralCommunicationLaunchModal({
  open,
  onOpenChange,
  onComplete,
  device,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (brief: CommunicationBrief) => void
  device: DashboardDevice
}) {
  const [step, setStep] = useState<NeutralHubStep>("category")
  const [activeCategory, setActiveCategory] = useState<ActivityCategory>("commerce_prospection")
  const [selectedScenario, setSelectedScenario] = useState<CommunicationScenario | undefined>(undefined)
  const [selectedObjective, setSelectedObjective] = useState<CommunicationObjective | undefined>(undefined)
  const [selectedOutputKind, setSelectedOutputKind] = useState<CommunicationOutputKind | null>(null)
  const [, setSelectedChannel] = useState<CommunicationChannel | null>(null)

  const [leaving, setLeaving] = useState(false)
  const leaveTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (leaveTimer.current) window.clearTimeout(leaveTimer.current)
    }
  }, [])

  const [trackedOpen, setTrackedOpen] = useState(open)
  if (open !== trackedOpen) {
    setTrackedOpen(open)
    if (open) {
      setStep("category")
      setActiveCategory("commerce_prospection")
      setSelectedScenario(undefined)
      setSelectedObjective(undefined)
      setSelectedOutputKind(null)
      setSelectedChannel(null)
      setLeaving(false)
    }
  }

  function navigate(next: NeutralHubStep) {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current)
    setLeaving(true)
    leaveTimer.current = window.setTimeout(() => {
      setLeaving(false)
      setStep(next)
      leaveTimer.current = null
    }, STEP_LEAVE_MS)
  }

  const scenarioItem = useMemo<ScenarioRegistryItem | undefined>(() => {
    if (!selectedScenario) return undefined
    return SCENARIO_REGISTRY.find((s) => s.value === selectedScenario)
  }, [selectedScenario])

  function handleCategorySelect(category: ActivityCategory) {
    setActiveCategory(category)
    setSelectedScenario(undefined)
    setSelectedObjective(undefined)
    setSelectedOutputKind(null)
    setSelectedChannel(null)
    navigate("scenarios")
  }

  function handleScenarioSelect(scenario: CommunicationScenario) {
    setSelectedScenario(scenario)
    // Apply scenario defaults and clear downstream selections
    const definition = SCENARIO_REGISTRY.find((s) => s.value === scenario)
    if (definition) {
      setSelectedObjective(definition.defaultObjective)
    } else {
      setSelectedObjective(undefined)
    }
    setSelectedOutputKind(null)
    setSelectedChannel(null)
    navigate("objective")
  }

  function handleObjectiveSelect(objective: CommunicationObjective) {
    setSelectedObjective(objective)
    navigate("format")
  }

  const objectiveOptions = useMemo(() => {
    return getNeutralObjectiveOptions(selectedScenario)
  }, [selectedScenario])

  const allowedOutputKinds = useMemo<CommunicationOutputKind[]>(() => {
    if (!scenarioItem) return []
    return scenarioItem.allowedOutputKinds
  }, [scenarioItem])

  const secondaryChannelOptions = useMemo(() => {
    return getNeutralSecondaryChannelOptions(selectedScenario, selectedOutputKind)
  }, [selectedScenario, selectedOutputKind])

  function handleSelectOutputKind(kind: CommunicationOutputKind) {
    if (!allowedOutputKinds.includes(kind)) return
    setSelectedOutputKind(kind)
    setSelectedChannel(null)
  }

  function handleSelectChannel(channel: CommunicationChannel) {
    setSelectedChannel(channel)

    if (!selectedScenario || !selectedObjective || !selectedOutputKind) return

    onComplete(buildNeutralCommunicationBrief({
      activityCategory: activeCategory,
      scenario: selectedScenario,
      objective: selectedObjective,
      outputKind: selectedOutputKind,
      channel,
    }))
  }

  function handleBack() {
    if (step === "format" && selectedOutputKind) {
      setSelectedOutputKind(null)
      setSelectedChannel(null)
    } else if (step === "format") {
      navigate("objective")
    } else if (step === "objective") {
      navigate("scenarios")
    } else if (step === "scenarios") {
      navigate("category")
    }
  }

  function handleClose(next: boolean) {
    if (!next) {
      setStep("category")
      onOpenChange(false)
    }
  }

  const steps = ["category", "scenarios", "objective", "format"]

  const title =
    step === "category"
      ? "Choisir une famille"
      : step === "scenarios"
        ? FAMILIES.find((f) => f.value === activeCategory)?.label ?? "Choisir un scénario"
        : step === "objective"
          ? "Définir l'objectif"
          : "Choisir le format"

  const canGoBack = step !== "category"

  const scenariosList = useMemo(() => {
    return getNeutralScenariosByFamily(activeCategory)
  }, [activeCategory])

  const viewProps: NeutralLaunchViewProps = {
    activeCategory,
    selectedScenario,
    selectedObjective,
    selectedOutputKind,
    allowedOutputKinds,
    secondaryChannelOptions,
    scenariosList,
    leaving,
    step,
    handleCategorySelect,
    handleScenarioSelect,
    handleObjectiveSelect,
    handleSelectOutputKind,
    handleSelectChannel,
    setSelectedOutputKind,
    setSelectedChannel,
    objectiveOptions,
  }

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
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-heading cursor-pointer"
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
      {device === "mobile" ? (
        <NeutralCommunicationLaunchMobile {...viewProps} />
      ) : (
        <NeutralCommunicationLaunchDesktop {...viewProps} />
      )}
    </AppDialog>
  )
}

function NeutralCommunicationLaunchDesktop(props: NeutralLaunchViewProps) {
  const panelCls = cn("min-h-[13rem] w-full", props.leaving ? "kredo-quoi-panel-out" : "kredo-quoi-panel-in")
  return (
    <div className="flex flex-col items-center w-full">
      {props.step === "category" ? (
        <div key="category-step" className={cn(panelCls, "grid grid-cols-3 gap-3")}>
          {FAMILIES.map((family, index) => (
            <CategoryCard
              key={family.value}
              value={family.value}
              label={family.label}
              dataviz={family.dataviz}
              isSelected={family.value === props.activeCategory}
              onClick={() => props.handleCategorySelect(family.value)}
              style={{ animationDelay: props.leaving ? "0ms" : `${index * 45}ms` }}
              className={props.leaving ? "kredo-offer-card-out" : "kredo-offer-card-in"}
            />
          ))}
        </div>
      ) : props.step === "scenarios" ? (
        <div key="scenarios-step" className={cn(panelCls, "flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1")}>
          {props.scenariosList.map((scenario, index) => (
            <ScenarioCard
              key={scenario.value}
              label={scenario.label}
              description={scenario.description}
              isSelected={scenario.value === props.selectedScenario}
              onClick={() => props.handleScenarioSelect(scenario.value)}
              style={{ animationDelay: props.leaving ? "0ms" : `${index * 42}ms` }}
              className={props.leaving ? "kredo-offer-card-out" : "kredo-offer-card-in"}
            />
          ))}
        </div>
      ) : props.step === "objective" ? (
        <div key="objective-step" className={cn(panelCls, "mx-auto flex max-w-md flex-col gap-2")}>
          <p className="mb-1 text-center text-[11px] leading-relaxed text-muted">
            Quel est le but recherché ?
          </p>
          {props.objectiveOptions.map((objective, index) => (
            <ObjectiveCard
              key={objective.value}
              label={objective.label}
              suggested={objective.suggested}
              isSelected={objective.value === props.selectedObjective}
              onClick={() => props.handleObjectiveSelect(objective.value)}
              style={{ animationDelay: props.leaving ? "0ms" : `${index * 40}ms` }}
              className={props.leaving ? "kredo-offer-card-out" : "kredo-offer-card-in"}
            />
          ))}
        </div>
      ) : (
        <div key="format-step" className={cn(panelCls, "flex flex-col items-center justify-center w-full")}>
          {!props.selectedOutputKind ? (
            <div className="grid grid-cols-3 gap-4 w-full">
              {PRINCIPAL_FORMATS.map((format) => {
                const allowed = props.allowedOutputKinds.includes(format.value)
                return (
                  <button
                    key={format.value}
                    type="button"
                    disabled={!allowed}
                    onClick={() => props.handleSelectOutputKind(format.value)}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-3 rounded-2xl border p-4 text-center aspect-square w-full transition-all duration-200 cursor-pointer min-h-[44px]",
                      allowed
                        ? "border-border/35 bg-surface/10 hover:border-primary/50 hover:bg-surface/20"
                        : "border-border/10 bg-surface/5 opacity-40 cursor-not-allowed",
                      RELIEF_HOVER,
                    )}
                  >
                    <span className="relative flex size-12 items-center justify-center">
                      <Image
                        src={format.image}
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 object-contain"
                      />
                    </span>
                    <span className="text-xs font-bold text-heading">
                      {format.label}
                    </span>
                    {!allowed && (
                      <span className="text-[9px] text-danger/80 mt-1 block">
                        Non disponible pour ce scénario.
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="w-full flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-200">
              {/* Selected Principal Format (Compact representation) */}
              <div className="flex items-center justify-between border border-primary/20 bg-primary/[0.04] rounded-xl px-4 py-2.5 w-full">
                <div className="flex items-center gap-3">
                  <Image
                    src={PRINCIPAL_FORMATS.find((f) => f.value === props.selectedOutputKind)?.image || ""}
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 object-contain"
                  />
                  <span className="text-xs font-bold text-heading">
                    Format principal : {PRINCIPAL_FORMATS.find((f) => f.value === props.selectedOutputKind)?.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    props.setSelectedOutputKind(null)
                    props.setSelectedChannel(null)
                  }}
                  className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Modifier
                </button>
              </div>

              {/* Secondary Formats / Channels list */}
              <div className="flex flex-col gap-2 w-full animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-[11px] text-muted text-center mb-1">
                  Sélectionnez un format secondaire pour finaliser
                </p>
                {props.secondaryChannelOptions.map((channel) => (
                  <button
                    key={channel.value}
                    type="button"
                    onClick={() => props.handleSelectChannel(channel.value)}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-canvas/50 hover:bg-canvas px-4 py-3 text-left w-full cursor-pointer min-h-[44px]",
                      RELIEF_HOVER,
                    )}
                  >
                    <span className="text-xs font-bold text-heading">
                      {channel.label}
                    </span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4 text-primary">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NeutralCommunicationLaunchMobile(props: NeutralLaunchViewProps) {
  const panelCls = cn("min-h-[13rem] w-full max-h-[70vh] overflow-y-auto pr-1", props.leaving ? "kredo-quoi-panel-out" : "kredo-quoi-panel-in")
  return (
    <div className="flex flex-col items-center w-full">
      {props.step === "category" ? (
        <div key="category-step" className={cn(panelCls, "grid grid-cols-2 gap-3")}>
          {FAMILIES.map((family, index) => (
            <CategoryCard
              key={family.value}
              value={family.value}
              label={family.label}
              dataviz={family.dataviz}
              isSelected={family.value === props.activeCategory}
              onClick={() => props.handleCategorySelect(family.value)}
              style={{ animationDelay: props.leaving ? "0ms" : `${index * 45}ms` }}
              className={props.leaving ? "kredo-offer-card-out" : "kredo-offer-card-in"}
            />
          ))}
        </div>
      ) : props.step === "scenarios" ? (
        <div key="scenarios-step" className={cn(panelCls, "flex flex-col gap-2")}>
          {props.scenariosList.map((scenario, index) => (
            <ScenarioCard
              key={scenario.value}
              label={scenario.label}
              description={scenario.description}
              isSelected={scenario.value === props.selectedScenario}
              onClick={() => props.handleScenarioSelect(scenario.value)}
              style={{ animationDelay: props.leaving ? "0ms" : `${index * 42}ms` }}
              className={cn(
                props.leaving ? "kredo-offer-card-out" : "kredo-offer-card-in",
                "min-h-[48px]"
              )}
            />
          ))}
        </div>
      ) : props.step === "objective" ? (
        <div key="objective-step" className={cn(panelCls, "mx-auto flex max-w-md flex-col gap-2")}>
          <p className="mb-1 text-center text-[11px] leading-relaxed text-muted">
            Quel est le but recherché ?
          </p>
          {props.objectiveOptions.map((objective, index) => (
            <ObjectiveCard
              key={objective.value}
              label={objective.label}
              suggested={objective.suggested}
              isSelected={objective.value === props.selectedObjective}
              onClick={() => props.handleObjectiveSelect(objective.value)}
              style={{ animationDelay: props.leaving ? "0ms" : `${index * 40}ms` }}
              className={cn(
                props.leaving ? "kredo-offer-card-out" : "kredo-offer-card-in",
                "min-h-[48px]"
              )}
            />
          ))}
        </div>
      ) : (
        <div key="format-step" className={cn(panelCls, "flex flex-col items-center justify-center w-full")}>
          {!props.selectedOutputKind ? (
            <div className="flex flex-col gap-3 w-full">
              {PRINCIPAL_FORMATS.map((format) => {
                const allowed = props.allowedOutputKinds.includes(format.value)
                return (
                  <button
                    key={format.value}
                    type="button"
                    disabled={!allowed}
                    onClick={() => props.handleSelectOutputKind(format.value)}
                    className={cn(
                      "flex items-center gap-4 border rounded-xl p-3 w-full min-h-[48px] text-left transition-all duration-200 cursor-pointer",
                      allowed
                        ? "border-border/30 bg-surface/10 hover:border-primary/50 hover:bg-surface/20"
                        : "border-border/10 bg-surface/5 opacity-40 cursor-not-allowed",
                      RELIEF_HOVER,
                    )}
                  >
                    <span className="relative flex size-9 items-center justify-center shrink-0">
                      <Image
                        src={format.image}
                        alt=""
                        width={36}
                        height={36}
                        className="h-9 w-9 object-contain"
                      />
                    </span>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-heading">
                        {format.label}
                      </div>
                      {!allowed && (
                        <div className="text-[9px] text-danger/80 mt-0.5">
                          Non disponible pour ce scénario.
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="w-full flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-200">
              {/* Selected Principal Format (Compact representation) */}
              <div className="flex items-center justify-between border border-primary/20 bg-primary/[0.04] rounded-xl px-3 py-2.5 w-full min-h-[48px]">
                <div className="flex items-center gap-3">
                  <Image
                    src={PRINCIPAL_FORMATS.find((f) => f.value === props.selectedOutputKind)?.image || ""}
                    alt=""
                    width={24}
                    height={24}
                    className="size-6 object-contain"
                  />
                  <span className="text-xs font-bold text-heading">
                    {PRINCIPAL_FORMATS.find((f) => f.value === props.selectedOutputKind)?.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    props.setSelectedOutputKind(null)
                    props.setSelectedChannel(null)
                  }}
                  className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Modifier
                </button>
              </div>

              {/* Secondary Formats / Channels list */}
              <div className="flex flex-col gap-2 w-full animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-[11px] text-muted text-center mb-1">
                  Sélectionnez un format secondaire pour finaliser
                </p>
                {props.secondaryChannelOptions.map((channel) => (
                  <button
                    key={channel.value}
                    type="button"
                    onClick={() => props.handleSelectChannel(channel.value)}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-canvas/50 hover:bg-canvas px-4 py-3.5 text-left w-full cursor-pointer min-h-[48px]",
                      RELIEF_HOVER,
                    )}
                  >
                    <span className="text-xs font-bold text-heading">
                      {channel.label}
                    </span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4 text-primary">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

"use client"

import type { CSSProperties } from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { cn } from "@/lib/utils"
import { mapDbStatusToStaffingStage, type StaffingStageKey } from "@/lib/staffing/stages"
import type { StaffingDrawerViewModel } from "@/types/staffing-drawer"
import type { Json } from "@/types/database"

interface StaffingTimelineEvent {
  id: string
  title: string
  event_type: string
  status: string
  starts_at: string
  description: string | null
}

interface StaffingProcessStepperProps {
  data: StaffingDrawerViewModel
  events: StaffingTimelineEvent[]
}

type StaffingResult = "en_attente" | "valide" | "refuse"

interface StaffingMilestone {
  step: StaffingStageKey
  result: StaffingResult
  scheduled_at: string | null
  completed_at: string | null
  notes: string | null
}

const STAFFING_STEPS: { key: StaffingStageKey; label: string }[] = [
  { key: "identifie", label: "Identification" },
  { key: "prequal", label: "Préqualification" },
  { key: "cv_envoye", label: "CV envoyé" },
  { key: "entretien_client", label: "Entretien client" },
  { key: "issue", label: "Issue" },
]

const STEP_COLORS: Record<StaffingStageKey, string> = {
  identifie: "#FF5A36",
  prequal: "#A855F7",
  cv_envoye: "#F59E0B",
  entretien_client: "#2563EB",
  issue: "#10B981",
}

const LOST_COLOR = "#F97316"

function formatShortDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

function matchesAny(text: string, values: readonly string[]) {
  return values.some((value) => text.includes(value))
}

function findEvent(
  events: StaffingTimelineEvent[],
  predicate: (event: StaffingTimelineEvent, text: string) => boolean,
) {
  return [...events]
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .find((event) => predicate(event, normalize(`${event.title} ${event.description ?? ""}`))) ?? null
}

function extractLogoPath(metadata: Json | null | undefined) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null
  const record = metadata as Record<string, unknown>
  return typeof record.logo_path === "string" ? record.logo_path : null
}

function getEngagementLabel(data: StaffingDrawerViewModel) {
  if (data.opportunity.requires_staffing || data.opportunity.opportunity_type === "staffing") {
    return "Staffing"
  }
  return "Projet"
}

function getIssueResult(status: string): StaffingResult {
  if (status === "refuse_client" || status === "refuse_candidat" || status === "abandonne") {
    return "refuse"
  }
  if (status === "retenu" || status === "gagne") {
    return "valide"
  }
  return "en_attente"
}

function getIssueLabel(status: string) {
  switch (status) {
    case "retenu":
    case "gagne":
      return "Issue positive"
    case "refuse_client":
      return "Refus client"
    case "refuse_candidat":
      return "Refus candidat"
    case "abandonne":
      return "Abandonné"
    default:
      return "Issue"
  }
}

function getIssueNote(data: StaffingDrawerViewModel) {
  if (data.status === "retenu" || data.status === "gagne") {
    const startLabel = formatShortDate(data.opportunity.start_date)
    return startLabel
      ? `Positionnement validé. Démarrage prévu le ${startLabel}.`
      : "Positionnement validé côté client."
  }
  if (data.status === "refuse_client") return data.next_action ?? "Le client n'a pas retenu le profil."
  if (data.status === "refuse_candidat") return data.next_action ?? "Le candidat a décliné la proposition."
  if (data.status === "abandonne") return data.next_action ?? "Le positionnement a été interrompu."
  return data.next_action ?? "Décision finale en attente."
}

function buildMilestones(data: StaffingDrawerViewModel, events: StaffingTimelineEvent[]) {
  const activeStageKey = mapDbStatusToStaffingStage(data.status)
  const activeStepIndex = STAFFING_STEPS.findIndex((step) => step.key === activeStageKey)

  const prequalEvent = findEvent(
    events,
    (event, text) =>
      event.event_type === "entretien_candidat" &&
      matchesAny(text, ["qualif", "prequal", "fit", "culturel", "sourcing", "appel"]),
  )
  const clientEvent = findEvent(
    events,
    (event, text) => event.event_type === "entretien_client" || text.includes("client"),
  )

  const milestones = new Map<StaffingStageKey, StaffingMilestone>()

  milestones.set("identifie", {
    step: "identifie",
    result: "valide",
    scheduled_at: data.created_at,
    completed_at: data.created_at,
    notes: data.comment ?? `Profil positionné sur le besoin ${data.opportunity.title}.`,
  })

  milestones.set("prequal", {
    step: "prequal",
    result: activeStepIndex > 1 || Boolean(prequalEvent?.starts_at) ? "valide" : activeStepIndex === 1 ? "en_attente" : "en_attente",
    scheduled_at: prequalEvent?.starts_at ?? data.proposed_at,
    completed_at: activeStepIndex > 1 ? prequalEvent?.starts_at ?? data.proposed_at ?? null : null,
    notes: prequalEvent?.description ?? "Qualification initiale et arbitrage du positionnement.",
  })

  milestones.set("cv_envoye", {
    step: "cv_envoye",
    result: data.sent_to_client_at ? "valide" : activeStepIndex === 2 ? "en_attente" : "en_attente",
    scheduled_at: data.sent_to_client_at ?? data.proposed_at,
    completed_at: data.sent_to_client_at,
    notes: data.sent_to_client_at
      ? "CV et éléments de synthèse transmis au client."
      : data.next_action ?? "Préparation de l'envoi client.",
  })

  milestones.set("entretien_client", {
    step: "entretien_client",
    result:
      data.status === "entretien_realise" || activeStepIndex > 3
        ? "valide"
        : data.status === "entretien_planifie"
          ? "en_attente"
          : "en_attente",
    scheduled_at: clientEvent?.starts_at ?? null,
    completed_at:
      data.status === "entretien_realise" || activeStepIndex > 3
        ? clientEvent?.starts_at ?? data.status_changed_at ?? null
        : null,
    notes: clientEvent?.description ?? data.next_action ?? "Entretien client à cadrer.",
  })

  milestones.set("issue", {
    step: "issue",
    result: getIssueResult(data.status),
    scheduled_at: data.opportunity.start_date,
    completed_at: getIssueResult(data.status) === "en_attente" ? null : data.status_changed_at ?? data.updated_at,
    notes: getIssueNote(data),
  })

  return {
    activeStageKey,
    milestones,
  }
}

export function StaffingProcessStepper({ data, events }: StaffingProcessStepperProps) {
  const { activeStageKey, milestones } = buildMilestones(data, events)
  const currentStepIdx = STAFFING_STEPS.findIndex((step) => step.key === activeStageKey)
  const clientLogoPath = extractLogoPath(data.opportunity.company?.metadata)
  const clientName = data.opportunity.company?.name ?? "Client"
  const issueLabel = getIssueLabel(data.status)

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border px-3 py-2.5"
        style={{ background: "var(--color-canvas)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
              Positionnement
            </p>
            <p className="text-sm font-semibold" style={{ color: "var(--color-heading)" }}>
              {data.opportunity.title}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px]" style={{ color: "var(--color-muted)" }}>
              <span>{getEngagementLabel(data)}</span>
              <span>
                {data.opportunity.start_date
                  ? `Démarrage : ${formatShortDate(data.opportunity.start_date)}`
                  : "Démarrage à confirmer"}
              </span>
            </div>
          </div>

          <div className="flex w-20 shrink-0 flex-col items-center gap-1 text-center">
            <CompanyLogo
              name={clientName}
              logoPath={clientLogoPath}
              website={data.opportunity.company?.website}
              size="lg"
            />
            <span className="text-[10px] font-semibold leading-tight text-heading">
              {clientName}
            </span>
          </div>
        </div>
      </div>

      <div className="relative pl-4">
        {STAFFING_STEPS.map((step, idx) => {
          const milestone = milestones.get(step.key)
          const isCurrent = idx === currentStepIdx && milestone?.result !== "valide" && milestone?.result !== "refuse"
          const isPast = milestone?.result === "valide"
          const isFailed = milestone?.result === "refuse"
          const isFuture = !milestone || milestone.result === "en_attente"
          const isLast = idx === STAFFING_STEPS.length - 1
          const accentColor = isFailed ? LOST_COLOR : STEP_COLORS[step.key]
          const label = step.key === "issue" ? issueLabel : step.label

          return (
            <div key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
              {!isLast ? (
                <div
                  className="absolute left-[7px] top-[20px] w-0.5"
                  style={{
                    height: "calc(100% - 12px)",
                    background: isPast || isFailed ? accentColor : "var(--color-border)",
                  }}
                />
              ) : null}

              <div
                className={cn(
                  "relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 text-[8px] font-bold",
                  isCurrent && "ring-2 ring-offset-1",
                )}
                style={{
                  borderColor: isPast || isFailed || isCurrent ? accentColor : "var(--color-border)",
                  background: isPast || isFailed ? accentColor : "var(--color-surface)",
                  color: isPast || isFailed ? "white" : accentColor,
                  ...(isCurrent
                    ? {
                        "--tw-ring-color": `${accentColor}`,
                        "--tw-ring-offset-color": "var(--color-surface)",
                      } as CSSProperties
                    : {}),
                }}
              >
                {isPast && "✓"}
                {isFailed && "✕"}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold"
                    style={{
                      color: isCurrent
                        ? accentColor
                        : isFuture && !isCurrent
                          ? "var(--color-muted)"
                          : "var(--color-heading)",
                    }}
                  >
                    {label}
                  </span>
                  {isCurrent ? (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white"
                      style={{ background: accentColor }}
                    >
                      En cours
                    </span>
                  ) : null}
                </div>

                {milestone ? (
                  <div className="mt-1 space-y-0.5">
                    <div className="flex gap-3 text-[10px]" style={{ color: "var(--color-muted)" }}>
                      {milestone.scheduled_at ? <span>Prévu : {formatShortDate(milestone.scheduled_at)}</span> : null}
                      {milestone.completed_at ? (
                        <span style={{ color: accentColor }}>
                          Réalisé : {formatShortDate(milestone.completed_at)}
                        </span>
                      ) : null}
                    </div>
                    {milestone.notes ? (
                      <p className="text-[10px] leading-relaxed" style={{ color: "var(--color-body)" }}>
                        {milestone.notes}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

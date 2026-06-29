"use client"

import type { CSSProperties } from "react"
import { TimelineRecordDisclosure } from "@/components/staffing/TimelineRecordDisclosure"
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

function formatShortDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
}

function matchesAny(text: string, values: readonly string[]) {
  return values.some((value) => text.includes(value))
}

function findEvent(
  events: StaffingTimelineEvent[],
  predicate: (event: StaffingTimelineEvent, text: string) => boolean,
) {
  return (
    [...events]
      .sort(
        (left, right) =>
          new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime(),
      )
      .find((event) =>
        predicate(event, normalize(`${event.title} ${event.description ?? ""}`)),
      ) ?? null
  )
}

function extractLogoPath(metadata: Json | null | undefined) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null
  }
  const record = metadata as Record<string, unknown>
  return typeof record.logo_path === "string" ? record.logo_path : null
}

function getIssueResult(status: string): StaffingResult {
  if (["refuse_client", "refuse_candidat", "abandonne"].includes(status)) {
    return "refuse"
  }
  if (["retenu", "gagne"].includes(status)) return "valide"
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
  if (data.status === "refuse_client") {
    return data.next_action ?? "Le client n'a pas retenu le profil."
  }
  if (data.status === "refuse_candidat") {
    return data.next_action ?? "Le candidat a décliné la proposition."
  }
  if (data.status === "abandonne") {
    return data.next_action ?? "Le positionnement a été interrompu."
  }
  return data.next_action ?? "Décision finale en attente."
}

function buildMilestones(
  data: StaffingDrawerViewModel,
  events: StaffingTimelineEvent[],
) {
  const activeStageKey = mapDbStatusToStaffingStage(data.status)
  const activeStepIndex = STAFFING_STEPS.findIndex(
    (step) => step.key === activeStageKey,
  )

  const prequalEvent = findEvent(
    events,
    (event, text) =>
      event.event_type === "entretien_candidat" &&
      matchesAny(text, ["qualif", "prequal", "fit", "culturel", "sourcing", "appel"]),
  )
  const clientEvent = findEvent(
    events,
    (event, text) =>
      event.event_type === "entretien_client" || text.includes("client"),
  )

  const milestones = new Map<StaffingStageKey, StaffingMilestone>()

  milestones.set("identifie", {
    step: "identifie",
    result: "valide",
    scheduled_at: data.created_at,
    completed_at: data.created_at,
    notes:
      data.comment ??
      `Profil positionné sur le besoin ${data.opportunity.title}.`,
  })

  milestones.set("prequal", {
    step: "prequal",
    result:
      activeStepIndex > 1 || Boolean(prequalEvent?.starts_at)
        ? "valide"
        : "en_attente",
    scheduled_at: prequalEvent?.starts_at ?? data.proposed_at,
    completed_at:
      activeStepIndex > 1
        ? prequalEvent?.starts_at ?? data.proposed_at ?? null
        : null,
    notes:
      prequalEvent?.description ??
      "Qualification initiale et arbitrage du positionnement.",
  })

  milestones.set("cv_envoye", {
    step: "cv_envoye",
    result: data.sent_to_client_at ? "valide" : "en_attente",
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
        : "en_attente",
    scheduled_at: clientEvent?.starts_at ?? null,
    completed_at:
      data.status === "entretien_realise" || activeStepIndex > 3
        ? clientEvent?.starts_at ?? data.status_changed_at ?? null
        : null,
    notes:
      clientEvent?.description ??
      data.next_action ??
      "Entretien client à cadrer.",
  })

  milestones.set("issue", {
    step: "issue",
    result: getIssueResult(data.status),
    scheduled_at: data.opportunity.start_date,
    completed_at:
      getIssueResult(data.status) === "en_attente"
        ? null
        : data.status_changed_at ?? data.updated_at,
    notes: getIssueNote(data),
  })

  return { activeStageKey, milestones }
}

function ClientLogoFill({
  name,
  logoPath,
  website,
}: {
  name: string
  logoPath: string | null
  website: string | null | undefined
}) {
  const faviconUrl = website
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
        website.replace(/^https?:\/\//, ""),
      )}&sz=64`
    : null

  return (
    <div
      className="flex shrink-0 self-stretch items-center justify-center overflow-hidden rounded-lg border"
      style={{
        width: 52,
        borderColor: "var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      {logoPath ? (
        <img
          src={logoPath}
          alt={`Logo ${name}`}
          className="h-full w-full object-contain p-1.5"
        />
      ) : faviconUrl ? (
        <img
          src={faviconUrl}
          alt={`Logo ${name}`}
          className="h-7 w-7 object-contain"
        />
      ) : (
        <span
          className="text-xs font-bold"
          style={{ color: "var(--color-primary)" }}
        >
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  )
}

export function StaffingProcessStepper({
  data,
  events,
}: StaffingProcessStepperProps) {
  const { activeStageKey, milestones } = buildMilestones(data, events)
  const currentStepIdx = STAFFING_STEPS.findIndex(
    (step) => step.key === activeStageKey,
  )
  const clientLogoPath = extractLogoPath(data.opportunity.company?.metadata)
  const clientName = data.opportunity.company?.name ?? "Client"
  const issueLabel = getIssueLabel(data.status)
  const shineHeight = (currentStepIdx + 1) * 76

  return (
    <>
      <style>{`
        @keyframes kredo-staffing-shine {
          0%   { transform: translateY(-100%); opacity: 0; }
          4%   { opacity: 1; }
          16%  { opacity: 0.7; }
          22%  { transform: translateY(220%); opacity: 0; }
          100% { transform: translateY(220%); opacity: 0; }
        }
        .kredo-staffing-shine-beam {
          position: absolute;
          left: -30%;
          right: -30%;
          height: 55%;
          will-change: transform;
          background: linear-gradient(
            162deg,
            transparent 0%,
            rgba(37, 84, 184, 0.04) 35%,
            rgba(255, 255, 255, 0.24) 50%,
            rgba(37, 84, 184, 0.04) 65%,
            transparent 100%
          );
          animation: kredo-staffing-shine 5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          animation-delay: 0.8s;
          pointer-events: none;
        }
      `}</style>

      <div className="space-y-4">
        <div
          className="rounded-xl border px-3 py-2.5"
          style={{
            background: "var(--color-canvas)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex items-stretch justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className="mb-0.5 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "var(--color-muted)" }}
              >
                Positionnement
              </p>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--color-heading)" }}
              >
                {data.opportunity.title}
              </p>
              <p
                className="mt-1 text-xs font-medium"
                style={{ color: "var(--color-body)" }}
              >
                {clientName}
              </p>
            </div>

            <ClientLogoFill
              name={clientName}
              logoPath={clientLogoPath}
              website={data.opportunity.company?.website}
            />
          </div>
        </div>

        <div className="relative pl-4">
          {currentStepIdx >= 0 && (
            <div
              className="pointer-events-none absolute left-0 right-0 overflow-hidden"
              style={{ top: 0, height: shineHeight, zIndex: 10 }}
            >
              <div className="kredo-staffing-shine-beam" />
            </div>
          )}

          {STAFFING_STEPS.map((step, index) => {
            const milestone = milestones.get(step.key)
            const isCurrent =
              index === currentStepIdx &&
              milestone?.result !== "valide" &&
              milestone?.result !== "refuse"
            const isPast = milestone?.result === "valide"
            const isFailed = milestone?.result === "refuse"
            const isFuture = !isCurrent && !isPast && !isFailed
            const isLast = index === STAFFING_STEPS.length - 1
            const label = step.key === "issue" ? issueLabel : step.label

            return (
              <div
                key={step.key}
                className="relative flex gap-3 pb-4 last:pb-0"
              >
                {!isLast && (
                  <div
                    className="absolute left-[7px] top-[20px] w-0.5"
                    style={{
                      height: "calc(100% - 12px)",
                      background: isPast
                        ? "var(--color-primary)"
                        : "var(--color-border)",
                    }}
                  />
                )}

                <div
                  className={cn(
                    "relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 text-[8px] font-bold",
                    isCurrent && "ring-2 ring-offset-1",
                  )}
                  style={{
                    borderColor: "var(--color-primary)",
                    background:
                      isPast || isFailed
                        ? "var(--color-primary)"
                        : "var(--color-surface)",
                    color:
                      isPast || isFailed ? "white" : "var(--color-primary)",
                    ...(isCurrent
                      ? ({
                          "--tw-ring-color": "var(--color-primary)",
                          "--tw-ring-offset-color": "var(--color-surface)",
                        } as CSSProperties)
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
                        color: isFuture
                          ? "var(--color-muted)"
                          : "var(--color-primary)",
                      }}
                    >
                      {label}
                    </span>
                    {isCurrent && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white"
                        style={{ background: "var(--color-primary)" }}
                      >
                        En cours
                      </span>
                    )}
                  </div>

                  {milestone && (
                    <div className="mt-1 space-y-0.5">
                      <div
                        className="flex gap-3 text-[10px]"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {milestone.scheduled_at && (
                          <span>
                            Prévu : {formatShortDate(milestone.scheduled_at)}
                          </span>
                        )}
                        {milestone.completed_at && (
                          <span style={{ color: "var(--color-primary)" }}>
                            Réalisé : {formatShortDate(milestone.completed_at)}
                          </span>
                        )}
                      </div>
                      <TimelineRecordDisclosure notes={milestone.notes} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

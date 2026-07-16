"use client"

import { useState, useEffect, useRef, useTransition, useMemo, type KeyboardEvent, type PointerEvent } from "react"
import dynamic from "next/dynamic"
import { curveCatmullRom, line } from "d3-shape"
import { Select } from "@/components/ui/Select"
import { useCrmDrawer } from "@/hooks/use-crm-drawer"
import { getContactsByCompany } from "@/lib/agenda/agenda-actions"
import type { AgendaSelectContact } from "@/lib/agenda/agenda-types"
import { saveOpportunityClientContacts } from "@/app/(app)/missions/_actions/opportunity-contacts"
import {
  OPPORTUNITY_ACTIVE_STAGES,
  getOpportunityPipelineIndex,
} from "@/lib/opportunities/stages"
import { useEventDrawerStore } from "@/hooks/use-event-drawer-store"
import type { AssistanceCaseEvent, AssistanceCaseOpportunity } from "@/types/assistance-case"
import type { Json } from "@/types/database"
import type { ContactRole } from "@/types/database-domain"

const MatchingDialog = dynamic(
  () => import("@/components/staffing/matching/MatchingDialog").then((m) => m.MatchingDialog),
  { ssr: false },
)

interface OpportunityNeedTabProps {
  opportunity: AssistanceCaseOpportunity
  events?: AssistanceCaseEvent[]
  onCreateEvent?: () => void
  onContactsSaved?: () => void
  isMobile?: boolean
  onStaffed?: () => void
}

const IMPORTANCE_LABELS: Record<string, string> = {
  indispensable: "Indispensable",
  souhaitee: "Souhaitée",
  bonus: "Bonus",
}

const CLIENT_CONTACT_ROLE_OPTIONS: Array<{ value: ContactRole; label: string }> = [
  { value: "manager_operationnel", label: "Manager opérationnel" },
  { value: "contact_technique", label: "Contact technique" },
  { value: "decideur", label: "Décisionnaire" },
  { value: "sponsor", label: "Sponsor" },
  { value: "acheteur", label: "Acheteur" },
  { value: "rh", label: "RH" },
  { value: "validateur_final", label: "Validateur final" },
]

const CLIENT_CONTACT_ROLE_LABELS = Object.fromEntries(
  CLIENT_CONTACT_ROLE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ContactRole, string>

// ── Timeline D3 constants ────────────────────────────────────────────────────

const TIMELINE_LEFT_EDGE = 0.08
const TIMELINE_RIGHT_EDGE = 0.92
const TIMELINE_SVG_WIDTH = 1000
const TIMELINE_BASELINE_Y = 42
const TIMELINE_CIRCLE_HIT_SIZE = 46

type TimelineHoverState = {
  cluster: "left" | "right" | null
  strength: number
}

type TimelineStageLayout = {
  index: number
  x: number
  y: number
  size: number
  opacity: number
  zIndex: number
  tone: "current" | "next" | "adjacent" | "focused" | "compressed"
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

function exponentialSpread(distance: number, maxDistance: number, tension: number) {
  if (distance <= 0 || maxDistance <= 0) return 0
  const numerator = 1 - Math.exp(-tension * distance)
  const denominator = 1 - Math.exp(-tension * maxDistance)
  if (Math.abs(denominator) < Number.EPSILON) return distance / maxDistance
  return numerator / denominator
}

function buildTimelineLayouts(
  currentIndex: number,
  focusedIndex: number,
  hoverState: TimelineHoverState,
): TimelineStageLayout[] {
  const totalStages = OPPORTUNITY_ACTIVE_STAGES.length
  const boundedCurrentIndex = clamp(currentIndex, 0, Math.max(totalStages - 1, 0))
  const boundedFocusedIndex = clamp(focusedIndex, 0, Math.max(totalStages - 1, 0))
  const processRatio = totalStages > 1 ? boundedCurrentIndex / (totalStages - 1) : 0.5
  const currentX = mix(0.4, 0.6, processRatio)
  const leftSpan = currentX - TIMELINE_LEFT_EDGE
  const rightSpan = TIMELINE_RIGHT_EDGE - currentX
  const maxPastDistance = boundedCurrentIndex
  const maxFutureDistance = totalStages - 1 - boundedCurrentIndex
  const leftTension =
    hoverState.cluster === "left" ? mix(2.1, 1.1, hoverState.strength) : 2.1
  const rightTension =
    hoverState.cluster === "right" ? mix(1.85, 0.95, hoverState.strength) : 1.85

  // Compression is distance-driven, then the clicked stage gets a small pull toward
  // the readable shoulder nearest the current step.
  return OPPORTUNITY_ACTIVE_STAGES.map((_, index) => {
    const offset = index - boundedCurrentIndex
    const distance = Math.abs(offset)
    const side = offset < 0 ? "left" : offset > 0 ? "right" : "center"
    const isCurrent = index === boundedCurrentIndex
    const isNext = index === boundedCurrentIndex + 1
    const isPrevious = index === boundedCurrentIndex - 1
    const isFocused = index === boundedFocusedIndex
    const isCompressed = distance >= 2

    let x = currentX
    if (offset < 0) {
      x =
        currentX -
        leftSpan * exponentialSpread(distance, Math.max(maxPastDistance, 1), leftTension)
    } else if (offset > 0) {
      x =
        currentX +
        rightSpan * exponentialSpread(distance, Math.max(maxFutureDistance, 1), rightTension)
    }

    if (isFocused && !isCurrent) {
      x += offset < 0 ? 0.04 : -0.04
    }

    x = clamp(x, TIMELINE_LEFT_EDGE, TIMELINE_RIGHT_EDGE)

    let y = TIMELINE_BASELINE_Y
    if (isCurrent) {
      y = 28
    } else if (isNext) {
      y = 34
    } else if (isPrevious) {
      y = 36
    } else if (isFocused) {
      y = 34
    } else if (side !== "center") {
      const clusterLift =
        hoverState.cluster === side ? 4 + hoverState.strength * 3 : 0
      y = 42 + (distance % 2 === 0 ? 6 : 0) - clusterLift
    }

    let size = 20
    if (isCurrent) {
      size = 34
    } else if (isNext) {
      size = 28
    } else if (isPrevious) {
      size = 25
    } else if (isFocused) {
      size = 28
    } else if (distance === 2) {
      size = 22
    }

    return {
      index,
      x,
      y,
      size,
      opacity: isCurrent ? 1 : isNext ? 0.96 : isPrevious ? 0.86 : Math.max(0.48, 0.82 - distance * 0.12),
      zIndex: isCurrent ? 60 : isFocused ? 50 : 40 - distance,
      tone: isCurrent
        ? "current"
        : isNext
          ? "next"
          : isPrevious
            ? "adjacent"
            : isFocused
              ? "focused"
              : isCompressed
                ? "compressed"
                : "adjacent",
    }
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatCurrency(value: number | null) {
  if (value === null) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)
}

function getContextText(context: Json) {
  if (typeof context === "string") return context
  if (!context || typeof context !== "object" || Array.isArray(context)) return null

  const record = context as Record<string, unknown>
  const keys = ["summary", "description", "business_context", "mission", "objectives"]
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function DataItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-normal text-muted">{label}</p>
      <div className="mt-0.5 text-xs font-semibold leading-relaxed text-heading">{value}</div>
    </div>
  )
}

// ── Timeline component (D3 SVG) ──────────────────────────────────────────────

function OpportunityNeedTimeline({ stage }: { stage: string }) {
  const currentIndex = getOpportunityPipelineIndex(stage)
  const safeCurrentIndex = clamp(currentIndex, 0, Math.max(OPPORTUNITY_ACTIVE_STAGES.length - 1, 0))

  const [manualFocusIndex, setManualFocusIndex] = useState<number | null>(null)
  const [hoverState, setHoverState] = useState<TimelineHoverState>({
    cluster: null,
    strength: 0,
  })
  const focusedIndex = manualFocusIndex ?? safeCurrentIndex

  const stageLayouts = useMemo(
    () => buildTimelineLayouts(safeCurrentIndex, focusedIndex, hoverState),
    [focusedIndex, hoverState, safeCurrentIndex],
  )

  const timelinePoints = useMemo(
    () =>
      stageLayouts.map((layout) => ({
        x: mix(72, 928, layout.x),
        y: layout.y,
      })),
    [stageLayouts],
  )

  const progressPoints = useMemo(() => {
    const visibleCurrentIndex = Math.min(safeCurrentIndex, timelinePoints.length - 1)
    const leadingPoint = { x: 48, y: TIMELINE_BASELINE_Y }
    const points = timelinePoints.slice(0, visibleCurrentIndex + 1)
    if (points.length === 0) return [leadingPoint]
    return [leadingPoint, ...points]
  }, [safeCurrentIndex, timelinePoints])

  const forecastPoints = useMemo(() => {
    const currentPoint = timelinePoints[safeCurrentIndex]
    const nextPoint = timelinePoints[safeCurrentIndex + 1]
    if (!currentPoint || !nextPoint) return null
    return [currentPoint, nextPoint]
  }, [safeCurrentIndex, timelinePoints])

  const pathBuilder = useMemo(
    () =>
      line<{ x: number; y: number }>()
        .x((point) => point.x)
        .y((point) => point.y)
        .curve(curveCatmullRom.alpha(0.65)),
    [],
  )

  const fullTrackPath = pathBuilder([
    { x: 48, y: TIMELINE_BASELINE_Y },
    ...timelinePoints,
    { x: 952, y: TIMELINE_BASELINE_Y },
  ]) ?? ""
  const progressTrackPath = pathBuilder(progressPoints) ?? ""
  const forecastTrackPath = forecastPoints ? pathBuilder(forecastPoints) ?? "" : ""

  const focusedStage = OPPORTUNITY_ACTIVE_STAGES[focusedIndex]

  function getStageDescriptor(index: number) {
    if (index === safeCurrentIndex) return "Étape en cours"
    if (index === safeCurrentIndex + 1) return "Étape suivante prioritaire"
    if (index === safeCurrentIndex - 1) return "Étape précédente"
    if (index < safeCurrentIndex) return "Étape passée compressée"
    return "Étape à venir compressée"
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1)

    if (ratio < 0.34) {
      setHoverState({
        cluster: "left",
        strength: clamp((0.34 - ratio) / 0.34, 0, 1),
      })
      return
    }

    if (ratio > 0.66) {
      setHoverState({
        cluster: "right",
        strength: clamp((ratio - 0.66) / 0.34, 0, 1),
      })
      return
    }

    setHoverState({ cluster: null, strength: 0 })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      setManualFocusIndex(Math.max(0, index - 1))
      return
    }

    if (event.key === "ArrowRight") {
      event.preventDefault()
      setManualFocusIndex(Math.min(OPPORTUNITY_ACTIVE_STAGES.length - 1, index + 1))
    }
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--color-case-need-muted)]">
        Progression du besoin
      </p>

      <div
        className="relative w-full rounded-[var(--radius-medium)] px-1 pb-3 pt-1"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverState({ cluster: null, strength: 0 })}
        style={{ touchAction: "pan-y" }}
      >
        <svg
          viewBox={`0 0 ${TIMELINE_SVG_WIDTH} 112`}
          className="block h-[112px] w-full overflow-visible"
          aria-hidden="true"
        >
          <path
            d={fullTrackPath}
            fill="none"
            stroke="color-mix(in srgb, var(--color-case-need) 16%, var(--color-border))"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={progressTrackPath}
            fill="none"
            stroke="var(--color-case-need)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {forecastTrackPath && (
            <path
              d={forecastTrackPath}
              fill="none"
              stroke="var(--color-case-need-border)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4 6"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        <ol className="pointer-events-none absolute inset-x-0 top-0 m-0 h-[112px] list-none p-0">
          {stageLayouts.map((layout) => {
            const step = OPPORTUNITY_ACTIVE_STAGES[layout.index]
            const isCurrent = layout.index === safeCurrentIndex
            const isFocused = layout.index === focusedIndex
            const isCompleted = layout.index < safeCurrentIndex
            const labelVisible =
              isCurrent || isFocused || layout.index === safeCurrentIndex + 1

            return (
              <li
                key={step.value}
                className="absolute top-0"
                style={{
                  left: `${layout.x * 100}%`,
                  top: layout.y,
                  transform: "translate(-50%, -50%)",
                  zIndex: layout.zIndex,
                }}
              >
                <button
                  type="button"
                  className="pointer-events-auto relative flex items-center justify-center rounded-full transition-[transform,opacity,left,top,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(.22,1,.36,1)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-[var(--focus-ring-offset)] focus-visible:ring-offset-[var(--color-bg-surface)]"
                  style={{
                    width: TIMELINE_CIRCLE_HIT_SIZE,
                    height: TIMELINE_CIRCLE_HIT_SIZE,
                    opacity: layout.opacity,
                    transform: isFocused && !isCurrent ? "scale(1.04)" : "scale(1)",
                  }}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-pressed={isFocused}
                  aria-label={`${step.label} — ${getStageDescriptor(layout.index)}`}
                  title={`${step.label} — ${getStageDescriptor(layout.index)}`}
                  onClick={() => setManualFocusIndex(layout.index)}
                  onFocus={() => setManualFocusIndex(layout.index)}
                  onKeyDown={(event) => handleKeyDown(event, layout.index)}
                >
                  <span
                    className="flex items-center justify-center rounded-full border-[1.5px] text-[10px] font-black transition-[transform,background-color,border-color,color,box-shadow] duration-300"
                    style={{
                      width: layout.size,
                      height: layout.size,
                      borderColor:
                        layout.tone === "compressed"
                          ? "color-mix(in srgb, var(--color-case-need) 70%, var(--color-border))"
                          : "var(--color-case-need)",
                      background:
                        isCurrent || isCompleted
                          ? "var(--color-case-need)"
                          : isFocused
                            ? "color-mix(in srgb, var(--color-case-need) 14%, var(--color-surface))"
                            : "var(--color-surface)",
                      color:
                        isCurrent || isCompleted
                          ? "var(--color-case-need-fg)"
                          : "var(--color-case-need)",
                      boxShadow: isCurrent
                        ? "0 0 0 4px color-mix(in srgb, var(--color-case-need) 20%, transparent)"
                        : isFocused
                          ? "0 0 0 3px color-mix(in srgb, var(--color-case-need) 14%, transparent)"
                          : "none",
                    }}
                  >
                    {isCompleted ? "✓" : layout.index + 1}
                  </span>
                </button>

                {labelVisible && (
                  <div
                    className="absolute left-1/2 top-[calc(100%+4px)] w-24 -translate-x-1/2 text-center"
                    style={{ pointerEvents: "none" }}
                  >
                    <p
                      className="text-[9px] font-semibold leading-tight"
                      style={{
                        color: isCurrent
                          ? "var(--color-heading)"
                          : isFocused
                            ? "var(--color-case-need-muted)"
                            : "var(--color-muted)",
                      }}
                    >
                      {step.label}
                    </p>
                    <p
                      className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.08em]"
                      style={{
                        color: isCurrent ? "var(--color-case-need)" : "var(--color-muted)",
                      }}
                    >
                      {getStageDescriptor(layout.index)}
                    </p>
                  </div>
                )}
              </li>
            )
          })}
        </ol>

        <div className="mt-1 flex items-start justify-between gap-3 border-t border-border/60 pt-2">
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--color-case-need-muted)]">
              Étape sélectionnée
            </p>
            <p className="mt-1 truncate text-[11px] font-semibold text-heading">
              {focusedStage?.label ?? "—"}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted">
              Repère
            </p>
            <p className="mt-1 text-[10px] font-semibold text-muted">
              {getStageDescriptor(focusedIndex)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Client Contact Section ───────────────────────────────────────────────────

type DraftClientContact = {
  id: string
  full_name: string
  job_title: string | null
  role: ContactRole | null
}

function buildDraftClientContacts(
  clientContacts: AssistanceCaseOpportunity["client_contacts"],
): DraftClientContact[] {
  return clientContacts.map((contact) => ({
    id: contact.id,
    full_name: contact.full_name,
    job_title: contact.job_title,
    role: (contact.role as ContactRole | null) ?? null,
  }))
}

function ClientContactSection({
  opportunity,
  onContactsSaved,
}: {
  opportunity: AssistanceCaseOpportunity
  onContactsSaved?: () => void
}) {
  const companyId = opportunity.company?.id ?? null
  const [isOpen, setIsOpen] = useState(false)
  const { openContact: openContactDrawer } = useCrmDrawer()
  const [contacts, setContacts] = useState<AgendaSelectContact[]>([])
  const [search, setSearch] = useState("")
  const [isSearchActive, setIsSearchActive] = useState(false)
  const savedContacts = useMemo(
    () => buildDraftClientContacts(opportunity.client_contacts),
    [opportunity.client_contacts],
  )
  const [optimisticSavedContacts, setOptimisticSavedContacts] = useState<{
    opportunityId: string
    contacts: DraftClientContact[]
  } | null>(null)
  const [draftContacts, setDraftContacts] = useState<DraftClientContact[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const modalRef = useRef<HTMLDivElement>(null)
  const comboboxRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const optimisticContactsForOpportunity =
    optimisticSavedContacts?.opportunityId === opportunity.id
      ? optimisticSavedContacts.contacts
      : null
  const displayedContacts =
    optimisticContactsForOpportunity &&
    optimisticContactsForOpportunity.length === savedContacts.length &&
    optimisticContactsForOpportunity.every((contact, index) => (
      contact.id === savedContacts[index]?.id &&
      contact.role === savedContacts[index]?.role &&
      contact.job_title === savedContacts[index]?.job_title &&
      contact.full_name === savedContacts[index]?.full_name
    ))
      ? savedContacts
      : optimisticContactsForOpportunity ?? savedContacts

  useEffect(() => {
    if (!isOpen || !companyId) return
    startTransition(async () => {
      const result = await getContactsByCompany(companyId)
      setContacts(result)
    })
  }, [companyId, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const timeoutId = window.setTimeout(() => searchRef.current?.focus(), 50)
    return () => window.clearTimeout(timeoutId)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (modalRef.current && !modalRef.current.contains(target)) {
        setIsOpen(false)
        setIsSearchActive(false)
        return
      }

      if (comboboxRef.current && !comboboxRef.current.contains(target)) {
        setIsSearchActive(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [isOpen])

  const selectedContactIds = new Set(draftContacts.map((contact) => contact.id))

  const filtered = contacts.filter((c) =>
    !selectedContactIds.has(c.id) && (
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.job_title?.toLowerCase().includes(search.toLowerCase())
    ),
  )

  function handleAddContact(contact: AgendaSelectContact) {
    if (draftContacts.length >= 2) return
    setDraftContacts((current) => [
      ...current,
      {
        id: contact.id,
        full_name: contact.full_name,
        job_title: contact.job_title || null,
        role: null,
      },
    ])
    setSearch("")
    setIsSearchActive(false)
    setErrorMsg(null)
  }

  function handleDraftRoleChange(contactId: string, role: string) {
    setDraftContacts((current) =>
      current.map((contact) =>
        contact.id === contactId
          ? { ...contact, role: role === "" ? null : (role as ContactRole) }
          : contact,
      ),
    )
  }

  function handleRemoveDraftContact(contactId: string) {
    setDraftContacts((current) => current.filter((contact) => contact.id !== contactId))
    setErrorMsg(null)
  }

  function handleSave() {
    setErrorMsg(null)
    startTransition(async () => {
      const result = await saveOpportunityClientContacts({
        opportunity_id: opportunity.id,
        contacts: draftContacts.map((contact) => ({
          contact_id: contact.id,
          role: contact.role,
        })),
      })

      if (result.error) {
        setErrorMsg(result.error)
        return
      }

      setOptimisticSavedContacts({
        opportunityId: opportunity.id,
        contacts: draftContacts,
      })
      onContactsSaved?.()
      setIsOpen(false)
    })
  }

  function openEditor() {
    setDraftContacts(displayedContacts)
    setSearch("")
    setIsSearchActive(false)
    setErrorMsg(null)
    setIsOpen(true)
  }

  function openContactSheet(contactId: string) {
    openContactDrawer(contactId)
  }

  const hasContacts = displayedContacts.length > 0

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          Opérationnel client
        </h3>
        {hasContacts ? (
          <button
            type="button"
            onClick={openEditor}
            className="shrink-0 text-[10px] font-medium text-muted underline-offset-2 hover:text-heading hover:underline focus-visible:outline-none"
          >
            Modifier
          </button>
        ) : null}
      </div>

      {hasContacts ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-1">
          {displayedContacts.map((contact) => (
            <div key={contact.id} className="min-w-0">
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 inline-flex min-h-8 shrink-0 items-center justify-center text-muted"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="size-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19a5 5 0 0 0-10 0" />
                    <circle cx="10" cy="8" r="3.25" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h3m-1.5-1.5v3" />
                  </svg>
                </span>

                <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                  <p className="text-[11px] font-semibold leading-[1.15] text-heading">
                    {contact.full_name}
                  </p>
                  <p className="text-[9px] font-medium leading-[1.1] text-muted">
                    {contact.role
                      ? CLIENT_CONTACT_ROLE_LABELS[contact.role]
                      : "Role sur la mission non renseigne"}
                  </p>
                  <button
                    type="button"
                    onClick={() => openContactSheet(contact.id)}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold leading-none text-primary transition-opacity hover:opacity-80 focus-visible:outline-none"
                  >
                    Fiche contact
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.15}
                      className="size-3"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12h10M13 8l4 4-4 4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={openEditor}
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] transition-opacity hover:opacity-75 focus-visible:outline-none"
          style={{ color: "var(--color-brand-ember)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-3" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
          Ajouter
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "color-mix(in srgb, var(--color-brand-ember) 14%, rgba(22, 18, 15, 0.42))" }}
        >
          <div
            ref={modalRef}
            className="w-full max-w-sm rounded-[var(--radius-large)] border p-5 shadow-xl"
            style={{
              borderColor: "color-mix(in srgb, var(--color-brand-ember) 14%, var(--color-border))",
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--color-brand-ember) 7%, var(--color-surface)) 0%, color-mix(in srgb, #f5efe5 54%, var(--color-surface)) 100%)",
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-heading">Contact opérationnel client</p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-border hover:text-heading focus-visible:outline-none"
                aria-label="Fermer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {errorMsg ? (
              <div className="mb-3 rounded-[var(--radius-medium)] border border-danger/20 bg-danger/8 px-3 py-2 text-[10px] text-danger">
                {errorMsg}
              </div>
            ) : null}

            {draftContacts.length > 0 ? (
              <div className="mb-4 space-y-2">
                {draftContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="rounded-[var(--radius-medium)] border border-border bg-bg px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-heading">
                          {contact.full_name}
                        </p>
                        <p className="truncate text-[10px] text-muted">
                          {contact.job_title?.trim() || "Fonction non renseignée"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDraftContact(contact.id)}
                        className="shrink-0 text-[10px] font-medium text-muted underline-offset-2 hover:text-heading hover:underline focus-visible:outline-none"
                      >
                        Retirer
                      </button>
                    </div>

                    <div className="mt-2">
                      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                        Rôle sur la mission
                      </label>
                      <Select
                        value={contact.role ?? ""}
                        onChange={(e) => handleDraftRoleChange(contact.id, e.target.value)}
                      >
                        <option value="">— Aucun rôle spécifique —</option>
                        {CLIENT_CONTACT_ROLE_OPTIONS.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Contact combobox */}
            {draftContacts.length < 2 ? (
            <div className="mb-5">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                Ajouter un contact du compte
              </label>
              <div ref={comboboxRef} className="relative">
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onFocus={() => setIsSearchActive(true)}
                  onClick={() => setIsSearchActive(true)}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setIsSearchActive(true)
                  }}
                  placeholder={isPending ? "Chargement…" : "Rechercher un contact…"}
                  className="w-full rounded-[var(--radius-medium)] border border-border bg-[color-mix(in_srgb,var(--color-bg)_72%,white)] px-3 py-2 text-xs text-heading placeholder:text-muted focus:border-[var(--color-brand-ember)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-brand-ember)_20%,transparent)]"
                />
                {isSearchActive && filtered.length > 0 ? (
                  <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-[var(--radius-medium)] border border-border bg-surface shadow-lg">
                    {filtered.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-xs hover:bg-border focus-visible:outline-none"
                          onClick={() => {
                            handleAddContact(c)
                          }}
                        >
                          <span className="font-semibold text-heading">{c.full_name}</span>
                          {c.job_title && (
                            <span className="ml-1.5 text-muted">{c.job_title}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {isSearchActive && !isPending && filtered.length === 0 && search ? (
                  <div className="absolute z-10 mt-1 w-full rounded-[var(--radius-medium)] border border-border bg-surface px-3 py-2 text-xs text-muted shadow-lg">
                    Aucun contact trouvé pour « {search} »
                  </div>
                ) : null}
              </div>
            </div>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-[var(--radius-medium)] px-3 py-1.5 text-xs font-medium text-muted hover:text-heading focus-visible:outline-none"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="rounded-[var(--radius-medium)] px-4 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                style={{ background: "var(--color-brand-ember)" }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────

export function OpportunityNeedTab({
  opportunity,
  events = [],
  onCreateEvent,
  onContactsSaved,
  isMobile = false,
  onStaffed,
}: OpportunityNeedTabProps) {
  const contextText = opportunity.need_summary ?? getContextText(opportunity.context)
  const openEventDrawer = useEventDrawerStore((state) => state.openEventDrawer)
  const [matchingOpen, setMatchingOpen] = useState(false)
  
  // A calendar event is scheduled if events array has at least one item
  const hasEvent = events.length > 0
  const firstEventId = events[0]?.id

  return (
    <div className="space-y-4">
      {/* ── Next step (sans cadre, avec accent ambre) ── */}
      <section className="flex gap-3">
        <div
          className="w-1 shrink-0 rounded-full"
          style={{ background: "var(--color-brand-ember)" }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p
              className="text-[9px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "var(--color-brand-ember)" }}
            >
              Next step
            </p>
            {hasEvent ? (
              <button
                type="button"
                onClick={() => firstEventId && openEventDrawer(firstEventId)}
                aria-label="Ouvrir l’événement"
                className="inline-flex shrink-0 items-center justify-center text-[10px] transition-opacity hover:opacity-75 focus-visible:outline-none"
                style={{ color: "var(--color-brand-ember)" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="size-3.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M9 7h8v8" />
                </svg>
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold leading-snug text-heading">
            {opportunity.next_action_label ?? "Qualifier la prochaine action sur le besoin"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {opportunity.next_action_at
              ? `Échéance ${formatDate(opportunity.next_action_at)}`
              : "Aucune échéance renseignée"}
          </p>
          
          {!hasEvent ? (
            <button
              type="button"
              onClick={onCreateEvent}
              className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] transition-opacity hover:opacity-75 focus-visible:outline-none"
              style={{ color: "var(--color-brand-ember)" }}
            >
              Créer événement
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="size-3" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
          ) : null}
        </div>
      </section>

      {/* ── Timeline D3 SVG ── */}
      <OpportunityNeedTimeline stage={opportunity.stage} />

      {/* ── Contexte et mission (pleine largeur) ── */}
      <section>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          Contexte et mission
        </h3>
        <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-heading font-bold">
          {contextText ?? "Le contexte détaillé du besoin reste à compléter."}
        </p>
      </section>

      {/* ── Opérationnel client (pleine largeur, avec mini modale) ── */}
      <ClientContactSection opportunity={opportunity} onContactsSaved={onContactsSaved} />

      {/* ── Cadre du besoin (flat, 3 cols) ── */}
      <section>
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          Cadre du besoin
        </h3>
        <div className="grid grid-cols-3 gap-x-4 gap-y-4">
          <DataItem label="practice" value={opportunity.practice ?? "—"} />
          <DataItem label="séniorité" value={opportunity.seniority ?? "—"} />
          <DataItem label="localisation" value={opportunity.location ?? "—"} />
          <DataItem label="télétravail" value={opportunity.remote_policy ?? "—"} />
          <DataItem label="démarrage" value={formatDate(opportunity.start_date)} />
          <DataItem
            label="durée"
            value={opportunity.duration_days ? `${opportunity.duration_days} jours` : "—"}
          />
          <DataItem
            label="tjm cible"
            value={
              opportunity.target_daily_rate
                ? `${Math.round(opportunity.target_daily_rate)} € / j`
                : "—"
            }
          />
          <DataItem
            label="marge cible"
            value={
              opportunity.target_margin_pct !== null
                ? `${opportunity.target_margin_pct} %`
                : "—"
            }
          />
          <DataItem label="valeur estimée" value={formatCurrency(opportunity.acv ?? opportunity.estimated_gain)} />
        </div>
      </section>

      {/* ── Compétences recherchées ── */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Compétences recherchées
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold text-muted">
              {opportunity.opportunity_skills.length} critères
            </span>
            <button
              type="button"
              onClick={() => setMatchingOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-primary-fg transition-opacity hover:opacity-90 focus-visible:outline-none"
            >
              Trouver des profils
            </button>
          </div>
        </div>

        {opportunity.opportunity_skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {opportunity.opportunity_skills
              .slice()
              .sort((left, right) => right.weight - left.weight)
              .map((requirement) => {
                const detail = requirement.min_years !== null
                  ? `${requirement.min_years} an${requirement.min_years > 1 ? "s" : ""}`
                  : null

                const importanceColor =
                  requirement.importance === "indispensable"
                    ? "var(--color-danger)"
                    : requirement.importance === "souhaitee"
                      ? "var(--color-brand-primary)"
                      : "var(--color-muted)"

                return (
                  <div
                    key={requirement.id}
                    className="inline-flex items-baseline gap-1.5 rounded-[var(--radius-medium)] border border-border/80 bg-muted/20 px-3 py-1.5"
                    title={requirement.comment ?? undefined}
                  >
                    <span className="text-[11px] font-semibold text-heading">
                      {requirement.skill.name}
                    </span>
                    {detail && (
                      <span className="text-[10px] font-medium text-muted">{detail}</span>
                    )}
                    <span
                      className="text-[8px] font-bold uppercase tracking-[0.1em]"
                      style={{ color: importanceColor }}
                    >
                      {IMPORTANCE_LABELS[requirement.importance]}
                    </span>
                  </div>
                )
              })}
          </div>
        ) : (
          <div className="rounded-[var(--radius-large)] border border-dashed border-border py-8 text-center text-xs text-muted">
            Aucune compétence requise n&apos;est encore structurée.
          </div>
        )}
      </section>

      <MatchingDialog
        key={opportunity.id}
        open={matchingOpen}
        onOpenChange={setMatchingOpen}
        opportunityId={opportunity.id}
        opportunityTitle={opportunity.title}
        isMobile={isMobile}
        onStaffed={onStaffed}
      />
    </div>
  )
}

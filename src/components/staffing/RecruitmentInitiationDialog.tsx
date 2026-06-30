"use client"

import { useState } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import type {
  AssistanceCaseOpportunity,
  AssistanceCasePositioning,
} from "@/types/assistance-case"

const EMERALD_ACCENT = "#00C853"

interface RecruitmentInitiationButtonProps {
  label: string
  onClick: () => void
  size?: "sm" | "md"
  dashed?: boolean
  fullWidth?: boolean
}

interface RecruitmentInitiationDialogProps {
  open: boolean
  opportunity: AssistanceCaseOpportunity
  positioning: AssistanceCasePositioning
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: RecruitmentInitiationPayload) => Promise<void>
}

export interface RecruitmentInitiationPayload {
  roleTitle: string
  scheduledDate: string
  targetSalary: string
  targetDailyRate: string
  availability: string
  location: string
  proposalFoundation: string
}

type RecruitmentInitiationFormState = RecruitmentInitiationPayload

function getCandidateName(positioning: AssistanceCasePositioning) {
  const person = positioning.candidate.person
  return (
    person?.full_name ||
    `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() ||
    "Profil sans nom"
  )
}

function isoDate(value: string | null | undefined) {
  if (!value) return ""
  return value.slice(0, 10)
}

function buildProposalFoundation(
  opportunity: AssistanceCaseOpportunity,
  positioning: AssistanceCasePositioning,
) {
  const candidate = positioning.candidate
  const lines = [
    `Besoin ciblé : ${opportunity.title}`,
    candidate.summary ? `Synthèse candidat : ${candidate.summary}` : null,
    candidate.current_title ? `Positionnement pressenti : ${candidate.current_title}` : null,
    candidate.seniority ? `Séniorité : ${candidate.seniority}` : null,
    candidate.mobility ? `Mobilité : ${candidate.mobility}` : null,
    candidate.constraints_notes ? `Points d'attention : ${candidate.constraints_notes}` : null,
    positioning.next_action ? `Prochaine action : ${positioning.next_action}` : null,
  ]

  return lines.filter(Boolean).join("\n")
}

function buildInitialFormState(
  opportunity: AssistanceCaseOpportunity,
  positioning: AssistanceCasePositioning,
): RecruitmentInitiationFormState {
  const candidate = positioning.candidate
  const person = candidate.person

  return {
    roleTitle: candidate.current_title?.trim() || opportunity.title,
    scheduledDate:
      isoDate(candidate.available_from) ||
      isoDate(opportunity.start_date) ||
      new Date().toISOString().slice(0, 10),
    targetSalary:
      candidate.expected_salary !== null && candidate.expected_salary !== undefined
        ? String(candidate.expected_salary)
        : "",
    targetDailyRate:
      opportunity.target_daily_rate !== null && opportunity.target_daily_rate !== undefined
        ? String(Math.round(opportunity.target_daily_rate))
        : "",
    availability:
      candidate.availability_notes?.trim() ||
      candidate.availability?.trim() ||
      isoDate(candidate.available_from) ||
      "À préciser",
    location:
      person?.location?.trim() ||
      opportunity.location?.trim() ||
      "À préciser",
    proposalFoundation: buildProposalFoundation(opportunity, positioning),
  }
}

function fieldLabel(label: string, required = false) {
  return (
    <span className="text-xs font-semibold text-heading">
      {label}
      {required ? <span className="text-danger"> *</span> : null}
    </span>
  )
}

function ContextField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-heading">{value}</p>
    </div>
  )
}

export function RecruitmentInitiationButton({
  label,
  onClick,
  size = "sm",
  dashed = false,
  fullWidth = false,
}: RecruitmentInitiationButtonProps) {
  return (
    <Button
      variant="secondary"
      size={size}
      onClick={onClick}
      fullWidth={fullWidth}
      className={dashed
        ? "rounded-[10px] border-2 border-dashed bg-transparent text-[11px] font-bold"
        : "h-8 min-w-0 overflow-hidden rounded-[10px] border-[1.5px] bg-transparent px-3 text-[11px] font-bold shadow-none transition-[transform,box-shadow,background-color,border-color,color] duration-200 hover:-translate-y-0.5 hover:bg-transparent hover:shadow-[0_10px_18px_rgba(0,200,83,0.16)] before:absolute before:inset-y-0 before:left-[-30%] before:w-8 before:-skew-x-12 before:bg-white/55 before:opacity-0 before:transition-[transform,opacity] before:duration-500 before:ease-out hover:before:translate-x-[320%] hover:before:opacity-100 sm:h-8"}
      style={{
        borderColor: EMERALD_ACCENT,
        color: EMERALD_ACCENT,
      }}
    >
      <span className="relative z-10">{label}</span>
    </Button>
  )
}

export function RecruitmentInitiationDialog({
  open,
  opportunity,
  positioning,
  onOpenChange,
  onSubmit,
}: RecruitmentInitiationDialogProps) {
  const [form, setForm] = useState<RecruitmentInitiationFormState>(() =>
    buildInitialFormState(opportunity, positioning),
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const candidateName = getCandidateName(positioning)
  const companyName = opportunity.company?.name ?? "Compte non renseigné"

  async function handleSubmit() {
    if (!form.roleTitle.trim()) {
      setError("L'intitulé du poste est requis.")
      return
    }

    if (!form.scheduledDate) {
      setError("La date cible de lancement est requise.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await onSubmit(form)
      onOpenChange(false)
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Impossible d'initier le recrutement.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Initier un recrutement"
      className="h-[min(100dvh-1.5rem,44rem)] sm:h-[min(100dvh-3rem,44rem)] sm:max-w-2xl"
      titleClassName="text-lg sm:text-[1.35rem]"
      bodyClassName="pr-2"
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            loading={submitting}
          >
            Lancer le recrutement
          </Button>
        </>
      }
    >
      <div className="flex min-h-full flex-col gap-5 pb-1">
        {error ? (
          <div className="rounded-[var(--radius-medium)] border border-danger/25 bg-danger/[0.08] p-3 text-xs font-medium text-danger">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 border-b border-border/50 pb-4 sm:grid-cols-3">
          <ContextField label="Candidat" value={candidateName} />
          <ContextField label="Compte" value={companyName} />
          <ContextField label="Besoin" value={opportunity.title} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="recruitment-role-title">{fieldLabel("Intitulé du poste", true)}</label>
          <Input
            id="recruitment-role-title"
            value={form.roleTitle}
            onChange={(event) =>
              setForm((current) => ({ ...current, roleTitle: event.target.value }))
            }
            fullWidth
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="recruitment-scheduled-date">{fieldLabel("Date cible", true)}</label>
            <Input
              id="recruitment-scheduled-date"
              type="date"
              value={form.scheduledDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, scheduledDate: event.target.value }))
              }
              fullWidth
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="recruitment-availability">{fieldLabel("Disponibilité")}</label>
            <Input
              id="recruitment-availability"
              value={form.availability}
              onChange={(event) =>
                setForm((current) => ({ ...current, availability: event.target.value }))
              }
              fullWidth
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="recruitment-target-salary">{fieldLabel("Salaire cible annuel")}</label>
            <Input
              id="recruitment-target-salary"
              type="number"
              inputMode="numeric"
              value={form.targetSalary}
              onChange={(event) =>
                setForm((current) => ({ ...current, targetSalary: event.target.value }))
              }
              fullWidth
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="recruitment-target-tjm">{fieldLabel("TJM client")}</label>
            <Input
              id="recruitment-target-tjm"
              type="number"
              inputMode="numeric"
              value={form.targetDailyRate}
              onChange={(event) =>
                setForm((current) => ({ ...current, targetDailyRate: event.target.value }))
              }
              fullWidth
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="recruitment-location">{fieldLabel("Localisation")}</label>
          <Input
            id="recruitment-location"
            value={form.location}
            onChange={(event) =>
              setForm((current) => ({ ...current, location: event.target.value }))
            }
            fullWidth
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="recruitment-foundation">{fieldLabel("Socle de proposition")}</label>
          <Textarea
            id="recruitment-foundation"
            rows={7}
            value={form.proposalFoundation}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                proposalFoundation: event.target.value,
              }))
            }
            fullWidth
          />
        </div>
      </div>
    </AppDialog>
  )
}

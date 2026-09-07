"use client"

import { useState, type ReactNode } from "react"
import { formatEuro, formatPct, formatDateNumeric } from "@/lib/formatters"
import type { DetailedProjectData } from "@/app/(app)/missions/_data/get-project-detail"
import { ContactRoundIcon, WalletCardsIcon, CalendarRangeIcon } from "./engagement-icons"
import { Button } from "@/components/ui/Button"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
//  Rail droit « Détails & Pilotage du projet » du shell Engagements.
//  Adaptation projet de MissionDetailsRail :
//   1. Responsable projet (lead) avec actions Contacter / Profil
//   2. Conditions financières (CA contractuel, marge cible vs réelle, avancement)
//   3. Prochaine échéance (prochain jalon ou fin de phase avec délai restant)
// ─────────────────────────────────────────────────────────────────────────────

interface ProjectDetailsRailProps {
  detail: DetailedProjectData
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-heading">
      <span className="size-3.5 text-primary">{icon}</span>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.08em]">{children}</h3>
    </div>
  )
}

function DataRow({
  label,
  value,
  strong,
  colorClass,
}: {
  label: string
  value: ReactNode
  strong?: boolean
  colorClass?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[11px] text-muted">{label}</span>
      <span
        className={cn(
          "text-right font-mono text-xs tabular-nums",
          strong ? "font-semibold text-heading" : "text-heading",
          colorClass,
        )}
      >
        {value}
      </span>
    </div>
  )
}

function CoordinateCopyModal({
  title,
  value,
  onClose,
}: {
  title?: string
  value: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[320px]">
        <SurfaceCard className="relative flex flex-col gap-3 border border-border/80 bg-surface p-4 shadow-xl">
          {title && (
            <p className="text-center text-xs font-bold uppercase tracking-wider text-muted">{title}</p>
          )}
          <div className="rounded-lg border border-border/50 bg-canvas/60 p-3 text-center">
            <span className="select-all text-sm font-bold text-heading break-all">{value}</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors",
                copied
                  ? "bg-success text-success-fg"
                  : "bg-primary text-primary-fg hover:bg-primary/90",
              )}
            >
              {copied ? "Copié !" : "Copier"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[40px] flex-1 items-center justify-center rounded-lg border border-border text-xs font-semibold text-body hover:bg-canvas"
            >
              Fermer
            </button>
          </div>
        </SurfaceCard>
      </div>
    </div>
  )
}

function computeDaysRemaining(dateStr: string): { label: string; isPast: boolean } {
  const target = new Date(dateStr)
  if (isNaN(target.getTime())) return { label: "", isPast: false }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)

  const diffMs = target.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return { label: "Aujourd'hui", isPast: false }
  if (diffDays > 0) return { label: `Dans ${diffDays} j`, isPast: false }
  return { label: `Dépassé de ${Math.abs(diffDays)} j`, isPast: true }
}

export function ProjectDetailsRail({ detail }: ProjectDetailsRailProps) {
  const [modalData, setModalData] = useState<{ title: string; value: string } | null>(null)

  // 1. Responsable projet (chef de projet ou premier membre)
  const teamMembers = detail.project_team_members ?? []
  const lead = teamMembers.find((m) => m.is_project_lead) ?? teamMembers[0] ?? null

  const leadName = lead?.fullName || (lead?.role_label ? `Lead ${lead.role_label}` : "Non assigné")
  const leadInitials = leadName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "CP"

  // 2. Conditions financières & Marge
  const actualMargin = detail.actual_margin_pct
  const targetMargin = detail.target_margin_pct
  let marginColorClass = "text-heading"
  if (actualMargin !== null && targetMargin !== null) {
    marginColorClass = actualMargin >= targetMargin ? "text-success font-semibold" : "text-danger font-semibold"
  }

  // 3. Prochaine échéance
  // Recherche parmi les jalons de facturation et les fins de phases
  const phases = detail.project_phases ?? []
  const milestones = detail.billing_milestones ?? []

  type MilestoneCandidate = {
    title: string
    date: string
    type: "Jalon" | "Phase" | "Livraison"
    status?: string
  }

  const candidates: MilestoneCandidate[] = []

  milestones.forEach((m, idx) => {
    if (m.due_date && !m.invoiced_at) {
      candidates.push({
        title: m.label || `Jalon ${idx + 1}`,
        date: m.due_date,
        type: "Jalon",
        status: "En attente facturation",
      })
    }
  })

  phases.forEach((p) => {
    if (p.end_date_planned && p.status !== "completed") {
      candidates.push({
        title: p.label,
        date: p.end_date_planned,
        type: "Phase",
        status: p.status === "in_progress" ? "En cours" : "Planifié",
      })
    }
  })

  if (detail.end_date_planned) {
    candidates.push({
      title: "Livraison finale du projet",
      date: detail.end_date_planned,
      type: "Livraison",
    })
  }

  candidates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const nextDeadline = candidates[0] ?? null

  return (
    <>
      <aside
        className="engagements-scrollbar flex min-h-0 flex-col overflow-y-auto border-l border-border bg-surface px-5 py-6 text-body"
        aria-label="Pilotage du projet"
      >
        {/* ── 1. Responsable projet ────────────────────────────────────── */}
        <section className="border-b border-border pb-6">
          <SectionTitle icon={<ContactRoundIcon />}>Responsable projet</SectionTitle>

          {lead ? (
            <div>
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs"
                  aria-hidden="true"
                >
                  {leadInitials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-heading">{leadName}</p>
                  <p className="truncate text-[11px] text-muted">
                    {lead.role_label}
                    {lead.seniority ? ` · ${lead.seniority}` : ""}
                  </p>
                </div>
              </div>

              {lead.contribution && (
                <p className="mt-2.5 line-clamp-2 text-[11px] leading-relaxed text-muted italic">
                  « {lead.contribution} »
                </p>
              )}

              <div className="mt-3.5 flex items-center gap-2">
                {lead.email ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setModalData({ title: "Contacter le responsable", value: lead.email! })}
                  >
                    Contacter
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setModalData({ title: "Responsable projet", value: leadName })}
                  >
                    Contacter
                  </Button>
                )}

                {lead.collaborator_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary hover:underline"
                    onClick={() =>
                      setModalData({
                        title: "Profil KREDO",
                        value: `${leadName} — ID: ${lead.collaborator_id}`,
                      })
                    }
                  >
                    Voir profil
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">Aucun chef de projet désigné.</p>
          )}
        </section>

        {/* ── 2. Conditions financières ────────────────────────────────── */}
        <section className="border-b border-border py-6">
          <SectionTitle icon={<WalletCardsIcon />}>Conditions financières</SectionTitle>

          <div className="rounded-lg border border-border/70 bg-canvas/40 p-3">
            <DataRow
              label="Montant contractuel"
              value={formatEuro(detail.contract_amount)}
              strong
            />
            <DataRow
              label="Marge cible"
              value={formatPct(detail.target_margin_pct)}
            />
            <DataRow
              label="Marge réelle"
              value={formatPct(detail.actual_margin_pct)}
              colorClass={marginColorClass}
              strong
            />
            <DataRow
              label="Avancement"
              value={`${detail.progress_pct}%`}
            />
          </div>
        </section>

        {/* ── 3. Prochaine échéance ────────────────────────────────────── */}
        <section className="pt-6">
          <SectionTitle icon={<CalendarRangeIcon />}>Prochaine échéance</SectionTitle>

          {nextDeadline ? (
            (() => {
              const countdown = computeDaysRemaining(nextDeadline.date)

              return (
                <div className="rounded-lg border border-border/80 bg-canvas/50 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                      {nextDeadline.type}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold",
                        countdown.isPast
                          ? "bg-danger/15 text-danger"
                          : "bg-brand-brass/15 text-brand-brass",
                      )}
                    >
                      {countdown.label}
                    </span>
                  </div>

                  <p className="mt-2 font-semibold text-heading text-xs">
                    {nextDeadline.title}
                  </p>

                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
                    <span>Date prévue :</span>
                    <span className="font-mono font-medium text-heading">
                      {formatDateNumeric(nextDeadline.date)}
                    </span>
                  </div>

                  {nextDeadline.status && (
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                      <span>Statut :</span>
                      <span className="text-body font-medium">{nextDeadline.status}</span>
                    </div>
                  )}
                </div>
              )
            })()
          ) : (
            <p className="text-xs text-muted">Aucune échéance à venir renseignée.</p>
          )}
        </section>
      </aside>

      {modalData && (
        <CoordinateCopyModal
          title={modalData.title}
          value={modalData.value}
          onClose={() => setModalData(null)}
        />
      )}
    </>
  )
}

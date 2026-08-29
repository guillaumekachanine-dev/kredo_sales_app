"use client"

import { useState, type ReactNode } from "react"
import { formatEuro, formatPct } from "@/lib/formatters"
import type { MissionSummary } from "@/components/missions/mission-detail/mission-detail-types"
import {
  computeAnnualContractValueThroughYearEnd,
  computeEstimatedContractValue,
  computeTheoreticalMarginPct,
} from "@/components/missions/mission-detail/mission-detail-utils"
import type { EngagementMissionDetail } from "@/app/(app)/missions/_data/get-engagement-mission-detail"
import { ContactRoundIcon, WalletCardsIcon } from "./engagement-icons"
import { ViewProfileButton } from "./ViewProfileButton"
import { Button } from "@/components/ui/Button"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { AgendaEventDrawer, type AgendaEventDrawerInitialValues } from "@/components/agenda/AgendaEventDrawer"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { cn } from "@/lib/utils"

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

function toMissionSummary(m: EngagementMissionDetail["mission"]): MissionSummary {
  return {
    id: m.id,
    title: m.title,
    status: m.status,
    start_date: m.startDate,
    end_date: m.endDate,
    role_title: m.roleTitle,
    practice: m.practice,
    seniority: m.seniority,
    tjm: m.tjm,
    cjm: m.cjm,
    gross_margin_pct: m.grossMarginPct,
    billing_condition: m.billingCondition,
    description: m.description,
    metadata: {},
    opportunity_id: null,
    collaborator_id: "",
    company_id: "",
    external_ref: m.externalRef,
  }
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-heading">
      <span className="size-3.5 text-primary">{icon}</span>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.08em]">{children}</h3>
    </div>
  )
}

function DataRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[11px] text-muted">{label}</span>
      <span
        className={
          strong
            ? "text-right font-mono text-xs font-semibold tabular-nums text-heading"
            : "text-right font-mono text-xs tabular-nums text-heading"
        }
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
  isUrl = false,
}: {
  title?: string
  value: string
  onClose: () => void
  isUrl?: boolean
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[320px]">
        <SurfaceCard className="w-full p-4 border border-border/80 animate-in zoom-in-95 duration-200 flex flex-col gap-3 relative bg-surface">
          {title && (
            <p className="text-xs font-bold uppercase tracking-wider text-muted text-center">{title}</p>
          )}
          <div className="bg-canvas/50 border border-border/50 rounded-lg p-3 text-center">
            <span className="text-sm font-bold text-heading break-all select-all">{value}</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "flex-1 min-h-[44px] rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5",
                copied
                  ? "bg-success text-success-fg"
                  : "bg-primary text-primary-fg hover:bg-primary/90"
              )}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copié !
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copier
                </>
              )}
            </button>

            {isUrl && (
              <a
                href={value.startsWith("http") ? value : `https://${value}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-canvas px-3 text-xs font-semibold text-heading hover:bg-surface-hover"
              >
                Ouvrir
              </a>
            )}
          </div>
        </SurfaceCard>
      </div>
    </div>
  )
}

export function MissionDetailsRail({ detail }: { detail: EngagementMissionDetail }) {
  const { mission, collaborator, operationalContact } = detail

  const marginPct = mission.cjm > 0 ? computeTheoreticalMarginPct(toMissionSummary(mission)) : null

  const hasEnd = Boolean(mission.endDate)
  const missionSummary = toMissionSummary(mission)
  const contractValue = hasEnd
    ? computeEstimatedContractValue(missionSummary)
    : computeAnnualContractValueThroughYearEnd(missionSummary)
  const contractValueLabel = hasEnd ? "TCV estimé" : "Projection CA à fin d’année"

  // Event Drawer state
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false)
  const [eventInitialValues, setEventInitialValues] = useState<AgendaEventDrawerInitialValues | undefined>()

  // Copy modal state for contact coordinates
  const [copyModalState, setCopyModalState] = useState<{ title: string; value: string; isUrl?: boolean } | null>(null)

  return (
    <>
      <aside
        className="engagements-scrollbar min-h-0 overflow-y-auto border-l border-border bg-surface"
        aria-label="Détails de la mission"
      >
        <div className="divide-y divide-border px-4">
          {/* ── Collaborateur ─────────────────────────────────────── */}
          <section className="py-4">
            {collaborator ? (
              <div>
                <div className="flex flex-col items-center text-center">
                  <span className="flex size-14 items-center justify-center rounded-full bg-primary/[0.09] font-heading text-lg font-bold text-primary">
                    {initials(collaborator.fullName)}
                  </span>
                  <p className="mt-2.5 text-sm font-bold text-heading">{collaborator.fullName}</p>
                  <p className="mt-0.5 text-[11px] text-body">
                    {collaborator.currentTitle || collaborator.seniority || "Profil non renseigné"}
                  </p>
                </div>
                <dl className="mt-4 space-y-2 border-t border-border pt-3">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Practice</dt>
                    <dd className="mt-0.5 text-xs font-semibold text-heading">
                      {collaborator.practice || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Séniorité</dt>
                    <dd className="mt-0.5 text-xs font-semibold text-heading">
                      {collaborator.seniority || "—"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3.5 grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      openCommunicationComposer({
                        origin: "consultant",
                        scope: "collaborator",
                        collaboratorId: collaborator.id,
                        primaryEntity: { type: "collaborator", id: collaborator.id },
                      })
                    }}
                  >
                    Contacter
                  </Button>
                  <ViewProfileButton collaboratorId={collaborator.id} />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted">Aucun collaborateur affecté</p>
            )}
          </section>

          {/* ── Conditions financières ────────────────────────────── */}
          <section className="py-4">
            <SectionTitle icon={<WalletCardsIcon />}>Conditions financières</SectionTitle>
            <div>
              <DataRow label="Coût journalier (CJM)" value={mission.cjm > 0 ? formatEuro(mission.cjm) : "—"} />
              <DataRow label="Prix de vente (TJM)" value={formatEuro(mission.tjm)} strong />
              <DataRow label="Taux de marge" value={marginPct === null ? "—" : formatPct(marginPct)} />
              <DataRow
                label={contractValueLabel}
                value={contractValue === null ? "—" : formatEuro(contractValue)}
                strong
              />
            </div>
          </section>

          {/* ── Contact client ────────────────────────────────────── */}
          <section className="py-4">
            <SectionTitle icon={<ContactRoundIcon />}>Contact client</SectionTitle>
            {operationalContact ? (
              <div className="space-y-3">
                {/* Cadre au fond bleu cobalt (style header drawer contact) */}
                <div className="flex flex-col gap-2 rounded-[var(--radius-medium)] border border-primary/20 bg-primary p-3.5 text-white">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {detail.company ? (
                      <CompanyLogo
                        name={detail.company.name}
                        logoPath={detail.company.logoPath}
                        website={detail.company.website}
                        size="lg"
                        className="size-11 shrink-0 rounded-full border border-white/20"
                      />
                    ) : (
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/15 font-heading text-sm font-extrabold text-white">
                        {initials(operationalContact.fullName)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{operationalContact.fullName}</p>
                      {operationalContact.role ? (
                        <p className="mt-0.5 truncate text-[11px] font-medium text-white/80">
                          {operationalContact.role}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* 3ème ligne : icônes téléphone et mail ouvrant la mini-modale */}
                  {(operationalContact.phone || operationalContact.email) && (
                    <div className="flex items-center gap-4 pt-1.5 border-t border-white/15 text-white/90">
                      {operationalContact.phone && (
                        <button
                          type="button"
                          onClick={() => setCopyModalState({ title: "Téléphone", value: operationalContact.phone! })}
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/90 hover:text-white transition-colors focus:outline-none"
                          title="Voir / copier le téléphone"
                        >
                          <svg className="size-3.5 shrink-0 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="truncate max-w-[110px]">{operationalContact.phone}</span>
                        </button>
                      )}

                      {operationalContact.email && (
                        <button
                          type="button"
                          onClick={() => setCopyModalState({ title: "E-mail", value: operationalContact.email! })}
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/90 hover:text-white transition-colors focus:outline-none min-w-0"
                          title="Voir / copier l'e-mail"
                        >
                          <svg className="size-3.5 shrink-0 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="truncate">{operationalContact.email}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Deux boutons sous le cadre : Contacter (gauche) et Planifier (droite) */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      openCommunicationComposer({
                        origin: "contact",
                        companyId: detail.company?.id ?? null,
                        companyName: detail.company?.name ?? null,
                        contactId: operationalContact.id,
                        primaryEntity: { type: "contact", id: operationalContact.id },
                      })
                    }}
                  >
                    Contacter
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      setEventInitialValues({
                        title: `Échange · ${operationalContact.fullName}`,
                        event_type: "rdv_prospection",
                        company: detail.company ? { id: detail.company.id, name: detail.company.name, isNew: false } : null,
                        contact_id: operationalContact.id,
                      })
                      setEventDrawerOpen(true)
                    }}
                  >
                    Planifier
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted">Aucun contact opérationnel renseigné</p>
            )}
          </section>
        </div>
      </aside>

      <AgendaEventDrawer
        open={eventDrawerOpen}
        onOpenChange={setEventDrawerOpen}
        event={null}
        onSaved={() => {}}
        initialValues={eventInitialValues}
      />

      {copyModalState && (
        <CoordinateCopyModal
          title={copyModalState.title}
          value={copyModalState.value}
          isUrl={copyModalState.isUrl}
          onClose={() => setCopyModalState(null)}
        />
      )}
    </>
  )
}

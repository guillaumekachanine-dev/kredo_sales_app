"use client"

import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { Button } from "@/components/ui/Button"
import { formatDate, formatEuro } from "@/lib/formatters"
import type { Opportunity } from "@/types/database-domain"

interface OpportunityDetailHeaderProps {
  opportunity: Opportunity
  account: {
    id: string
    name: string
    sector: string | null
    website: string | null
  } | null
  isMobile: boolean
  onBack: () => void
  onCreateEvent: () => void
  onCreateTask: () => void
  onPositionProfile: () => void
}

function getPriorityLabel(priority: string) {
  if (priority === "haute") return "Haute"
  if (priority === "basse") return "Basse"
  return "Normale"
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  )
}

function ActionsMenu({
  accountId,
  onCreateEvent,
  onCreateTask,
}: {
  accountId: string | null
  onCreateEvent: () => void
  onCreateTask: () => void
}) {
  return (
    <details className="group relative">
      <summary className="flex h-11 min-w-11 cursor-pointer list-none items-center justify-center gap-2 rounded-[var(--radius-medium)] border border-border bg-surface px-3 text-xs font-semibold text-heading transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 sm:h-9">
        <span className="hidden sm:inline">Actions</span>
        <span className="size-4 sm:hidden"><MoreIcon /></span>
        <svg className="hidden size-3 sm:block" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="m3 4.5 3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface py-1 shadow-[var(--shadow-overlay-sm)]">
        <button type="button" onClick={onCreateEvent} className="block w-full px-3 py-2 text-left text-xs font-medium text-body hover:bg-surface-hover hover:text-heading">
          Créer un événement
        </button>
        <button type="button" onClick={onCreateTask} className="block w-full px-3 py-2 text-left text-xs font-medium text-body hover:bg-surface-hover hover:text-heading">
          Créer une tâche
        </button>
        {accountId ? (
          <Link href={`/prospection/accounts/${accountId}`} className="block px-3 py-2 text-xs font-medium text-body hover:bg-surface-hover hover:text-heading">
            Ouvrir le compte
          </Link>
        ) : null}
      </div>
    </details>
  )
}

export function OpportunityDetailHeader({
  opportunity,
  account,
  isMobile,
  onBack,
  onCreateEvent,
  onCreateTask,
  onPositionProfile,
}: OpportunityDetailHeaderProps) {
  const companyName = account?.name ?? "Compte non renseigné"
  const nextMilestone = opportunity.next_action_label ?? "Prochain jalon à qualifier"
  const nextMilestoneDate = opportunity.next_action_at ? formatDate(opportunity.next_action_at) : "Échéance non renseignée"

  if (isMobile) {
    return (
      <header className="border-b border-border/70 pb-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} aria-label="Retour" className="flex size-11 items-center justify-center rounded-[var(--radius-medium)] border border-border bg-surface text-heading">
            <span className="size-5"><ChevronLeftIcon /></span>
          </button>
          <span className="text-xs font-semibold text-body">Opportunité</span>
          <ActionsMenu accountId={account?.id ?? null} onCreateEvent={onCreateEvent} onCreateTask={onCreateTask} />
        </div>

        <div className="mt-4 flex items-start gap-3">
          <CompanyLogo name={companyName} website={account?.website ?? null} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-heading">{companyName}</p>
            <h1 className="mt-1 font-heading text-lg font-bold leading-6 tracking-tight text-heading">{opportunity.title}</h1>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-body">
          <span>Priorité <strong className={opportunity.priority === "haute" ? "text-danger" : "text-heading"}>{getPriorityLabel(opportunity.priority)}</strong></span>
          <span>Conviction <strong className="text-primary">{opportunity.conviction} %</strong></span>
        </div>

        <div className="mt-4 grid grid-cols-[0.72fr_1.28fr] divide-x divide-border text-xs">
          <div className="pr-4">
            <p className="font-medium text-muted">ACV</p>
            <p className="mt-1 font-mono text-base font-bold tabular-nums text-heading">{formatEuro(opportunity.acv)}</p>
          </div>
          <div className="pl-4">
            <p className="font-medium text-muted">Prochain jalon</p>
            <p className="mt-1 font-semibold leading-5 text-body">{nextMilestone} · {nextMilestoneDate}</p>
          </div>
        </div>

        <Button type="button" fullWidth className="mt-4" onClick={onPositionProfile}>Positionner un profil</Button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Link href={`/missions/opps/${opportunity.id}/modifier`} className="flex h-11 items-center justify-center rounded-[var(--radius-medium)] border border-border bg-surface text-xs font-semibold text-heading">
            Modifier
          </Link>
          <button type="button" onClick={onCreateEvent} className="h-11 rounded-[var(--radius-medium)] border border-border bg-surface text-xs font-semibold text-heading">
            Créer un événement
          </button>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b border-border pb-5">
      <p className="text-xs text-muted">
        Engagements <span className="mx-1.5 text-border">/</span> Opportunités <span className="mx-1.5 text-border">/</span> <span className="font-medium text-primary">{opportunity.title}</span>
      </p>
      <div className="mt-4 flex items-start justify-between gap-8">
        <div className="flex min-w-0 items-center gap-4">
          <CompanyLogo name={companyName} website={account?.website ?? null} size="xl" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-body">{companyName}</p>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-heading">{opportunity.title}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={`/missions/opps/${opportunity.id}/modifier`} className="flex h-9 items-center justify-center rounded-[var(--radius-medium)] border border-border bg-surface px-4 text-xs font-semibold text-heading hover:bg-surface-hover">
            Modifier
          </Link>
          <Button type="button" size="sm" onClick={onPositionProfile}>Positionner un profil</Button>
          <ActionsMenu accountId={account?.id ?? null} onCreateEvent={onCreateEvent} onCreateTask={onCreateTask} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-body">
        <span>Priorité <strong className={opportunity.priority === "haute" ? "text-danger" : "text-heading"}>{getPriorityLabel(opportunity.priority)}</strong></span>
        <span className="h-4 w-px bg-border" aria-hidden="true" />
        <span>Conviction <strong className="text-primary">{opportunity.conviction} %</strong></span>
        <span className="h-4 w-px bg-border" aria-hidden="true" />
        <span>ACV <strong className="font-mono tabular-nums text-heading">{formatEuro(opportunity.acv)}</strong></span>
        <span className="h-4 w-px bg-border" aria-hidden="true" />
        <span>Prochain jalon <strong className="font-medium text-body">· {nextMilestone} · {nextMilestoneDate}</strong></span>
      </div>
    </header>
  )
}

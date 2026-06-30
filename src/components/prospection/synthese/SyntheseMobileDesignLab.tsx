"use client"

import { useState } from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { MobileActionPage } from "@/components/templates/MobileActionPage"
import { Badge } from "@/components/ui/Badge"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { MobilePageHeader } from "@/components/ui/mobile/MobilePageHeader"
import { cn } from "@/lib/utils"
import type { SyntheseDesignVariant } from "./design-variants"
import type {
  MobileLensKey,
  MobilePriorityItem,
  MobilePriorityViewModel,
} from "./mobile-priority-view-model"

type SyntheseMobileDesignLabProps = {
  design: SyntheseDesignVariant
  viewModel: MobilePriorityViewModel
  examinedCount: number
  isPending: boolean
  onChangeLens: (lens: MobileLensKey) => void
  onOpenActions: (accountId: string) => void
  onOpenAccount: (accountId: string) => void
  onWhyNowOpen: (accountId: string) => void
}

export function SyntheseMobileDesignLab({
  design,
  viewModel,
  examinedCount,
  isPending,
  onChangeLens,
  onOpenActions,
  onOpenAccount,
  onWhyNowOpen,
}: SyntheseMobileDesignLabProps) {
  const hero = renderHero({
    design,
    viewModel,
    examinedCount,
  })
  const overflowCount = viewModel.totalForLens - viewModel.items.length

  return (
    <MobileActionPage
      header={(
        <MobilePageHeader
          eyebrow="CRM · Synthese"
          title="Priorites commerciales"
          contextControl={<PeriodBadge label={viewModel.periodLabel} />}
        />
      )}
      hero={hero}
      context={(
        <VariantLensRail
          design={design}
          viewModel={viewModel}
          onChangeLens={onChangeLens}
          isPending={isPending}
        />
      )}
    >
      <div className={cn("flex flex-col gap-4", isPending && "opacity-60 transition-opacity")}>
        {viewModel.items.map((item) => renderCard({
          design,
          item,
          onOpenActions,
          onOpenAccount,
          onWhyNowOpen,
        }))}
        {overflowCount > 0 ? (
          <p className="py-1 text-center text-xs text-muted">
            {overflowCount} priorite{overflowCount > 1 ? "s" : ""} supplementaire{overflowCount > 1 ? "s" : ""}
          </p>
        ) : null}
      </div>
    </MobileActionPage>
  )
}

function renderHero({
  design,
  viewModel,
  examinedCount,
}: {
  design: SyntheseDesignVariant
  viewModel: MobilePriorityViewModel
  examinedCount: number
}) {
  const activeLens = viewModel.lenses.find((lens) => lens.key === viewModel.activeLens)?.label ?? "Toutes"

  if (design === "editorial") {
    return (
      <SurfaceCard className="overflow-hidden rounded-[2rem] border-heading/10 bg-heading text-primary-fg">
        <div className="space-y-4 px-5 py-5">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-fg/65">
                Direction A
              </p>
              <p className="font-heading text-5xl font-bold tracking-[-0.05em] text-primary-fg">
                {viewModel.totalForLens}
              </p>
              <p className="text-sm text-primary-fg/76">
                priorite{viewModel.totalForLens !== 1 ? "s" : ""} a lire
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-fg/60">
                Lentille
              </p>
              <p className="font-semibold text-primary-fg">{activeLens}</p>
            </div>
          </div>

          <p className="text-sm leading-6 text-primary-fg/76">
            Une lecture mobile plus ample, avec une priorisation assumee et une
            respiration plus editoriale sans changer les actions disponibles.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <SurfaceCard className="border-white/10 bg-white/[0.08] px-4 py-3 text-primary-fg">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-fg/60">
                Portefeuille
              </p>
              <p className="mt-1 font-heading text-2xl font-bold tracking-[-0.03em] text-primary-fg">
                {viewModel.totalPortfolio}
              </p>
            </SurfaceCard>
            <SurfaceCard className="border-white/10 bg-white/[0.08] px-4 py-3 text-primary-fg">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-fg/60">
                Examinees
              </p>
              <p className="mt-1 font-heading text-2xl font-bold tracking-[-0.03em] text-primary-fg">
                {examinedCount}
              </p>
            </SurfaceCard>
          </div>
        </div>
      </SurfaceCard>
    )
  }

  if (design === "intelligence-map") {
    return (
      <SurfaceCard className="overflow-hidden rounded-[2rem] border-primary/12 bg-surface-raised">
        <div className="space-y-4 px-5 py-5">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Direction B
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-[-0.04em] text-heading">
              Carte d&apos;intelligence mobile
            </h2>
            <p className="text-sm leading-6 text-body">
              La synthese se lit comme un reseau: lentille active, volume utile,
              puis cartes a ouvrir selon le signal dominant.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[1.5rem] border border-primary/15 bg-surface px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Lentille active
              </p>
              <p className="mt-1 font-semibold text-heading">{activeLens}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SurfaceCard className="bg-canvas px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Priorites
                </p>
                <p className="mt-1 font-heading text-2xl font-bold tracking-[-0.03em] text-heading">
                  {viewModel.totalForLens}
                </p>
              </SurfaceCard>
              <SurfaceCard className="bg-canvas px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Examinees
                </p>
                <p className="mt-1 font-heading text-2xl font-bold tracking-[-0.03em] text-heading">
                  {examinedCount}
                </p>
              </SurfaceCard>
            </div>
          </div>
        </div>
      </SurfaceCard>
    )
  }

  return (
    <SurfaceCard className="overflow-hidden rounded-[2rem] border-heading/10 bg-surface">
      <div className="border-b border-heading/10 bg-heading px-5 py-4 text-primary-fg">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-fg/65">
              Direction C
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-[-0.04em] text-primary-fg">
              Control Room
            </h2>
          </div>
          <p className="text-right text-sm text-primary-fg/76">
            {viewModel.periodLabel}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-border">
        <ControlHeroMetric label="Priorites" value={String(viewModel.totalForLens)} />
        <ControlHeroMetric label="Portefeuille" value={String(viewModel.totalPortfolio)} />
        <ControlHeroMetric label="Examinees" value={String(examinedCount)} />
      </div>
    </SurfaceCard>
  )
}

function renderCard({
  design,
  item,
  onOpenActions,
  onOpenAccount,
  onWhyNowOpen,
}: {
  design: SyntheseDesignVariant
  item: MobilePriorityItem
  onOpenActions: (accountId: string) => void
  onOpenAccount: (accountId: string) => void
  onWhyNowOpen: (accountId: string) => void
}) {
  if (design === "editorial") {
    return (
      <EditorialMobileCard
        key={item.accountId}
        item={item}
        onOpenActions={onOpenActions}
        onOpenAccount={onOpenAccount}
        onWhyNowOpen={onWhyNowOpen}
      />
    )
  }

  if (design === "intelligence-map") {
    return (
      <IntelligenceMapMobileCard
        key={item.accountId}
        item={item}
        onOpenActions={onOpenActions}
        onOpenAccount={onOpenAccount}
        onWhyNowOpen={onWhyNowOpen}
      />
    )
  }

  return (
    <ControlRoomMobileCard
      key={item.accountId}
      item={item}
      onOpenActions={onOpenActions}
      onOpenAccount={onOpenAccount}
      onWhyNowOpen={onWhyNowOpen}
    />
  )
}

function VariantLensRail({
  design,
  viewModel,
  onChangeLens,
  isPending,
}: {
  design: SyntheseDesignVariant
  viewModel: MobilePriorityViewModel
  onChangeLens: (lens: MobileLensKey) => void
  isPending: boolean
}) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-0.5 scrollbar-none",
        isPending && "pointer-events-none",
      )}
      role="tablist"
      aria-label="Lentilles commerciales"
    >
      {viewModel.lenses.map((lens) => {
        const isActive = lens.key === viewModel.activeLens
        return (
          <button
            key={lens.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChangeLens(lens.key)}
            className={cn(
              "inline-flex min-h-[34px] shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
              design === "editorial" && isActive && "border-heading bg-heading text-primary-fg",
              design === "editorial" && !isActive && "border-border bg-surface text-body",
              design === "intelligence-map" && isActive && "border-primary/30 bg-primary/[0.08] text-primary",
              design === "intelligence-map" && !isActive && "border-primary/12 bg-surface-raised text-body",
              design === "control-room" && isActive && "border-heading bg-heading text-primary-fg",
              design === "control-room" && !isActive && "border-border bg-surface text-body",
            )}
          >
            {lens.label}
            <span
              className={cn(
                "inline-flex size-4 items-center justify-center rounded-full text-[9px] font-semibold",
                isActive ? "bg-white/15 text-current" : "bg-canvas text-muted",
              )}
            >
              {lens.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function PeriodBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex min-h-[32px] items-center rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1.5 text-[11px] font-medium text-primary">
      {label}
    </span>
  )
}

function EditorialMobileCard({
  item,
  onOpenActions,
  onOpenAccount,
  onWhyNowOpen,
}: VariantCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <SurfaceCard className="overflow-hidden rounded-[2rem] border-heading/10 bg-surface">
      <div className="space-y-4 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Priorite {item.actionPriorityScore}/100
            </p>
            <h3 className="truncate font-heading text-2xl font-bold tracking-[-0.03em] text-heading">
              {item.accountName}
            </h3>
            <p className="text-sm text-body">{item.sector}</p>
          </div>
          <div className="shrink-0 text-right">
            <CompanyLogo name={item.accountName} size="md" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MetricPill label="Potentiel" value={`${item.potentialScore}`} />
          <MetricPill label="Reach" value={`${item.reachScore}`} />
          <MetricPill label="Momentum" value={`${item.momentumScore}`} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">{item.lifecycleLabel}</Badge>
          <Badge variant={item.priority === "haute" ? "brass" : "info"}>{item.priorityLabel}</Badge>
          <Badge variant={item.openOpportunityCount > 0 ? "success" : "neutral"}>
            {item.openOpportunityCount} opp.
          </Badge>
        </div>

        <div className="rounded-[1.5rem] border border-brand-brass/25 bg-brand-brass/[0.08] px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-brass">
            Action recommandee
          </p>
          <p className="mt-1 font-semibold text-heading">{item.recommendation.actionLabel}</p>
          <p className="mt-2 text-sm leading-6 text-body">{item.recommendation.whyNow}</p>
        </div>

        <VariantDetailsToggle
          open={detailsOpen}
          onToggle={() => {
            const next = !detailsOpen
            setDetailsOpen(next)
            if (next) onWhyNowOpen(item.accountId)
          }}
        />

        {detailsOpen ? (
          <VariantDetails item={item} tone="editorial" />
        ) : null}

        <VariantCardActions
          item={item}
          onOpenActions={onOpenActions}
          onOpenAccount={onOpenAccount}
        />
      </div>
    </SurfaceCard>
  )
}

function IntelligenceMapMobileCard({
  item,
  onOpenActions,
  onOpenAccount,
  onWhyNowOpen,
}: VariantCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <SurfaceCard className="overflow-hidden rounded-[2rem] border-primary/12 bg-surface-raised">
      <div className="space-y-4 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Noeud actif
            </p>
            <h3 className="truncate font-heading text-2xl font-bold tracking-[-0.03em] text-heading">
              {item.accountName}
            </h3>
            <p className="text-sm text-body">{item.sector}</p>
          </div>
          <span className="inline-flex rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1 text-xs font-semibold text-primary">
            {item.actionPriorityScore}/100
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {item.lenses.map((lens) => (
            <Badge key={lens} variant="brand">{lens}</Badge>
          ))}
          {item.lenses.length === 0 ? <Badge variant="neutral">hors lentille</Badge> : null}
        </div>

        <div className="rounded-[1.5rem] border border-primary/18 bg-surface px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Raison dominante
          </p>
          <p className="mt-1 text-sm font-medium leading-6 text-heading">
            {item.recommendation.dominantReason}
          </p>
          <div className="mt-3 space-y-2 border-l border-dashed border-primary/25 pl-4">
            {item.evidence.slice(0, 3).map((evidence) => (
              <div key={evidence.key} className="flex items-start gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <p className="text-xs leading-6 text-body">{evidence.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricPill label="Reach" value={`${item.reachScore}`} />
          <MetricPill label="Contacts" value={`${item.contactCount}`} />
        </div>

        <VariantDetailsToggle
          open={detailsOpen}
          onToggle={() => {
            const next = !detailsOpen
            setDetailsOpen(next)
            if (next) onWhyNowOpen(item.accountId)
          }}
        />

        {detailsOpen ? (
          <VariantDetails item={item} tone="map" />
        ) : null}

        <VariantCardActions
          item={item}
          onOpenActions={onOpenActions}
          onOpenAccount={onOpenAccount}
        />
      </div>
    </SurfaceCard>
  )
}

function ControlRoomMobileCard({
  item,
  onOpenActions,
  onOpenAccount,
  onWhyNowOpen,
}: VariantCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <SurfaceCard className="overflow-hidden rounded-[2rem] border-heading/10 bg-surface">
      <div className="border-b border-heading/10 bg-heading px-4 py-3 text-primary-fg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-fg/60">
              Command card
            </p>
            <h3 className="truncate font-heading text-2xl font-bold tracking-[-0.03em] text-primary-fg">
              {item.accountName}
            </h3>
            <p className="text-xs text-primary-fg/74">{item.sector}</p>
          </div>
          <span className="text-right font-heading text-3xl font-bold tracking-[-0.04em] text-primary-fg">
            {item.actionPriorityScore}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border">
        <ControlCardMetric label="Potentiel" value={`${item.potentialScore}/100`} />
        <ControlCardMetric label="Reach" value={`${item.reachScore}/100`} />
        <ControlCardMetric label="Momentum" value={`${item.momentumScore}/100`} />
        <ControlCardMetric label="Opp." value={`${item.openOpportunityCount}`} />
      </div>

      <div className="space-y-4 px-4 py-4">
        <SurfaceCard className="bg-canvas px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Action recommandee
          </p>
          <p className="mt-1 font-semibold text-heading">{item.recommendation.actionLabel}</p>
          <p className="mt-2 text-sm leading-6 text-body">{item.recommendation.whyNow}</p>
        </SurfaceCard>

        <VariantDetailsToggle
          open={detailsOpen}
          onToggle={() => {
            const next = !detailsOpen
            setDetailsOpen(next)
            if (next) onWhyNowOpen(item.accountId)
          }}
        />

        {detailsOpen ? (
          <VariantDetails item={item} tone="control" />
        ) : null}

        <VariantCardActions
          item={item}
          onOpenActions={onOpenActions}
          onOpenAccount={onOpenAccount}
        />
      </div>
    </SurfaceCard>
  )
}

function VariantDetails({
  item,
  tone,
}: {
  item: MobilePriorityItem
  tone: "editorial" | "map" | "control"
}) {
  return (
    <SurfaceCard
      className={cn(
        "px-4 py-4",
        tone === "editorial" && "bg-brand-brass/[0.05] border-brand-brass/20",
        tone === "map" && "bg-surface border-primary/14",
        tone === "control" && "bg-canvas",
      )}
    >
      <div className="space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Risque d&apos;inaction
          </p>
          <p className="mt-1 text-sm leading-6 text-body">
            {item.recommendation.costOfInaction}
          </p>
        </div>

        {item.evidence.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Preuves factuelles
            </p>
            <div className="space-y-2">
              {item.evidence.map((evidence) => (
                <p key={evidence.key} className="text-xs leading-6 text-body">
                  {evidence.label}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {item.dataConfidence.isPartial ? (
          <Badge variant={item.dataConfidence.level === "low" ? "warning" : "info"}>
            Donnees {item.dataConfidence.level === "low" ? "limitees" : "partielles"}
          </Badge>
        ) : (
          <Badge variant="success">Donnees consolidees</Badge>
        )}
      </div>
    </SurfaceCard>
  )
}

function VariantDetailsToggle({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex min-h-[40px] items-center gap-2 text-sm font-medium text-primary"
    >
      <svg
        className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
      Pourquoi maintenant
    </button>
  )
}

function VariantCardActions({
  item,
  onOpenActions,
  onOpenAccount,
}: {
  item: MobilePriorityItem
  onOpenActions: (accountId: string) => void
  onOpenAccount: (accountId: string) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onOpenActions(item.accountId)}
          disabled={item.primaryAction.disabled}
          className={cn(
            "flex min-h-[46px] flex-1 items-center justify-center rounded-[var(--radius-medium)] px-4 py-2.5 text-sm font-medium transition-colors",
            item.primaryAction.disabled
              ? "bg-border text-muted cursor-not-allowed"
              : "bg-primary text-primary-fg",
          )}
        >
          {item.primaryAction.label}
        </button>
        <button
          type="button"
          onClick={() => onOpenActions(item.accountId)}
          className="inline-flex size-[46px] items-center justify-center rounded-[var(--radius-medium)] border border-border bg-surface text-body transition-colors"
          aria-label="Plus d&apos;actions"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        onClick={() => onOpenAccount(item.accountId)}
        className="inline-flex min-h-[40px] items-center gap-2 text-sm font-medium text-primary"
      >
        Ouvrir la fiche compte
        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

function MetricPill({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <SurfaceCard className="bg-canvas px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-heading text-2xl font-bold tracking-[-0.03em] text-heading">
        {value}
      </p>
    </SurfaceCard>
  )
}

function ControlHeroMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="bg-surface px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-heading text-2xl font-bold tracking-[-0.03em] text-heading">
        {value}
      </p>
    </div>
  )
}

function ControlCardMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="bg-surface px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-heading text-2xl font-bold tracking-[-0.03em] text-heading">
        {value}
      </p>
    </div>
  )
}

type VariantCardProps = {
  item: MobilePriorityItem
  onOpenActions: (accountId: string) => void
  onOpenAccount: (accountId: string) => void
  onWhyNowOpen: (accountId: string) => void
}

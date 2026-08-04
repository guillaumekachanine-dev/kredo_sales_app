"use client"

import type { ReactNode } from "react"
import { HeaderCalendar } from "@/components/ui/HeaderCalendar"
import { Badge } from "@/components/ui/Badge"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import {
  getCommercialRecommendation,
  type ProspectionSummaryFocusPreset,
  type ProspectionSummaryKpi,
  type ProspectionSummaryViewModel,
} from "./synthese-view-model"
import type { SyntheseDesignVariant } from "./design-variants"
import {
  getPortfolioPeriodMetrics,
  type ProspectionPeriod,
} from "@/lib/prospection/portfolio-account-metrics"
import { AccountsToActivateTable } from "./AccountsToActivateTable"
import { PotentialReachMatrix } from "./PotentialReachMatrix"
import { SelectedAccountPanel } from "./SelectedAccountPanel"
import { WeeklyCommercialFocus } from "./WeeklyCommercialFocus"

type SyntheseDesktopDesignLabProps = {
  design: SyntheseDesignVariant
  filterBar: ReactNode
  viewModel: ProspectionSummaryViewModel
  period: ProspectionPeriod
  onSelectAccount: (accountId: string) => void
  onToggleFocus: (focus: ProspectionSummaryFocusPreset) => void
}

type DesktopVariantCoreProps = Omit<SyntheseDesktopDesignLabProps, "design">

export function SyntheseDesktopDesignLab({
  design,
  filterBar,
  viewModel,
  period,
  onSelectAccount,
  onToggleFocus,
}: SyntheseDesktopDesignLabProps) {
  if (design === "editorial") {
    return (
      <EditorialBusinessVariant
        filterBar={filterBar}
        viewModel={viewModel}
        period={period}
        onSelectAccount={onSelectAccount}
        onToggleFocus={onToggleFocus}
      />
    )
  }

  if (design === "intelligence-map") {
    return (
      <IntelligenceMapVariant
        filterBar={filterBar}
        viewModel={viewModel}
        period={period}
        onSelectAccount={onSelectAccount}
        onToggleFocus={onToggleFocus}
      />
    )
  }

  return (
    <ExecutiveControlRoomVariant
      filterBar={filterBar}
      viewModel={viewModel}
      period={period}
      onSelectAccount={onSelectAccount}
      onToggleFocus={onToggleFocus}
    />
  )
}

function HeaderActions() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <HeaderCalendar />
    </div>
  )
}

function SectionIntro({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-[2rem] border border-border bg-surface", className)}>
      <div className="space-y-4 px-6 py-5">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            {eyebrow}
          </p>
          <div className="max-w-3xl space-y-2">
            <h2 className="font-heading text-3xl font-bold tracking-[-0.03em] text-heading">
              {title}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-body">
              {description}
            </p>
          </div>
        </div>
        {children}
      </div>
    </section>
  )
}

function EditorialBusinessVariant({
  filterBar,
  viewModel,
  period,
  onSelectAccount,
  onToggleFocus,
}: DesktopVariantCoreProps) {
  const selectedRecommendation = viewModel.selectedAccount
    ? getCommercialRecommendation(viewModel.selectedAccount, period)
    : null

  return (
    <section className="w-full bg-canvas pb-10">
      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-6 px-6 py-6">
        <section className="overflow-hidden rounded-[2.5rem] border border-heading/10 bg-heading text-primary-fg">
          <div className="grid gap-8 px-8 py-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="max-w-3xl space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-fg/65">
                    CRM & Prospection
                  </p>
                  <div className="space-y-3">
                    <h1 className="font-heading text-5xl font-bold tracking-[-0.05em] text-primary-fg">
                      Synthese
                    </h1>
                    <p className="max-w-2xl text-sm leading-7 text-primary-fg/78">
                      Lecture editoriale du portefeuille pour arbitrer ou concentrer
                      l&apos;effort commercial sans rien changer aux donnees, aux actions
                      ni aux calculs.
                    </p>
                  </div>
                </div>
                <HeaderActions />
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4">
                {filterBar}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {viewModel.kpis.map((kpi) => (
                <EditorialFocusButton key={kpi.id} kpi={kpi} onToggleFocus={onToggleFocus} />
              ))}
            </div>
          </div>

          <div className="grid gap-px bg-white/10 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="bg-white/[0.04] px-8 py-5">
              <div className="flex flex-wrap items-end gap-6">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-fg/65">
                    Angle dominant
                  </p>
                  <p className="max-w-2xl font-heading text-3xl font-bold tracking-[-0.03em] text-primary-fg">
                    {viewModel.focusLabel ?? "Lecture globale"}
                  </p>
                </div>
                <p className="max-w-2xl text-sm leading-7 text-primary-fg/75">
                  {viewModel.summarySentence}
                </p>
              </div>
            </div>

            <div className="bg-brand-brass px-6 py-5 text-heading">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-heading/70">
                Decision recommande
              </p>
              <p className="mt-2 font-heading text-2xl font-bold tracking-[-0.03em] text-heading">
                {selectedRecommendation?.actionLabel ?? "Aucun arbitrage"}
              </p>
              <p className="mt-2 text-sm leading-6 text-heading/75">
                {selectedRecommendation?.dominantReason ?? "Aucun compte visible avec ce jeu de filtres."}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_22rem]">
          <div className="space-y-6">
            <SectionIntro
              eyebrow="Direction A"
              title="Lecture verticale et shortlist serree"
              description="Le coeur de page favorise le rythme: decider d&apos;abord, comparer ensuite, puis ouvrir l&apos;annexe portefeuille si besoin."
            >
              <WeeklyCommercialFocus
                showHeader={false}
                focusAccounts={viewModel.weeklyFocus}
                selectedAccountId={viewModel.selectedAccount?.id ?? null}
                onSelectAccount={onSelectAccount}
                trust={viewModel.trust}
              />
            </SectionIntro>

            <SectionIntro
              eyebrow="Couverture"
              title="Potentiel et reach sous la meme ligne de lecture"
              description="La matrice reste intacte, mais gagne un cadre plus calme et une mise en scene plus editoriale."
              className="bg-surface-raised"
            >
              <PotentialReachMatrix
                accounts={viewModel.visibleAccounts}
                period={period}
                selectedAccountId={viewModel.selectedAccount?.id ?? null}
                onSelectAccount={onSelectAccount}
                summarySentence={viewModel.summarySentence}
              />
            </SectionIntro>
          </div>

          <div className="space-y-6">
            <section className="sticky top-4 space-y-4">
              <SurfaceCard className="border-brand-brass/25 bg-brand-brass/[0.08] px-5 py-5">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brass">
                    Compte a arbitrer
                  </p>
                  <p className="font-heading text-2xl font-bold tracking-[-0.03em] text-heading">
                    {viewModel.selectedAccount?.name ?? "Aucun compte visible"}
                  </p>
                  <p className="text-sm leading-6 text-body">
                    Le panneau conserve toutes les actions existantes, mais devient une colonne de decision a part entiere.
                  </p>
                </div>
              </SurfaceCard>

              <SelectedAccountPanel
                account={viewModel.selectedAccount}
                period={period}
                trust={viewModel.trust}
              />
            </section>
          </div>
        </div>

        <SectionIntro
          eyebrow="Appendice"
          title="Portefeuille a activer"
          description="Vue exhaustive inchangée cote logique, placee en dernier pour garder la lecture prioritaire en amont."
        >
          <AccountsToActivateTable
            accounts={viewModel.visibleAccounts}
            period={period}
            selectedAccountId={viewModel.selectedAccount?.id ?? null}
            onSelectAccount={onSelectAccount}
          />
        </SectionIntro>
      </div>
    </section>
  )
}

function IntelligenceMapVariant({
  filterBar,
  viewModel,
  period,
  onSelectAccount,
  onToggleFocus,
}: DesktopVariantCoreProps) {
  const selectedAccount = viewModel.selectedAccount

  return (
    <section className="w-full bg-canvas pb-10">
      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-6 px-6 py-6">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-border bg-surface">
          <div className="pointer-events-none absolute left-[18%] right-[18%] top-[8.5rem] hidden border-t border-dashed border-primary/30 xl:block" />
          <div className="pointer-events-none absolute right-[22rem] top-[8.5rem] hidden h-[10rem] border-r border-dashed border-primary/30 xl:block" />

          <div className="space-y-6 px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-3xl space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  CRM & Prospection
                </p>
                <div className="space-y-2">
                  <h1 className="font-heading text-4xl font-bold tracking-[-0.04em] text-heading">
                    Synthese en carte d&apos;intelligence
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-body">
                    Les memes invariants fonctionnels sont re-agences comme un
                    ecosysteme de contexte, priorites et compte ancre.
                  </p>
                </div>
              </div>
              <HeaderActions />
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_22rem]">
              <MapNode
                eyebrow="Contexte"
                title="Vue d&apos;ensemble"
                description="Le filtre reste au centre de la lecture, sans devenir un bandeau administratif."
                className="xl:translate-y-6"
              >
                {filterBar}
              </MapNode>

              <MapNode
                eyebrow="Signaux"
                title={viewModel.focusLabel ?? "Carte des priorites"}
                description={viewModel.summarySentence}
                className="bg-surface-raised"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  {viewModel.kpis.map((kpi) => (
                    <MapFocusButton key={kpi.id} kpi={kpi} onToggleFocus={onToggleFocus} />
                  ))}
                </div>
              </MapNode>

              <MapNode
                eyebrow="Compte ancre"
                title={selectedAccount?.name ?? "Aucun compte"}
                description={selectedAccount
                  ? `${selectedAccount.sector} · ${selectedAccount.contactCount} contacts · ${selectedAccount.openOpportunityCount} opp. ouvertes`
                  : "Aucun compte visible avec ce jeu de filtres."}
                className="xl:translate-y-10"
              >
                <div className="flex flex-wrap gap-2">
                  <Badge variant="brand">{selectedAccount ? "Actif" : "Vide"}</Badge>
                  {selectedAccount ? <Badge variant="brass">Reach {selectedAccount.reachScore}/100</Badge> : null}
                  {selectedAccount ? <Badge variant="info">Potentiel {selectedAccount.potentialScore}/100</Badge> : null}
                </div>
              </MapNode>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_22rem]">
          <div className="space-y-6">
            <MapFrame
              eyebrow="Noeud A"
              title="Focus commercial"
              description="La shortlist reste lisible, mais devient un noeud actif dans un parcours plus organique."
            >
              <WeeklyCommercialFocus
                showHeader={false}
                focusAccounts={viewModel.weeklyFocus}
                selectedAccountId={viewModel.selectedAccount?.id ?? null}
                onSelectAccount={onSelectAccount}
                trust={viewModel.trust}
              />
            </MapFrame>

            <MapFrame
              eyebrow="Noeud B"
              title="Carte de couverture"
              description="Les comptes prioritaires sont relies a un espace de comparaison plus cartographique que tableau de bord."
            >
              <PotentialReachMatrix
                accounts={viewModel.visibleAccounts}
                period={period}
                selectedAccountId={viewModel.selectedAccount?.id ?? null}
                onSelectAccount={onSelectAccount}
                summarySentence={viewModel.summarySentence}
              />
            </MapFrame>
          </div>

          <div className="space-y-6">
            <MapFrame
              eyebrow="Noeud C"
              title="Compte selectionne"
              description="Le contexte detaille reste a droite comme point d&apos;ancrage."
            >
              <SelectedAccountPanel
                account={viewModel.selectedAccount}
                period={period}
                trust={viewModel.trust}
              />
            </MapFrame>

            <MapFrame
              eyebrow="Relais"
              title="Points de contexte"
              description="Quelques repères fixes pour lire la carte sans ajouter de nouvelle donnee."
              className="bg-surface-raised"
            >
              <div className="grid gap-3 md:grid-cols-2">
                {viewModel.kpis.map((kpi) => (
                  <SurfaceCard key={kpi.id} padding="compact" className="bg-canvas">
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                        {kpi.label}
                      </p>
                      <p className="font-heading text-3xl font-bold tracking-[-0.03em] text-heading">
                        {kpi.value}
                      </p>
                      <p className="text-xs leading-6 text-body">
                        {kpi.context}
                      </p>
                    </div>
                  </SurfaceCard>
                ))}
              </div>
            </MapFrame>
          </div>
        </div>

        <MapFrame
          eyebrow="Annexe navigable"
          title="Portefeuille a activer"
          description="Le tableau conserve la meme densite fonctionnelle, mais arrive en fin de chaine comme surface d&apos;exploration exhaustive."
        >
          <AccountsToActivateTable
            accounts={viewModel.visibleAccounts}
            period={period}
            selectedAccountId={viewModel.selectedAccount?.id ?? null}
            onSelectAccount={onSelectAccount}
          />
        </MapFrame>
      </div>
    </section>
  )
}

function ExecutiveControlRoomVariant({
  filterBar,
  viewModel,
  period,
  onSelectAccount,
  onToggleFocus,
}: DesktopVariantCoreProps) {
  const selectedAccount = viewModel.selectedAccount
  const selectedMetrics = selectedAccount ? getPortfolioPeriodMetrics(selectedAccount, period) : null
  const selectedRecommendation = selectedAccount
    ? getCommercialRecommendation(selectedAccount, period)
    : null

  return (
    <section className="w-full bg-canvas pb-10">
      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-6 px-6 py-6">
        <section className="overflow-hidden rounded-[2.25rem] border border-heading/12 bg-surface">
          <div className="border-b border-heading/10 bg-heading px-6 py-5 text-primary-fg">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-3xl space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-fg/65">
                  CRM & Prospection
                </p>
                <h1 className="font-heading text-4xl font-bold tracking-[-0.04em] text-primary-fg">
                  Executive Control Room
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-primary-fg/78">
                  Une synthese plus stricte, plus contrastee et plus immediate,
                  organisee par niveau de decision.
                </p>
              </div>
              <HeaderActions />
            </div>
          </div>

          <div className="grid gap-px bg-border xl:grid-cols-4">
            {viewModel.kpis.map((kpi) => (
              <ControlRoomFocusButton key={kpi.id} kpi={kpi} onToggleFocus={onToggleFocus} />
            ))}
          </div>

          <div className="px-6 py-5">
            {filterBar}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,1.08fr)_22rem]">
          <ControlRoomPanel
            eyebrow="Decision 01"
            title="Shortlist prioritaire"
            description="Lecture immediate des comptes qui justifient un arbitrage dans la periode active."
          >
            <WeeklyCommercialFocus
              showHeader={false}
              focusAccounts={viewModel.weeklyFocus}
              selectedAccountId={viewModel.selectedAccount?.id ?? null}
              onSelectAccount={onSelectAccount}
              trust={viewModel.trust}
            />
          </ControlRoomPanel>

          <ControlRoomPanel
            eyebrow="Decision 02"
            title="Lecture comparative"
            description="La matrice devient la salle d&apos;analyse: comparer vite, puis choisir le compte a ouvrir."
          >
            <PotentialReachMatrix
              accounts={viewModel.visibleAccounts}
              period={period}
              selectedAccountId={viewModel.selectedAccount?.id ?? null}
              onSelectAccount={onSelectAccount}
              summarySentence={viewModel.summarySentence}
            />
          </ControlRoomPanel>

          <div className="space-y-6">
            <ControlRoomPanel
              eyebrow="Decision 03"
              title={selectedAccount?.name ?? "Compte selectionne"}
              description="Resume decisionnel du compte actif et raccourcis existants."
              className="sticky top-4"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <CommandMetric label="Priorite action" value={selectedMetrics ? `${selectedMetrics.actionPriorityScore}/100` : "--"} />
                  <CommandMetric label="Momentum" value={selectedMetrics ? `${selectedMetrics.momentumScore}/100` : "--"} />
                  <CommandMetric label="Reach" value={selectedAccount ? `${selectedAccount.reachScore}/100` : "--"} />
                  <CommandMetric label="Pipeline" value={selectedAccount ? String(selectedAccount.openOpportunityCount) : "--"} />
                </div>

                <SurfaceCard padding="compact" className="bg-canvas">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Action recommande
                    </p>
                    <p className="font-semibold text-heading">
                      {selectedRecommendation?.actionLabel ?? "Aucune action"}
                    </p>
                    <p className="text-sm leading-6 text-body">
                      {selectedRecommendation?.dominantReason ?? "Aucun compte ne correspond aux filtres actifs."}
                    </p>
                  </div>
                </SurfaceCard>

                <SelectedAccountPanel
                  account={viewModel.selectedAccount}
                  period={period}
                  trust={viewModel.trust}
                />
              </div>
            </ControlRoomPanel>
          </div>
        </div>

        <ControlRoomPanel
          eyebrow="Niveau portefeuille"
          title="Portefeuille a activer"
          description="Surface exhaustive pour poursuivre l'analyse sans perdre la structure de decision au-dessus."
        >
          <AccountsToActivateTable
            accounts={viewModel.visibleAccounts}
            period={period}
            selectedAccountId={viewModel.selectedAccount?.id ?? null}
            onSelectAccount={onSelectAccount}
          />
        </ControlRoomPanel>
      </div>
    </section>
  )
}

function EditorialFocusButton({
  kpi,
  onToggleFocus,
}: {
  kpi: ProspectionSummaryKpi
  onToggleFocus: (focus: ProspectionSummaryFocusPreset) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={kpi.active}
      onClick={() => onToggleFocus(kpi.active ? "all" : kpi.id)}
      className={cn(
        "rounded-[1.75rem] border px-5 py-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        kpi.active
          ? "border-white/35 bg-white/14"
          : "border-white/12 bg-white/[0.05] hover:bg-white/[0.08]",
      )}
    >
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-fg/62">
          {kpi.label}
        </p>
        <p className="font-heading text-4xl font-bold tracking-[-0.04em] text-primary-fg">
          {kpi.value}
        </p>
        <p className="text-sm leading-6 text-primary-fg/76">
          {kpi.context}
        </p>
      </div>
    </button>
  )
}

function MapNode({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  className?: string
}) {
  return (
    <SurfaceCard className={cn("rounded-[2rem] border-primary/12 bg-canvas px-5 py-5", className)}>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
          <h2 className="font-heading text-2xl font-bold tracking-[-0.03em] text-heading">
            {title}
          </h2>
          <p className="text-sm leading-6 text-body">
            {description}
          </p>
        </div>
        {children}
      </div>
    </SurfaceCard>
  )
}

function MapFrame({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-[2rem] border border-border bg-surface px-6 py-5", className)}>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
          <h2 className="font-heading text-2xl font-bold tracking-[-0.03em] text-heading">
            {title}
          </h2>
          <p className="text-sm leading-6 text-body">
            {description}
          </p>
        </div>
        {children}
      </div>
    </section>
  )
}

function MapFocusButton({
  kpi,
  onToggleFocus,
}: {
  kpi: ProspectionSummaryKpi
  onToggleFocus: (focus: ProspectionSummaryFocusPreset) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={kpi.active}
      onClick={() => onToggleFocus(kpi.active ? "all" : kpi.id)}
      className={cn(
        "rounded-[1.5rem] border px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        kpi.active
          ? "border-primary/25 bg-primary/[0.08]"
          : "border-border bg-surface hover:bg-surface-hover",
      )}
    >
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          {kpi.label}
        </p>
        <p className="font-heading text-3xl font-bold tracking-[-0.03em] text-heading">
          {kpi.value}
        </p>
        <p className="text-xs leading-6 text-body">
          {kpi.context}
        </p>
      </div>
    </button>
  )
}

function ControlRoomPanel({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-[2rem] border border-border bg-surface px-5 py-5", className)}>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            {eyebrow}
          </p>
          <h2 className="font-heading text-2xl font-bold tracking-[-0.03em] text-heading">
            {title}
          </h2>
          <p className="text-sm leading-6 text-body">
            {description}
          </p>
        </div>
        {children}
      </div>
    </section>
  )
}

function ControlRoomFocusButton({
  kpi,
  onToggleFocus,
}: {
  kpi: ProspectionSummaryKpi
  onToggleFocus: (focus: ProspectionSummaryFocusPreset) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={kpi.active}
      onClick={() => onToggleFocus(kpi.active ? "all" : kpi.id)}
      className={cn(
        "bg-surface px-5 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        kpi.active ? "bg-brand-brass/[0.08]" : "hover:bg-surface-hover",
      )}
    >
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {kpi.label}
        </p>
        <div className="flex items-end justify-between gap-3">
          <p className="font-heading text-4xl font-bold tracking-[-0.04em] text-heading">
            {kpi.value}
          </p>
          <span className="text-xs text-body">{kpi.context}</span>
        </div>
      </div>
    </button>
  )
}

function CommandMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <SurfaceCard padding="compact" className="bg-canvas">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          {label}
        </p>
        <p className="font-heading text-2xl font-bold tracking-[-0.03em] text-heading">
          {value}
        </p>
      </div>
    </SurfaceCard>
  )
}

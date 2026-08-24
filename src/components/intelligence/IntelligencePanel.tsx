"use client"

import { usePathname } from "next/navigation"
import { useMemo, useState, useEffect } from "react"
import {
  resolveIntelligenceActions,
  resolveEntityActions,
  ENTITY_TYPE_LABELS,
  type IntelligenceEntityType,
} from "@/lib/intelligence/intelligence-registry"
import { useIntelligencePanel } from "@/hooks/use-intelligence-panel"
import { useIntelligenceContext } from "@/hooks/use-intelligence-context"
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse"
import { IntelligenceActionCard } from "./IntelligenceActionCard"
import { PanelActionsGrid } from "./PanelActionsGrid"
import { PanelResources } from "./PanelResources"
import { PanelActivity } from "./PanelActivity"
import { PanelKeyContacts } from "./PanelKeyContacts"
import { IconButton } from "@/components/ui/IconButton"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { PitchMailDrawerContent, SummaryDrawerContent } from "@/components/accounts-contacts/intelligence/IntelligenceActionDrawers"
import {
  IntelligenceActionResultContent,
  isDeterministicIntelligenceAction,
  type DeterministicIntelligenceActionId,
} from "./action-results/IntelligenceActionResultContent"
import {
  applyCommunicationEntryPoint,
  buildDefaultBrief,
} from "@/components/accounts-contacts/intelligence/communication-brief-options"
import { MissionComposerDesktop } from "@/features/intelligence-missions/components/MissionComposerDesktop"
import { MISSION_COMPOSER_ACTION_CONFIGS } from "@/features/intelligence-missions/components/mission-composer-model"

type AccountPanelAction = "pitch" | "summary" | string | null

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="h-px w-3 bg-brand-brass/60" aria-hidden />
      <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-brass">
        {title}
      </h3>
      {count !== undefined && (
        <span className="ml-auto rounded-full bg-primary-fg/10 px-1.5 py-px text-[10px] font-bold text-primary-fg/70">
          {count}
        </span>
      )}
    </div>
  )
}

function AccountPanelContent() {
  const { panelData, entityContext } = useIntelligenceContext()
  const [activeAction, setActiveAction] = useState<AccountPanelAction>(null)
  const accountPitchBrief = useMemo(() => {
    if (!panelData) return null
    const base = buildDefaultBrief(
      {
        company: {
          lifecycleStatus: panelData.company.lifecycleStatus,
          name: panelData.company.name,
        },
      },
      ""
    )

    return applyCommunicationEntryPoint(
      base,
      panelData.company.lifecycleStatus === "ancien_client" ? "former_client" : "account_row"
    )
  }, [panelData])

  if (!panelData || !entityContext) return null

  const { company, resources, sector, activity, contacts } = panelData
  const isMissionAction = activeAction !== null && activeAction in MISSION_COMPOSER_ACTION_CONFIGS

  if (activeAction === "pitch" || activeAction === "summary" || isMissionAction) {
    return (
      <>
        <button
          type="button"
          onClick={() => setActiveAction(null)}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-fg/60 transition-colors hover:text-primary-fg"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        {isMissionAction ? (
          <MissionComposerDesktop config={MISSION_COMPOSER_ACTION_CONFIGS[activeAction]} />
        ) : (
          <div data-theme="cockpit" className="rounded-lg border border-border bg-surface p-4">
            {activeAction === "pitch" ? (
              <PitchMailDrawerContent
                data={{ company: { id: company.id, name: company.name, lifecycleStatus: company.lifecycleStatus }, contacts }}
                initialBrief={accountPitchBrief ?? undefined}
              />
            ) : (
              <SummaryDrawerContent
                data={{ company: { id: company.id, name: company.name, lifecycleStatus: company.lifecycleStatus } }}
              />
            )}
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {/* Account badge */}
      <div className="kredo-account-badge rounded-lg p-3">
        <div className="relative z-10 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-primary-fg leading-tight">
              {company.name}
            </p>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-primary-fg/55">
              {company.sector && <span className="truncate">{company.sector}</span>}
              {company.sector && company.lifecycleStatus && <span className="shrink-0">·</span>}
              <span className="shrink-0 capitalize">{company.lifecycleStatus?.replace(/_/g, " ")}</span>
            </div>
          </div>
          <CompanyLogo
            name={company.name}
            logoPath={company.logoPath}
            website={company.website}
            size="lg"
            className="bg-white p-1 shrink-0"
          />
        </div>
      </div>

      {/* Section 1: Actions */}
      <section>
        <SectionHeading title="Actions" />
        <PanelActionsGrid
          sectorSlug={sector.hasStructuredSector ? sector.structuredSectorSlug : null}
          onActionClick={(actionId) => {
            if (actionId === "generate_pitch") setActiveAction("pitch")
            else if (actionId === "generate_report") setActiveAction("summary")
            else if (actionId in MISSION_COMPOSER_ACTION_CONFIGS) setActiveAction(actionId)
          }}
        />
      </section>

      {/* Section 2: Resources */}
      <section>
        <SectionHeading title="Ressources" />
        <PanelResources
          resources={resources}
          hasStructuredSector={sector.hasStructuredSector}
        />
      </section>

      {/* Section 3: Activity */}
      <section>
        <SectionHeading title="Activité" count={activity.length || undefined} />
        <PanelActivity activity={activity} />
      </section>

      {/* Section 4: Key Contacts */}
      <section>
        <SectionHeading title="Contacts clés" count={contacts.length || undefined} />
        <PanelKeyContacts contacts={contacts} />
      </section>
    </>
  )
}

function GenericEntityPanelContent() {
  const { entityContext } = useIntelligenceContext()
  const [activeActionId, setActiveActionId] = useState<DeterministicIntelligenceActionId | null>(null)
  const nonCompanyType: Exclude<IntelligenceEntityType, "company"> | null =
    entityContext && entityContext.entityType !== "company" ? entityContext.entityType : null

  const resolved = useMemo(
    () => (nonCompanyType ? resolveEntityActions(nonCompanyType) : null),
    [nonCompanyType],
  )

  if (!entityContext || !resolved || !nonCompanyType) return null

  if (activeActionId) {
    return (
      <>
        <button
          type="button"
          onClick={() => setActiveActionId(null)}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-fg/60 transition-colors hover:text-primary-fg"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        <div data-theme="cockpit" className="rounded-lg border border-border bg-surface p-4">
          <IntelligenceActionResultContent actionId={activeActionId} />
        </div>
      </>
    )
  }

  return (
    <>
      {/* Entity badge */}
      <div className="kredo-account-badge rounded-lg p-3">
        <div className="relative z-10 min-w-0">
          <p className="truncate text-xs font-bold text-primary-fg leading-tight">
            {entityContext.label}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-primary-fg/55">
            {ENTITY_TYPE_LABELS[nonCompanyType]}
          </p>
        </div>
      </div>

      {resolved.contextualActions.length > 0 && (
        <section>
          <SectionHeading title="Actions" />
          <div className="grid grid-cols-2 gap-2">
            {resolved.contextualActions.map((action) => (
              <IntelligenceActionCard
                key={action.id}
                action={action}
                tone="dark"
                onActionClick={(actionId) => {
                  if (isDeterministicIntelligenceAction(actionId)) setActiveActionId(actionId)
                }}
              />
            ))}
          </div>
        </section>
      )}

      {resolved.commonActions.length > 0 && (
        <details open className="group">
          <summary className="mb-2.5 flex cursor-pointer select-none list-none items-center gap-2 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="h-px w-3 bg-brand-brass/60" aria-hidden />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-brass">
              Plus d&apos;actions
            </h3>
            <span className="ml-auto text-[10px] text-primary-fg/40 transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="grid grid-cols-2 gap-2">
            {resolved.commonActions.map((action) => (
              <IntelligenceActionCard
                key={action.id}
                action={action}
                tone="dark"
                onActionClick={(actionId) => {
                  if (isDeterministicIntelligenceAction(actionId)) setActiveActionId(actionId)
                }}
              />
            ))}
          </div>
        </details>
      )}
    </>
  )
}

function RegistryPanelContent() {
  const pathname = usePathname()
  const [activeActionId, setActiveActionId] = useState<string | null>(null)
  const resolved = useMemo(() => resolveIntelligenceActions(pathname), [pathname])
  const isAvailableMissionAction = activeActionId !== null
    && activeActionId in MISSION_COMPOSER_ACTION_CONFIGS
    && resolved.contextualActions.some((action) => action.id === activeActionId)

  if (activeActionId && (isAvailableMissionAction || isDeterministicIntelligenceAction(activeActionId))) {
    return (
      <>
        <button
          type="button"
          onClick={() => setActiveActionId(null)}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-fg/60 transition-colors hover:text-primary-fg"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        {isAvailableMissionAction ? (
          <MissionComposerDesktop config={MISSION_COMPOSER_ACTION_CONFIGS[activeActionId]} />
        ) : isDeterministicIntelligenceAction(activeActionId) ? (
          <div data-theme="cockpit" className="rounded-lg border border-border bg-surface p-4">
            <IntelligenceActionResultContent actionId={activeActionId} />
          </div>
        ) : null}
      </>
    )
  }

  return (
    <>
      {resolved.contextualActions.length > 0 ? (
        <section>
          <SectionHeading title={resolved.label} />
          <div className="grid grid-cols-2 gap-2">
            {resolved.contextualActions.map((action) => (
              <IntelligenceActionCard
                key={action.id}
                action={action}
                tone="dark"
                onActionClick={(actionId) => {
                  if (actionId in MISSION_COMPOSER_ACTION_CONFIGS || isDeterministicIntelligenceAction(actionId)) {
                    setActiveActionId(actionId)
                  }
                }}
              />
            ))}
          </div>
        </section>
      ) : (
        <section>
          <SectionHeading title={resolved.label} />
          <p className="text-[11px] italic text-primary-fg/35">
            Aucune donnée à contextualiser sur cette page pour l&apos;instant.
          </p>
        </section>
      )}

      {resolved.commonActions.length > 0 && (
        <details open className="group">
          <summary className="mb-2.5 flex cursor-pointer select-none list-none items-center gap-2 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="h-px w-3 bg-brand-brass/60" aria-hidden />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-brass">
              Plus d&apos;actions
            </h3>
            <span className="ml-auto text-[10px] text-primary-fg/40 transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="grid grid-cols-2 gap-2">
            {resolved.commonActions.map((action) => (
              <IntelligenceActionCard
                key={action.id}
                action={action}
                tone="dark"
                onActionClick={(actionId) => {
                  if (isDeterministicIntelligenceAction(actionId)) setActiveActionId(actionId)
                }}
              />
            ))}
          </div>
        </details>
      )}

      <section>
        <SectionHeading title="Accès rapides" />
        <nav className="space-y-1">
          {[
            { href: "/intelligence", label: "Historique & résultats" },
            { href: "/reports", label: "Mes productions" },
            { href: "/veille", label: "Veille & Actualités" },
          ].map((link) => (
            <div
              key={link.href}
              className="flex items-center gap-2.5 rounded-md border border-primary-fg/8 bg-primary-fg/[0.03] px-3 py-2 text-xs text-primary-fg/40 cursor-default"
            >
              <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              <span className="font-medium">{link.label}</span>
              <span className="ml-auto shrink-0 rounded-full border border-primary-fg/12 bg-primary-fg/8 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-primary-fg/40">
                Bientôt
              </span>
            </div>
          ))}
        </nav>
      </section>
    </>
  )
}

export function IntelligencePanel() {
  const { isOpen, close } = useIntelligencePanel()
  const { entityContext } = useIntelligenceContext()
  const isAccountMode = entityContext?.entityType === "company"

  // Les deux rails (navigation à gauche, Cockpit Intelligence à droite) ne
  // peuvent pas être dépliés en même temps — maximise l'espace central.
  // La sidebar ne se redéplie à la fermeture que si elle l'était déjà avant.
  useEffect(() => {
    const store = useSidebarCollapse.getState()
    if (isOpen) {
      store.requestCollapse()
    } else {
      store.requestRestore()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <aside
      data-theme="cockpit"
      className="h-full w-[var(--layout-intelligence-width)] shrink-0 overflow-y-auto border-l border-primary-fg/10 bg-brand-primary kredo-intelligence-panel"
      aria-label="Cockpit Intelligence"
    >
      <div className="relative space-y-5 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <h2
              className="whitespace-nowrap text-[clamp(0.82rem,1.15vw,1rem)] font-bold uppercase tracking-[0.08em] leading-none"
              style={{ color: "var(--color-secondary)" }}
            >
              Cockpit intelligence
            </h2>
          </div>
          <IconButton
            aria-label="Fermer le cockpit intelligence"
            variant="ghost"
            size="sm"
            onClick={close}
            className="mt-0.5 shrink-0 border-transparent bg-transparent text-primary-fg/50 hover:bg-white/10 hover:text-primary-fg focus-visible:ring-white/40"
          >
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </IconButton>
        </div>

        {isAccountMode ? (
          <AccountPanelContent key={entityContext?.entityId} />
        ) : entityContext ? (
          <GenericEntityPanelContent key={`${entityContext.entityType}:${entityContext.entityId}`} />
        ) : (
          <RegistryPanelContent />
        )}
      </div>
    </aside>
  )
}

"use client"

import { usePathname } from "next/navigation"
import { useMemo, useState, useEffect, useCallback } from "react"
import {
  resolvePageCockpitConfig,
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
import { MATCHING_COMPOSER_ACTION_ID } from "@/lib/intelligence/matching-composer-action"
import { MatchingComposer } from "@/components/intelligence/matching/MatchingComposer"

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

function AccountPanelContent({
  activeAction,
  setActiveAction,
}: {
  activeAction: AccountPanelAction
  setActiveAction: (v: AccountPanelAction) => void
}) {
  const { panelData, entityContext } = useIntelligenceContext()
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

function GenericEntityPanelContent({
  activeActionId,
  setActiveActionId,
}: {
  activeActionId: string | null
  setActiveActionId: (v: string | null) => void
}) {
  const { entityContext } = useIntelligenceContext()
  const nonCompanyType: Exclude<IntelligenceEntityType, "company"> | null =
    entityContext && entityContext.entityType !== "company" ? entityContext.entityType : null

  const resolved = useMemo(
    () => (nonCompanyType ? resolveEntityActions(nonCompanyType) : null),
    [nonCompanyType],
  )

  if (!entityContext || !resolved || !nonCompanyType) return null

  if (activeActionId === MATCHING_COMPOSER_ACTION_ID) {
    return <MatchingComposer variant="desktop" onBack={() => setActiveActionId(null)} />
  }

  if (activeActionId && isDeterministicIntelligenceAction(activeActionId)) {
    return <IntelligenceActionResultContent actionId={activeActionId} />
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

      {resolved.actions.length > 0 && (
        <section>
          <SectionHeading title="Actions" />
          <div className="grid grid-cols-2 gap-2">
            {resolved.actions.map((action) => (
              <IntelligenceActionCard
                key={action.id}
                action={action}
                tone="dark"
                onActionClick={(actionId) => {
                  if (actionId === MATCHING_COMPOSER_ACTION_ID || isDeterministicIntelligenceAction(actionId)) {
                    setActiveActionId(actionId)
                  }
                }}
              />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function RegistryPanelContent({
  activeActionId,
  setActiveActionId,
}: {
  activeActionId: string | null
  setActiveActionId: (v: string | null) => void
}) {
  const pathname = usePathname()
  const resolved = useMemo(() => resolvePageCockpitConfig(pathname), [pathname])
  const isAvailableMissionAction = activeActionId !== null
    && activeActionId in MISSION_COMPOSER_ACTION_CONFIGS
    && resolved.actions.some((action) => action.id === activeActionId)

  if (activeActionId === MATCHING_COMPOSER_ACTION_ID) {
    return <MatchingComposer variant="desktop" onBack={() => setActiveActionId(null)} />
  }

  if (activeActionId && (isAvailableMissionAction || isDeterministicIntelligenceAction(activeActionId))) {
    return (
      <>
        {isAvailableMissionAction ? (
          <MissionComposerDesktop config={MISSION_COMPOSER_ACTION_CONFIGS[activeActionId]} />
        ) : isDeterministicIntelligenceAction(activeActionId) ? (
          <IntelligenceActionResultContent actionId={activeActionId} />
        ) : null}
      </>
    )
  }

  return (
    <>
      {resolved.actions.length > 0 ? (
        <section>
          <SectionHeading title={resolved.label} />
          <div className="grid grid-cols-2 gap-2">
            {resolved.actions.map((action) => (
              <IntelligenceActionCard
                key={action.id}
                action={action}
                tone="dark"
                onActionClick={(actionId) => {
                  if (
                    actionId === MATCHING_COMPOSER_ACTION_ID ||
                    actionId in MISSION_COMPOSER_ACTION_CONFIGS ||
                    isDeterministicIntelligenceAction(actionId)
                  ) {
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
  const pathname = usePathname()
  const isAccountMode = entityContext?.entityType === "company"

  // Active action states — remontés au niveau du shell pour piloter le header
  const [accountActiveAction, setAccountActiveAction] = useState<AccountPanelAction>(null)
  const [entityActiveActionId, setEntityActiveActionId] = useState<string | null>(null)
  const [registryActiveActionId, setRegistryActiveActionId] = useState<string | null>(null)

  const hasSecondaryScreen =
    (isAccountMode && accountActiveAction !== null) ||
    (!isAccountMode && entityContext != null && entityActiveActionId !== null) ||
    (!isAccountMode && entityContext == null && registryActiveActionId !== null)

  const handleRetour = useCallback(() => {
    if (isAccountMode) setAccountActiveAction(null)
    else if (entityContext) setEntityActiveActionId(null)
    else setRegistryActiveActionId(null)
  }, [isAccountMode, entityContext])

  // Label de la page courante (ligne 2 du header)
  const pageLabel = useMemo(() => {
    if (isAccountMode) return entityContext?.label ?? "Compte"
    if (entityContext) return ENTITY_TYPE_LABELS[entityContext.entityType as Exclude<IntelligenceEntityType, "company">] ?? "Entité"
    return resolvePageCockpitConfig(pathname).label
  }, [isAccountMode, entityContext, pathname])

  // Les deux rails ne peuvent pas être dépliés en même temps.
  useEffect(() => {
    const store = useSidebarCollapse.getState()
    if (isOpen) {
      store.requestCollapse()
    } else {
      store.requestRestore()
    }
  }, [isOpen])

  // Reset des écrans secondaires lors du changement d'entité
  useEffect(() => {
    setAccountActiveAction(null)
    setEntityActiveActionId(null)
    setRegistryActiveActionId(null)
  }, [entityContext?.entityId, entityContext?.entityType])

  if (!isOpen) return null

  return (
    <aside
      data-theme="cockpit"
      className="h-full w-[var(--layout-intelligence-width)] shrink-0 overflow-y-auto border-l border-primary-fg/10 bg-brand-primary kredo-intelligence-panel"
      aria-label="Cockpit Intelligence"
    >
      {/* ── Header 3 lignes ─────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-brand-primary px-5 pt-4 pb-3 border-b border-primary-fg/10">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Ligne 1 — eyebrow */}
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary-fg/50 leading-none">
                Cockpit Intelligence
              </p>
            </div>

            {/* Ligne 2 — titre page */}
            <p
              className="truncate text-[clamp(0.875rem,1.2vw,1.05rem)] font-bold leading-tight"
              style={{ color: "var(--color-secondary)" }}
            >
              {pageLabel}
            </p>

            {/* Ligne 3 — bouton Retour conditionnel */}
            {hasSecondaryScreen && (
              <button
                type="button"
                onClick={handleRetour}
                className="mt-2 inline-flex min-h-[2rem] items-center gap-1 text-[11px] font-semibold text-primary-fg/55 transition-colors hover:text-primary-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded"
                aria-label="Retour à la liste des actions"
              >
                <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Retour
              </button>
            )}
          </div>

          {/* Bouton fermeture X */}
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
      </div>

      {/* ── Contenu ────────────────────────────────────────────── */}
      <div className="space-y-5 p-5">
        {isAccountMode ? (
          <AccountPanelContent
            key={entityContext?.entityId}
            activeAction={accountActiveAction}
            setActiveAction={setAccountActiveAction}
          />
        ) : entityContext ? (
          <GenericEntityPanelContent
            key={`${entityContext.entityType}:${entityContext.entityId}`}
            activeActionId={entityActiveActionId}
            setActiveActionId={setEntityActiveActionId}
          />
        ) : (
          <RegistryPanelContent
            activeActionId={registryActiveActionId}
            setActiveActionId={setRegistryActiveActionId}
          />
        )}
      </div>
    </aside>
  )
}

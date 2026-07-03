"use client"

import { useState, useMemo } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  resolveIntelligenceActions,
  resolveEntityActions,
  ENTITY_TYPE_LABELS,
  type IntelligenceEntityType,
} from "@/lib/intelligence/intelligence-registry"
import { useIntelligenceContext } from "@/hooks/use-intelligence-context"
import { IntelligenceActionCard } from "./IntelligenceActionCard"
import { PanelActionsGrid } from "./PanelActionsGrid"
import { PanelResources } from "./PanelResources"
import { PanelActivity } from "./PanelActivity"
import { PanelKeyContacts } from "./PanelKeyContacts"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { PitchMailDrawerContent, SummaryDrawerContent } from "@/components/accounts-contacts/intelligence/IntelligenceActionDrawers"

type AccountPanelAction = "pitch" | "summary" | null

function SparkleIcon() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
      />
    </svg>
  )
}

function MobileSectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="h-px w-3 bg-primary" aria-hidden />
      <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
        {title}
      </h3>
      {count !== undefined && (
        <span className="ml-auto rounded-full bg-border px-1.5 py-px text-[10px] font-bold text-muted">
          {count}
        </span>
      )}
    </div>
  )
}

function AccountMobileContent() {
  const { panelData } = useIntelligenceContext()
  const [activeAction, setActiveAction] = useState<AccountPanelAction>(null)
  if (!panelData) return null

  const { company, resources, sector, activity, contacts } = panelData

  if (activeAction === "pitch" || activeAction === "summary") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setActiveAction(null)}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-body"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        <div data-theme="cockpit" className="rounded-lg border border-border bg-surface p-4">
          {activeAction === "pitch" ? (
            <PitchMailDrawerContent
              data={{ company: { id: company.id, name: company.name, lifecycleStatus: company.lifecycleStatus }, contacts }}
              variant="mobile"
            />
          ) : (
            <SummaryDrawerContent
              data={{ company: { id: company.id, name: company.name, lifecycleStatus: company.lifecycleStatus } }}
              variant="mobile"
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section>
        <MobileSectionHeading title="Actions" />
        <PanelActionsGrid
          sectorSlug={sector.hasStructuredSector ? sector.structuredSectorSlug : null}
          onActionClick={(actionId) => {
            if (actionId === "generate_pitch") setActiveAction("pitch")
            if (actionId === "generate_report") setActiveAction("summary")
          }}
          tone="light"
        />
      </section>

      <section>
        <MobileSectionHeading title="Ressources" />
        <PanelResources resources={resources} hasStructuredSector={sector.hasStructuredSector} tone="light" />
      </section>

      {activity.length > 0 && (
        <section>
          <MobileSectionHeading title="Activité" count={activity.length} />
          <PanelActivity activity={activity} tone="light" />
        </section>
      )}

      {contacts.length > 0 && (
        <section>
          <MobileSectionHeading title="Contacts clés" count={contacts.length} />
          <PanelKeyContacts contacts={contacts} tone="light" />
        </section>
      )}
    </div>
  )
}

function GenericEntityMobileContent() {
  const { entityContext } = useIntelligenceContext()
  const nonCompanyType: Exclude<IntelligenceEntityType, "company"> | null =
    entityContext && entityContext.entityType !== "company" ? entityContext.entityType : null

  const resolved = useMemo(
    () => (nonCompanyType ? resolveEntityActions(nonCompanyType) : null),
    [nonCompanyType],
  )

  if (!entityContext || !resolved || !nonCompanyType) return null

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-3">
        <p className="truncate text-xs font-bold text-heading leading-tight">
          {entityContext.label}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted">
          {ENTITY_TYPE_LABELS[nonCompanyType]}
        </p>
      </div>

      {resolved.contextualActions.length > 0 && (
        <section>
          <MobileSectionHeading title="Actions" />
          <div className="grid grid-cols-2 gap-2">
            {resolved.contextualActions.map((action) => (
              <IntelligenceActionCard key={action.id} action={action} tone="light" />
            ))}
          </div>
        </section>
      )}

      {resolved.commonActions.length > 0 && (
        <details className="group">
          <summary className="mb-2.5 flex cursor-pointer select-none list-none items-center gap-2 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="h-px w-3 bg-primary" aria-hidden />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Plus d&apos;actions
            </h3>
            <span className="ml-auto text-[10px] text-muted/60 transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="grid grid-cols-2 gap-2">
            {resolved.commonActions.map((action) => (
              <IntelligenceActionCard key={action.id} action={action} tone="light" />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function RegistryMobileContent() {
  const pathname = usePathname()
  const resolved = useMemo(() => resolveIntelligenceActions(pathname), [pathname])

  return (
    <div className="space-y-6">
      {resolved.contextualActions.length > 0 ? (
        <section>
          <MobileSectionHeading title={resolved.label} />
          <div className="grid grid-cols-2 gap-2">
            {resolved.contextualActions.map((action) => (
              <IntelligenceActionCard key={action.id} action={action} tone="light" />
            ))}
          </div>
        </section>
      ) : (
        <section>
          <MobileSectionHeading title={resolved.label} />
          <p className="text-[11px] italic text-muted">
            Aucune donnée à contextualiser sur cette page pour l&apos;instant.
          </p>
        </section>
      )}

      {resolved.commonActions.length > 0 && (
        <details className="group">
          <summary className="mb-2.5 flex cursor-pointer select-none list-none items-center gap-2 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="h-px w-3 bg-primary" aria-hidden />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Plus d&apos;actions
            </h3>
            <span className="ml-auto text-[10px] text-muted/60 transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="grid grid-cols-2 gap-2">
            {resolved.commonActions.map((action) => (
              <IntelligenceActionCard key={action.id} action={action} tone="light" />
            ))}
          </div>
        </details>
      )}

      <div className="pt-2 border-t border-border text-center">
        <p className="text-[10px] text-muted leading-relaxed">
          Propulsé par n8n + IA
        </p>
      </div>
    </div>
  )
}

export function IntelligenceFAB() {
  const [isOpen, setIsOpen] = useState(false)
  const { entityContext, panelData } = useIntelligenceContext()
  const isAccountMode = entityContext?.entityType === "company" && panelData !== null
  const isGenericEntityMode = !!entityContext && entityContext.entityType !== "company"
  const hasEntityFocus = isAccountMode || isGenericEntityMode

  const eyebrow = isAccountMode
    ? panelData.company.name
    : isGenericEntityMode
      ? entityContext.label
      : undefined

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir le cockpit intelligence"
        className={cn(
          "fixed z-[var(--z-fab)] right-4 bottom-[calc(var(--layout-bottom-nav-height)+var(--safe-area-bottom)+0.75rem)] inline-flex size-14 items-center justify-center rounded-full shadow-[0_2px_12px_rgba(37,84,184,0.35)] transition-transform active:scale-90",
          hasEntityFocus
            ? "kredo-fab-cockpit-active bg-brand-brass text-secondary-fg"
            : "bg-primary text-primary-fg",
        )}
      >
        <SparkleIcon />
      </button>

      <AppDrawer
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Cockpit Intelligence"
        side="bottom"
        eyebrow={eyebrow}
        icon={
          <span className="inline-flex size-5 items-center justify-center text-primary">
            <SparkleIcon />
          </span>
        }
      >
        {isAccountMode ? (
          <AccountMobileContent key={`${entityContext?.entityId}-${isOpen}`} />
        ) : isGenericEntityMode ? (
          <GenericEntityMobileContent key={`${entityContext.entityType}:${entityContext.entityId}-${isOpen}`} />
        ) : (
          <RegistryMobileContent />
        )}
      </AppDrawer>
    </>
  )
}

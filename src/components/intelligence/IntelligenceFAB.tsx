"use client"

import { useState, useMemo } from "react"
import { usePathname } from "next/navigation"
import { resolveIntelligenceActions } from "@/lib/intelligence/intelligence-registry"
import { useIntelligenceContext } from "@/hooks/use-intelligence-context"
import { IntelligenceActionCard } from "./IntelligenceActionCard"
import { PanelActionsGrid } from "./PanelActionsGrid"
import { PanelResources } from "./PanelResources"
import { PanelActivity } from "./PanelActivity"
import { PanelKeyContacts } from "./PanelKeyContacts"
import { AppDrawer } from "@/components/ui/AppDrawer"

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
  if (!panelData) return null

  const { resources, sector, activity, contacts } = panelData

  return (
    <div className="space-y-6">
      <section>
        <MobileSectionHeading title="Actions" />
        <PanelActionsGrid
          sectorSlug={sector.hasStructuredSector ? sector.structuredSectorSlug : null}
        />
      </section>

      <section>
        <MobileSectionHeading title="Ressources" />
        <PanelResources resources={resources} hasStructuredSector={sector.hasStructuredSector} />
      </section>

      {activity.length > 0 && (
        <section>
          <MobileSectionHeading title="Activité" count={activity.length} />
          <PanelActivity activity={activity} />
        </section>
      )}

      {contacts.length > 0 && (
        <section>
          <MobileSectionHeading title="Contacts clés" count={contacts.length} />
          <PanelKeyContacts contacts={contacts} />
        </section>
      )}
    </div>
  )
}

function RegistryMobileContent() {
  const pathname = usePathname()
  const resolved = useMemo(() => resolveIntelligenceActions(pathname), [pathname])

  return (
    <div className="space-y-6">
      {resolved.contextualActions.length > 0 && (
        <section>
          <MobileSectionHeading title={`Contexte : ${resolved.label}`} />
          <div className="grid grid-cols-2 gap-2">
            {resolved.contextualActions.map((action) => (
              <IntelligenceActionCard key={action.id} action={action} tone="light" />
            ))}
          </div>
        </section>
      )}

      {resolved.commonActions.length > 0 && (
        <section>
          <MobileSectionHeading title="Socle commun" />
          <div className="grid grid-cols-2 gap-2">
            {resolved.commonActions.map((action) => (
              <IntelligenceActionCard key={action.id} action={action} tone="light" />
            ))}
          </div>
        </section>
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

  const eyebrow = isAccountMode ? panelData.company.name : undefined

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir le cockpit intelligence"
        className="fixed z-[var(--z-fab)] right-4 bottom-[calc(var(--layout-bottom-nav-height)+var(--safe-area-bottom)+0.75rem)] inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-fg shadow-[0_2px_12px_rgba(37,84,184,0.35)] transition-transform active:scale-90"
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
        {isAccountMode ? <AccountMobileContent /> : <RegistryMobileContent />}
      </AppDrawer>
    </>
  )
}

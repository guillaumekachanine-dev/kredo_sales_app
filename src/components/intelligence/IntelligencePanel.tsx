"use client"

import { usePathname } from "next/navigation"
import { useMemo } from "react"
import { resolveIntelligenceActions } from "@/lib/intelligence/intelligence-registry"
import { useIntelligencePanel } from "@/hooks/use-intelligence-panel"
import { useIntelligenceContext } from "@/hooks/use-intelligence-context"
import { IntelligenceActionCard } from "./IntelligenceActionCard"
import { PanelActionsGrid } from "./PanelActionsGrid"
import { PanelResources } from "./PanelResources"
import { PanelActivity } from "./PanelActivity"
import { PanelKeyContacts } from "./PanelKeyContacts"
import { IconButton } from "@/components/ui/IconButton"

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

  if (!panelData || !entityContext) return null

  const { company, resources, sector, activity, contacts } = panelData

  return (
    <>
      {/* Account badge */}
      <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.05] p-3">
        <p className="text-xs font-bold text-primary-fg leading-tight">
          {company.name}
        </p>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-primary-fg/50">
          {company.sector && <span>{company.sector}</span>}
          {company.sector && company.lifecycleStatus && <span>·</span>}
          <span className="capitalize">{company.lifecycleStatus?.replace(/_/g, " ")}</span>
        </div>
      </div>

      {/* Section 1: Actions */}
      <section>
        <SectionHeading title="Actions" />
        <PanelActionsGrid
          sectorSlug={sector.hasStructuredSector ? sector.structuredSectorSlug : null}
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

function RegistryPanelContent() {
  const pathname = usePathname()
  const resolved = useMemo(() => resolveIntelligenceActions(pathname), [pathname])

  return (
    <>
      {resolved.contextualActions.length > 0 && (
        <section>
          <SectionHeading title={`Contexte : ${resolved.label}`} />
          <div className="grid grid-cols-2 gap-2">
            {resolved.contextualActions.map((action) => (
              <IntelligenceActionCard key={action.id} action={action} tone="dark" />
            ))}
          </div>
        </section>
      )}

      {resolved.commonActions.length > 0 && (
        <section>
          <SectionHeading title="Socle commun" />
          <div className="grid grid-cols-2 gap-2">
            {resolved.commonActions.map((action) => (
              <IntelligenceActionCard key={action.id} action={action} tone="dark" />
            ))}
          </div>
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
  const isAccountMode = entityContext?.entityType === "company"

  if (!isOpen) return null

  return (
    <aside
      className="h-full w-[var(--layout-intelligence-width)] shrink-0 overflow-y-auto border-l border-primary-fg/10 bg-rail kredo-intelligence-panel"
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

        {isAccountMode ? <AccountPanelContent /> : <RegistryPanelContent />}

        {/* Footer */}
        <div className="pt-2 border-t border-primary-fg/8 text-center">
          <p className="text-[10px] text-primary-fg/30 leading-relaxed">
            Propulsé par n8n + IA
          </p>
        </div>
      </div>
    </aside>
  )
}

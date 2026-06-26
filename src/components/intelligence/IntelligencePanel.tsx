"use client"

import { usePathname } from "next/navigation"
import { useMemo } from "react"
import { resolveIntelligenceActions } from "@/lib/intelligence/intelligence-registry"
import { useIntelligencePanel } from "@/hooks/use-intelligence-panel"
import { IntelligenceActionCard } from "./IntelligenceActionCard"
import { IconButton } from "@/components/ui/IconButton"

const INLINE_INTELLIGENCE_ROUTES = ["/prospection/accounts/"]

function hasInlineIntelligence(pathname: string): boolean {
  return INLINE_INTELLIGENCE_ROUTES.some((r) => pathname.startsWith(r) && pathname !== r)
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="h-px w-3 bg-brand-brass/60" aria-hidden />
      <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-brass">
        {title}
      </h3>
    </div>
  )
}

export function IntelligencePanel() {
  const pathname = usePathname()
  const { isOpen, close } = useIntelligencePanel()
  const resolved = useMemo(() => resolveIntelligenceActions(pathname), [pathname])
  const isInlinePage = hasInlineIntelligence(pathname)

  if (!isOpen) return null

  return (
    <aside
      className="h-full w-[var(--layout-intelligence-width)] shrink-0 overflow-y-auto border-l border-primary-fg/10 bg-rail kredo-intelligence-panel"
      aria-label="Cockpit Intelligence"
    >
      <div className="relative space-y-5 p-5">
        {/* Header — titre grand en or, sans pastille */}
        <div className="flex items-start justify-between gap-2">
          <h2
            className="max-w-full whitespace-nowrap text-[clamp(0.82rem,1.15vw,1rem)] font-bold uppercase tracking-[0.08em] leading-none"
            style={{ color: "var(--color-secondary)" }}
          >
            Cockpit intelligence
          </h2>
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

        {/* Inline intelligence notice */}
        {isInlinePage ? (
          <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-4 text-center">
            <p className="text-xs font-medium text-primary-fg/70 leading-relaxed">
              Le cockpit intelligence est intégré directement dans cette page.
            </p>
            <button
              type="button"
              onClick={close}
              className="mt-3 inline-flex items-center gap-1.5 rounded border border-primary-fg/15 bg-primary-fg/[0.06] px-3 py-1.5 text-[11px] font-semibold text-primary-fg/80 transition-colors hover:bg-primary-fg/[0.10]"
            >
              Fermer le panneau
            </button>
          </div>
        ) : (
          <>
            {/* Contextual actions */}
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

            {/* Common actions */}
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
          </>
        )}

        {/* Quick links */}
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

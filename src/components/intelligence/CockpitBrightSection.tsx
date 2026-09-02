"use client"

import type { ReactNode } from "react"

/**
 * Surface claire encastrée dans le panneau Cockpit (thème sombre).
 *
 * Markup extrait tel quel de `IntelligenceActionResultContent` : c'est le
 * conteneur validé du Golden Master pour afficher du contenu clair et dense
 * dans le panneau. Il est partagé plutôt que recopié — toute divergence de
 * gabarit entre deux résultats serait une divergence de design.
 */
export function CockpitBrightSection({ children }: { children: ReactNode }) {
  return (
    <section
      data-theme="edito-bright-cockpit"
      className="overflow-hidden bg-edito-surface text-edito-body [container-type:inline-size] max-md:ml-[-1.3125rem] max-md:w-[calc(100vw_-_4rem)]"
    >
      {children}
    </section>
  )
}

export function CockpitBrightHeader({
  title,
  kicker,
  onBack,
}: {
  title: string
  /** Deux lignes courtes affichées dans le bandeau de droite. */
  kicker: [string, string]
  onBack?: () => void
}) {
  return (
    <header className="relative isolate grid grid-cols-[minmax(0,1fr)_clamp(5rem,24cqi,6.5rem)] overflow-hidden bg-edito-navy text-white">
      <div className="flex min-w-0 items-center px-5 py-4 pr-8">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="group -ml-1 inline-flex min-h-[2.5rem] items-center gap-2 rounded p-1 text-left text-white transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cockpit-amber cursor-pointer"
            aria-label={`Retour depuis ${title}`}
          >
            <svg className="size-3 shrink-0 fill-white" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 19.5V4.5L5 12z" />
            </svg>
            <h3 className="font-heading text-[clamp(1rem,4.5cqi,1.4rem)] font-black leading-[1.1] tracking-[-0.02em] text-white [overflow-wrap:anywhere]">
              {title}
            </h3>
          </button>
        ) : (
          <h3 className="font-heading text-[clamp(1rem,4.5cqi,1.4rem)] font-black leading-[1.1] tracking-[-0.02em] text-white [overflow-wrap:anywhere]">
            {title}
          </h3>
        )}
      </div>

      <div className="flex items-center justify-center bg-brand-primary-deep px-3 py-4">
        <p className="flex flex-col text-[clamp(0.5rem,2.2cqi,0.62rem)] font-black uppercase leading-[1.5] tracking-[0.13em] text-white/80">
          <span className="whitespace-nowrap">{kicker[0]}</span>
          <span className="whitespace-nowrap">{kicker[1]}</span>
        </p>
      </div>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-3 -top-3 right-[clamp(5rem,24cqi,6.5rem)] z-10 w-2.5 origin-center -skew-x-[14deg] bg-edito-navy"
      />
    </header>
  )
}

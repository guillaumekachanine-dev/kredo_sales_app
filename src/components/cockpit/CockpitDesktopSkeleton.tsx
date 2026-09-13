import "./cockpit-desktop.css"

// Squelette du Cockpit Desktop (page d'accueil `/cockpit`).
//
// Audit d'ouverture des pages (O-3) : le cockpit est SOMBRE (tokens redéfinis par
// `.kredo-cockpit-desktop`), ses deux squelettes précédents étaient clairs — la
// page d'accueil clignotait clair → sombre à chaque ouverture. Ce squelette
// réutilise les classes de mise en page de la page elle-même : même fond, même
// grille, mêmes chapitres statiques.

const CHAPTERS: Array<[string, string]> = [
  ["Diagnostic", "Lecture consolidée"],
  ["Activation", "Comptes à animer"],
  ["Trajectoire", "Horizon 90 jours"],
  ["Échéances", "Cadence à venir"],
]

function Bar({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded bg-surface-hover ${className}`} />
}

export function CockpitDesktopSkeleton() {
  return (
    <section className="kredo-cockpit-desktop" role="status" aria-busy="true" aria-label="Chargement du cockpit">
      <div className="kredo-cockpit-desktop__frame animate-pulse motion-reduce:animate-none">
        <header className="kredo-cockpit-desktop__header">
          <div className="min-w-0 space-y-3">
            <Bar className="h-3 w-32" />
            <h1 className="text-[30px] font-semibold leading-none tracking-[-0.02em] text-heading">Cockpit</h1>
            <Bar className="h-3.5 w-72" />
          </div>
          <div className="flex flex-col items-end gap-3">
            <Bar className="h-6 w-40 rounded-full" />
            <Bar className="h-9 w-56" />
          </div>
        </header>

        <nav className="kredo-cockpit-desktop__chapter-rail" aria-hidden="true">
          {CHAPTERS.map(([label, detail], index) => (
            <div className="kredo-cockpit-desktop__chapter" data-active={index === 0 || undefined} key={label}>
              <span className="kredo-cockpit-desktop__chapter-notch" aria-hidden="true" />
              <p>{label}</p>
              <span>{detail}</span>
            </div>
          ))}
        </nav>

        <div className="kredo-cockpit-desktop__kpi-strip" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="kredo-cockpit-desktop__kpi-card">
              <Bar className="h-3 w-24" />
              <Bar className="mt-4 h-7 w-28" />
            </div>
          ))}
        </div>

        <div className="kredo-cockpit-desktop__primary-grid" aria-hidden="true">
          <div className="kredo-cockpit-desktop__panel h-[340px]" />
          <div className="kredo-cockpit-desktop__panel h-[340px]" />
        </div>

        <div className="kredo-cockpit-desktop__secondary-grid" aria-hidden="true">
          <div className="kredo-cockpit-desktop__panel h-[280px]" />
          <div className="kredo-cockpit-desktop__panel h-[280px]" />
        </div>
      </div>
    </section>
  )
}

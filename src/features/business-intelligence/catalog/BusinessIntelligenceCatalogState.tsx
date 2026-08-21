import Link from "next/link"
import type { BusinessIntelligenceCatalog } from "../data/business-intelligence-workspace-types"

const RESOURCE_LABELS = {
  study: "Étude",
  playbook: "Playbook",
  competitiveMap: "Concurrence",
  valueChain: "Chaîne de valeur",
  regulatory: "Réglementation",
  news: "Actualités",
} as const

type CatalogStateProps = {
  catalog: BusinessIntelligenceCatalog
  issue?: "unknown_segment" | "macro_not_allowed" | "malformed_segment" | null
}

const ISSUE_MESSAGES: Record<NonNullable<CatalogStateProps["issue"]>, string> = {
  unknown_segment: "Le segment demandé n’existe pas ou n’est pas accessible.",
  macro_not_allowed: "Sélectionnez un segment métier : un macro-secteur ne peut pas devenir le contexte actif.",
  malformed_segment: "L’identifiant de segment fourni n’est pas valide.",
}

export function BusinessIntelligenceCatalogState({ catalog, issue = null }: CatalogStateProps) {
  return (
    <main className="min-h-screen bg-canvas px-4 py-8 text-body lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Business Intelligence</p>
          <h1 className="mt-2 text-2xl font-bold text-heading">Choisir un segment de marché</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">Le segment sélectionné pilotera l’ensemble du workspace.</p>
        </header>

        {issue ? <p role="alert" className="mb-5 rounded-xl border border-border bg-surface p-4 text-sm text-body">{ISSUE_MESSAGES[issue]}</p> : null}
        {catalog.state === "error" ? <p role="alert" className="rounded-xl border border-border bg-surface p-5 text-sm text-body">{catalog.error}</p> : null}
        {catalog.state === "empty" ? <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">Aucun segment n’est disponible.</p> : null}

        {catalog.state === "ready" ? (
          <div className="grid gap-4 md:grid-cols-2">
            {catalog.macros.map((macro) => (
              <section key={macro.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-heading">{macro.name}</h2>
                    <p className="mt-1 text-xs text-muted">{macro.segments.length} segments · {macro.accountCount} comptes</p>
                  </div>
                </div>
                <ul className="mt-4 divide-y divide-border">
                  {macro.segments.map((segment) => (
                    <li key={segment.id} className="py-3">
                      <Link className="block rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href={`/intelligence?segment=${encodeURIComponent(segment.id)}`}>
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-body">{segment.name}</span>
                          <span className="text-xs text-muted">{segment.accountCount} comptes</span>
                        </span>
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          {Object.entries(segment.coverage).map(([key, value]) => (
                            <span key={key} className={`rounded-full border px-2 py-0.5 text-[10px] ${value.available ? "border-primary/30 text-primary" : "border-border text-muted"}`}>
                              {RESOURCE_LABELS[key as keyof typeof RESOURCE_LABELS]}
                            </span>
                          ))}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  )
}

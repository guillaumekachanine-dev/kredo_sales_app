import { WorkspaceDesktopSkeleton } from "@/components/layout/loading/WorkspaceSkeleton"

export function BusinessIntelligenceLoadingDesktop({ mode = "workspace" }: { mode?: "catalog" | "workspace" }) {
  // Workspace : même anatomie que `BusinessIntelligenceDesktop` (rail BI à 6
  // chapitres + header + corps), dans son thème — audit d'ouverture des pages, O-3.
  if (mode === "workspace") {
    return (
      <div data-theme="edito-bright-cockpit" className="flex h-full min-h-0 flex-1">
        <WorkspaceDesktopSkeleton
          title="Business Intelligence"
          chapters={6}
          modules={2}
          body="reading"
          label="Chargement du workspace"
        />
      </div>
    )
  }

  return <main className="min-h-screen bg-edito-canvas px-8 py-8" aria-label="Chargement du catalogue"><div className="mx-auto max-w-6xl space-y-5"><div className="h-7 w-72 animate-pulse rounded bg-edito-chip" /><div className="h-16 animate-pulse rounded-xl bg-edito-surface" /><div className="h-16 animate-pulse bg-edito-surface" /><div className="h-36 animate-pulse bg-edito-surface" /><div className="h-16 animate-pulse bg-edito-surface" /></div></main>
}

export function BusinessIntelligenceLoadingMobile({ mode = "workspace" }: { mode?: "catalog" | "workspace" }) {
  return <main className="min-h-dvh bg-canvas px-4 py-5" aria-label={`Chargement du ${mode === "catalog" ? "catalogue" : "workspace"}`}><div className="h-7 w-52 animate-pulse rounded bg-surface" /><div className="mt-5 h-20 animate-pulse bg-surface" /><div className="mt-4 space-y-2">{Array.from({ length: mode === "catalog" ? 5 : 3 }, (_, index) => <div key={index} className="h-14 animate-pulse border-y border-border bg-surface/45" />)}</div></main>
}

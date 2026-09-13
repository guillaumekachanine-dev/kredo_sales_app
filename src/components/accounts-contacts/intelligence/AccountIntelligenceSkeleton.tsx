import {
  MobileWorkspaceSkeleton,
  SkeletonBar,
  WorkspaceRailSkeleton,
} from "@/components/layout/loading/WorkspaceSkeleton"

// Squelette unique du cockpit Account Intelligence.
//
// Audit d'ouverture des pages (O-3) : trois dessins différents existaient pour le
// même écran — `[companyId]/loading.tsx` (ancien cockpit cobalt+or, 6 onglets
// horizontaux), le `LoadingShell` de `CrmEntityPanel` et le `loading` des chunks
// dynamiques. Ils sont remplacés par celui-ci, calqué sur
// `ClientIntelligenceDesktopView` : thème `edito-bright-cockpit`, rail
// « Account Intelligence » (accueil + 5 étapes), header signature, colonne 6xl.

export function AccountIntelligenceDesktopSkeleton() {
  return (
    <div
      data-theme="edito-bright-cockpit"
      role="status"
      aria-busy="true"
      aria-label="Chargement de l'intelligence compte…"
      className="edito-bright-page flex h-full min-h-0 w-full overflow-hidden bg-canvas"
    >
      <WorkspaceRailSkeleton title="Account Intelligence" chapters={6} modules={2} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div
          aria-hidden="true"
          className="flex min-h-[88px] shrink-0 items-center gap-4 border-b border-border bg-surface px-6 py-4 animate-pulse motion-reduce:animate-none"
        >
          <SkeletonBar className="size-12 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBar className="h-3 w-40" />
            <SkeletonBar className="h-6 w-72" />
          </div>
          <SkeletonBar className="h-8 w-28" />
        </div>

        <div
          aria-hidden="true"
          className="min-h-0 flex-1 overflow-hidden bg-canvas px-6 pb-8 animate-pulse motion-reduce:animate-none"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pt-6">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="h-24 rounded-lg border border-border bg-surface" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="flex flex-col gap-5">
                <div className="h-56 rounded-lg border border-border bg-surface" />
                <div className="h-40 rounded-lg border border-border bg-surface" />
              </div>
              <div className="flex flex-col gap-5">
                <div className="h-44 rounded-lg border border-border bg-surface" />
                <div className="h-32 rounded-lg border border-border bg-surface" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AccountIntelligenceMobileSkeleton() {
  return (
    <MobileWorkspaceSkeleton
      theme="edito-bright-cockpit"
      label="Chargement de l'intelligence compte…"
      cards={4}
    />
  )
}

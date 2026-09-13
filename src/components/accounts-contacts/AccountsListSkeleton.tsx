import { MobileWorkspaceSkeleton, SkeletonBar } from "@/components/layout/loading/WorkspaceSkeleton"

// Squelette de l'accueil Comptes & Contacts, calqué sur `ProspectionAccountsView` :
// colonne 7xl, titre + actions, barre de recherche/filtres, tableau groupé par secteur.
// (Audit d'ouverture des pages, O-3 — l'ancien squelette dessinait 5 KPI absents
// de la page.)

export function AccountsListDesktopSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement des comptes…"
      className="mx-auto flex w-full max-w-7xl flex-col gap-5 bg-canvas px-6 py-6 animate-pulse motion-reduce:animate-none"
    >
      <div className="flex items-start justify-between gap-4" aria-hidden="true">
        <SkeletonBar className="h-9 w-72" />
        <div className="flex items-center gap-2">
          <SkeletonBar className="h-8 w-24" />
          <SkeletonBar className="h-8 w-24" />
          <SkeletonBar className="h-8 w-24" />
        </div>
      </div>

      <div className="flex items-center gap-3" aria-hidden="true">
        <SkeletonBar className="h-9 w-80" />
        <SkeletonBar className="h-9 w-28" />
        <SkeletonBar className="h-9 w-28" />
        <SkeletonBar className="h-9 w-28" />
      </div>

      <div className="overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface" aria-hidden="true">
        <div className="h-10 border-b border-border bg-canvas/50" />
        {Array.from({ length: 3 }, (_, group) => (
          <div key={group}>
            <div className="h-9 border-y border-border/80 bg-surface-hover" />
            {Array.from({ length: 4 }, (_, row) => (
              <div key={row} className="flex items-center gap-4 border-b border-border/50 px-5 py-3">
                <SkeletonBar className="size-8 shrink-0 rounded-full" />
                <SkeletonBar className="h-3.5 w-[18%]" />
                <SkeletonBar className="h-3 w-[16%]" />
                <SkeletonBar className="h-3 w-[10%]" />
                <SkeletonBar className="ml-auto h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function AccountsListMobileSkeleton() {
  return <MobileWorkspaceSkeleton label="Chargement des comptes…" />
}

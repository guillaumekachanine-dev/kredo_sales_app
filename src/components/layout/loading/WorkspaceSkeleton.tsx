import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
//  Squelettes de chargement des workspaces — source unique.
//  (audit d'ouverture des pages, O-2 / O-3 — docs/audits/AUDIT-OUVERTURE-DES-PAGES.md)
//
//  Tous les workspaces Desktop de KREDO partagent la même anatomie SHELL-0018 V2 :
//  rail secondaire `SectionRail` (13rem, fond edito) + header de chapitre 76 px +
//  corps. Un squelette qui reprend cette anatomie ne peut pas « ressembler à une
//  ancienne page » : il dessine la coquille que la page va remplir.
//
//  Règles :
//   - Server Components purs, zéro JS client : ils servent de `loading.tsx`.
//   - Aucune couleur propre : les tokens résolvent dans le `data-theme` posé par
//     le layout du module (ou passé via `theme` quand le squelette porte le thème).
//   - Quand le layout porte déjà le rail et le header (Engagements, Consultants,
//     Opportunités), le `loading.tsx` n'utilise QUE les corps (`…BodySkeleton`).
// ─────────────────────────────────────────────────────────────────────────────

const PULSE = "animate-pulse motion-reduce:animate-none"

export function SkeletonBar({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("rounded bg-surface-hover", className)} />
}

function SkeletonCard({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-[var(--radius-medium)] border border-border bg-surface", className)}
    >
      {children}
    </div>
  )
}

// ── Rail secondaire ──────────────────────────────────────────────────────────

export function WorkspaceRailSkeleton({
  title,
  chapters = 4,
  modules = 0,
}: {
  /** Titre réel du module : l'identité s'affiche immédiatement. */
  title: string
  chapters?: number
  modules?: number
}) {
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-[var(--layout-section-rail-width)] shrink-0 flex-col border-r border-edito-border bg-edito-canvas px-3 py-5"
    >
      <div className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-edito-navy bg-edito-navy px-3 text-center text-xs font-bold text-white">
        <span className="min-w-0 line-clamp-2 break-words leading-[1.15]">{title}</span>
      </div>
      <div className={cn("mt-5 flex flex-col border-t border-edito-border pt-4", PULSE)}>
        <div className="mx-3 h-2 w-16 rounded bg-edito-chip" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: chapters }, (_, index) => (
            <div key={index} className="h-9 rounded bg-edito-chip/70" />
          ))}
        </div>
      </div>
      {modules > 0 ? (
        <div className={cn("mt-auto border-t border-edito-border pt-4", PULSE)}>
          <div className="mx-3 h-2 w-14 rounded bg-edito-chip" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: modules }, (_, index) => (
              <div key={index} className="h-9 rounded bg-edito-chip/70" />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ── Header de chapitre (76 px, identique aux shells) ─────────────────────────

export function WorkspaceHeaderSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex min-h-[76px] shrink-0 items-center border-b border-border bg-surface px-5 py-4"
    >
      <SkeletonBar className={cn("h-7 w-64", PULSE)} />
    </div>
  )
}

// ── Corps ────────────────────────────────────────────────────────────────────

/** Tableau de bord analytique : KPI + graphique principal + deux blocs. */
export function DashboardBodySkeleton({ kpis = 4 }: { kpis?: number }) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-hidden bg-canvas", PULSE)} aria-hidden="true">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-5">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: kpis }, (_, index) => (
            <SkeletonCard key={index} className="h-24 p-4">
              <SkeletonBar className="h-3 w-20" />
              <SkeletonBar className="mt-4 h-7 w-24" />
            </SkeletonCard>
          ))}
        </div>
        <SkeletonCard className="h-72" />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <SkeletonCard className="h-56" />
          <SkeletonCard className="h-56" />
        </div>
      </div>
    </div>
  )
}

/** Trois panneaux : liste · détail · rail d'information (Missions AT, Projets, Rapports…). */
export function TriPanelBodySkeleton() {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid min-h-0 flex-1 grid-cols-[minmax(230px,280px)_minmax(0,1fr)_minmax(238px,300px)] overflow-hidden",
        PULSE,
      )}
    >
      <div className="flex flex-col gap-3 border-r border-border bg-surface p-4">
        <SkeletonBar className="h-3 w-32" />
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="space-y-2 rounded border border-border p-3">
            <SkeletonBar className="h-3.5 w-3/4" />
            <SkeletonBar className="h-3 w-1/2" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-5 bg-canvas p-6">
        <SkeletonBar className="h-6 w-2/5" />
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-64" />
      </div>
      <div className="flex flex-col gap-4 border-l border-border bg-surface p-4">
        <SkeletonBar className="h-3 w-24" />
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-40" />
      </div>
    </div>
  )
}

/** Page éditoriale / lecture : colonne centrale + colonne latérale. */
export function ReadingBodySkeleton() {
  return (
    <div className={cn("min-h-0 flex-1 overflow-hidden bg-canvas", PULSE)} aria-hidden="true">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-5">
          <SkeletonCard className="h-40" />
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonCard key={index} className="space-y-3 p-5">
              <SkeletonBar className="h-4 w-2/3" />
              <SkeletonBar className="h-3 w-full" />
              <SkeletonBar className="h-3 w-5/6" />
            </SkeletonCard>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-32" />
        </div>
      </div>
    </div>
  )
}

export type WorkspaceBodyVariant = "dashboard" | "tri-panel" | "reading"

function WorkspaceBody({ variant }: { variant: WorkspaceBodyVariant }) {
  if (variant === "tri-panel") return <TriPanelBodySkeleton />
  if (variant === "reading") return <ReadingBodySkeleton />
  return <DashboardBodySkeleton />
}

// ── Workspace Desktop complet (quand la page porte elle-même son rail) ────────

export function WorkspaceDesktopSkeleton({
  title,
  chapters,
  modules,
  body = "dashboard",
  theme,
  label,
}: {
  title: string
  chapters?: number
  modules?: number
  body?: WorkspaceBodyVariant
  /** À passer seulement si aucun layout du module ne pose déjà le thème. */
  theme?: string
  label?: string
}) {
  return (
    <div
      data-theme={theme}
      role="status"
      aria-busy="true"
      aria-label={label ?? `Chargement — ${title}`}
      className="flex h-full min-h-0 w-full overflow-hidden bg-canvas text-body"
    >
      <WorkspaceRailSkeleton title={title} chapters={chapters} modules={modules} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <WorkspaceHeaderSkeleton />
        <WorkspaceBody variant={body} />
      </div>
    </div>
  )
}

/** Zone de contenu seule, sous un rail et un header déjà rendus par le layout. */
export function WorkspaceContentSkeleton({
  body = "dashboard",
  label = "Chargement du chapitre",
}: {
  body?: WorkspaceBodyVariant
  label?: string
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="flex min-h-0 w-full flex-1 overflow-hidden">
      <WorkspaceBody variant={body} />
    </div>
  )
}

// ── Mobile ───────────────────────────────────────────────────────────────────

/** Mobile : titre + bandeau synthèse + pile de cartes d'action (touch targets ≥ 44 px). */
export function MobileWorkspaceSkeleton({
  label = "Chargement",
  theme,
  cards = 5,
}: {
  label?: string
  theme?: string
  cards?: number
}) {
  return (
    <div
      data-theme={theme}
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn("flex min-h-full flex-col gap-4 bg-canvas px-4 pt-2 pb-6 text-body", PULSE)}
    >
      <SkeletonBar className="h-7 w-48" />
      <SkeletonCard className="h-24" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: cards }, (_, index) => (
          <SkeletonCard key={index} className="flex min-h-[72px] items-center gap-3 p-4">
            <SkeletonBar className="size-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBar className="h-4 w-2/3" />
              <SkeletonBar className="h-3 w-1/2" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  )
}

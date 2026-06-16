import { KpiCard } from "@/components/ui/KpiCard"
import { MissionsListView } from "@/components/missions/MissionsListView"
import { OpportunitiesDesktopView } from "@/components/missions/OpportunitiesDesktopView"
import { getOpportunitiesList } from "@/app/(app)/missions/_data/get-opportunities-list"

export const dynamic = "force-dynamic"

function fmtEuro(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M€`
  if (v >= 1_000) return `${Math.round(v / 1_000)} k€`
  return `${Math.round(v)} €`
}

export default async function OpportunitesPage() {
  const opportunites = await getOpportunitiesList()

  const openOpps = opportunites.filter((o) => o.status === "active" || o.status === "pending")

  const weightedPipe = openOpps.reduce((sum, o) => {
    const val = o.acv ?? o.estimatedGain ?? 0
    return sum + val * ((o.conviction ?? 0) / 100)
  }, 0)

  const avgConviction = openOpps.length
    ? Math.round(
        openOpps.reduce((s, o) => s + (o.conviction ?? 0), 0) / openOpps.length,
      )
    : 0

  const hautePrioCount = openOpps.filter((o) => o.priority === "haute").length

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">

      {/* Page title */}
      <div className="pb-2 border-b border-border">
        <h1 className="text-2xl font-bold font-heading tracking-tight text-heading">
          Opportunités
        </h1>
        <p className="mt-1 text-sm text-muted">
          Pipeline commercial — {openOpps.length} opportunité{openOpps.length > 1 ? "s" : ""} en cours
        </p>
      </div>

      {/* KPI row — design system */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          label="Pipe pondéré"
          value={weightedPipe > 0 ? fmtEuro(weightedPipe) : "—"}
          context="Valeur × conviction sur opps actives"
          size="compact"
        />
        <KpiCard
          label="Opportunités ouvertes"
          value={String(openOpps.length)}
          context={
            hautePrioCount > 0
              ? `dont ${hautePrioCount} haute priorité`
              : "aucune haute priorité"
          }
          size="compact"
        />
        <KpiCard
          label="Conviction moyenne"
          value={openOpps.length ? `${avgConviction} %` : "—"}
          progress={avgConviction}
          context="Sur les opportunités actives"
          size="compact"
        />
      </div>

      {/* Desktop list — StructuredList avec colonnes spécifiques opps */}
      <div className="hidden md:block">
        <OpportunitiesDesktopView opportunities={opportunites} />
      </div>

      {/* Mobile list — cartes existantes */}
      <div className="md:hidden">
        <MissionsListView
          rows={opportunites}
          emptyMessage="Aucune opportunité pour l'instant. Créez votre première opportunité pour initialiser le pipeline."
        />
      </div>
    </div>
  )
}

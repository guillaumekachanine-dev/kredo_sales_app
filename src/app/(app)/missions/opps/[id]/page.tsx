import Link from "next/link"
import { getOpportunityDetail } from "@/app/(app)/missions/_data/get-opportunity-detail"
import { OpportunityDetailView } from "@/components/missions/opportunity-detail/OpportunityDetailView"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

interface OpportunityPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function OpportunityPage({ params }: OpportunityPageProps) {
  const { id } = await params
  const [result, device] = await Promise.all([
    getOpportunityDetail(id),
    getDashboardDevice(),
  ])

  if (result.error || !result.data) {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-12">
        <SurfaceCard className="flex flex-col items-center gap-4 border-danger/20 bg-danger/5 p-6 text-center">
          <span className="text-sm font-semibold text-danger">Erreur de chargement</span>
          <p className="text-xs text-body">
            {result.error || "Impossible de récupérer les informations de cette opportunité."}
          </p>
          <Link href="/missions/opps" className="mt-2 rounded border border-border bg-canvas px-4 py-2 text-xs font-semibold text-heading transition-colors hover:bg-surface-hover">
            Retourner à la liste
          </Link>
        </SurfaceCard>
      </div>
    )
  }

  return <OpportunityDetailView data={result.data} device={device} />
}

import { getOpportunityDetail } from "@/app/(app)/missions/_data/get-opportunity-detail"
import { OpportunityQuickEditForm } from "@/components/missions/opportunity-detail/OpportunityQuickEditForm"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface EditOpportunityPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditOpportunityPage({ params }: EditOpportunityPageProps) {
  const { id } = await params
  const result = await getOpportunityDetail(id)

  if (result.error || !result.data) {
    return (
      <div className="w-full max-w-xl mx-auto px-6 py-12">
        <SurfaceCard className="p-6 border-danger/20 bg-danger/5 flex flex-col gap-4 items-center text-center">
          <span className="text-sm font-semibold text-danger">Erreur de chargement</span>
          <p className="text-xs text-body">
            {result.error || "Impossible de récupérer les informations de cette opportunité."}
          </p>
          <Link
            href="/missions/opps"
            className="mt-2 px-4 py-2 text-xs font-semibold rounded bg-canvas hover:bg-canvas/80 border border-border text-heading transition-all"
          >
            Retourner à la liste
          </Link>
        </SurfaceCard>
      </div>
    )
  }

  return <OpportunityQuickEditForm data={result.data} />
}

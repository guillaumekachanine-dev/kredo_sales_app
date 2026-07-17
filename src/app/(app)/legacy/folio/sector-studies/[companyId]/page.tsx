import React from "react"
import { getFolioSectorStudyByCompanyId } from "@/features/legacy/folio/folio-loader"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { FolioSectorStudyDetail } from "@/features/legacy/folio/FolioSectorStudyDetail"
import Link from "next/link"

type PageProps = {
  params: Promise<{ companyId: string }>
}

export default async function FolioSectorStudyDetailPage({ params }: PageProps) {
  const { companyId } = await params
  const [studyResponse, device] = await Promise.all([
    getFolioSectorStudyByCompanyId(companyId),
    getDashboardDevice(),
  ])

  if (!studyResponse.success) {
    let errorMessage = "Une erreur s'est produite lors du chargement de l'étude."
    if (studyResponse.error === "not_found") {
      errorMessage = "Ce compte n'existe pas ou n'est pas accessible."
    } else if (studyResponse.error === "no_study") {
      errorMessage = "Aucune étude sectorielle d'archive FOLIO n'est disponible pour ce compte."
    }

    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
        <h2 className="text-lg font-bold text-heading">Étude introuvable</h2>
        <p className="text-sm text-body">{errorMessage}</p>
        <div className="pt-4">
          <Link
            href="/legacy/folio/sector-studies"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Retour aux archives
          </Link>
        </div>
      </div>
    )
  }

  return (
    <FolioSectorStudyDetail
      study={studyResponse.data!}
      device={device}
    />
  )
}

"use client"

import dynamic from "next/dynamic"
import type { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import type { AccountIntelligenceHomeFinancials } from "@/lib/intelligence/account-intelligence-home-contract"
import type { FinancialReference } from "@/features/financial-modeling/data/financial-reference-presenter"
import { AccountIntelligenceHomeRuntimeProvider } from "./home/AccountIntelligenceHomeRuntimeContext"
import {
  AccountIntelligenceDesktopSkeleton,
  AccountIntelligenceMobileSkeleton,
} from "./AccountIntelligenceSkeleton"

// Dispatcher device (ADR-0006) — écran dense → adaptive plein (Desktop/Mobile séparés).
//
// Composant CLIENT à imports dynamiques, et c'est structurel (audit d'ouverture des
// pages, O-6) : rendues par un `if` dans un Server Component, deux vues importées
// statiquement figurent TOUTES DEUX dans le manifeste d'entrée de la route — le
// navigateur téléchargeait la vue mobile sur desktop, et inversement. Next 16 ne
// découpe pas un Client Component importé dynamiquement depuis un Server Component
// (docs `lazy-loading.md`) : le découpage doit se faire ici, côté client.
// Le rendu serveur est conservé (`ssr` par défaut) ; seul le chunk de la vue rendue
// est téléchargé.

const ClientIntelligenceDesktopView = dynamic(
  () => import("./ClientIntelligenceDesktopView").then((m) => m.ClientIntelligenceDesktopView),
  { loading: () => <AccountIntelligenceDesktopSkeleton /> },
)

const ClientIntelligenceMobileView = dynamic(
  () => import("./ClientIntelligenceMobileView").then((m) => m.ClientIntelligenceMobileView),
  { loading: () => <AccountIntelligenceMobileSkeleton /> },
)

export function ClientIntelligenceView({
  data,
  device,
  financialReference = null,
  homeFinancials = null,
  playbookSlug = null,
}: {
  data: ClientIntelligenceData
  device: DashboardDevice
  financialReference?: FinancialReference | null
  homeFinancials?: AccountIntelligenceHomeFinancials | null
  playbookSlug?: string | null
}) {
  if (device === "mobile") {
    return <ClientIntelligenceMobileView data={data} />
  }

  return (
    <AccountIntelligenceHomeRuntimeProvider
      financials={homeFinancials}
      playbookSlug={playbookSlug}
    >
      <ClientIntelligenceDesktopView
        data={data}
        financialReference={financialReference}
      />
    </AccountIntelligenceHomeRuntimeProvider>
  )
}

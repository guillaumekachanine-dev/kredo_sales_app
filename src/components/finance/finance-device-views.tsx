"use client"

import dynamic from "next/dynamic"
import { MobileWorkspaceSkeleton, WorkspaceDesktopSkeleton } from "@/components/layout/loading/WorkspaceSkeleton"

// Vues Desktop / Mobile chargées dynamiquement — audit d'ouverture des pages (O-6).
//
// Rendues par un `if` dans un Server Component, deux vues importées statiquement
// figurent toutes deux dans le manifeste d'entrée de la route : chaque appareil
// téléchargeait aussi la vue de l'autre. Next 16 ne découpe pas un Client Component
// importé dynamiquement DEPUIS un Server Component (docs `lazy-loading.md`) : le
// découpage se fait donc dans ce module client. Mêmes noms que les vues d'origine,
// rendu serveur conservé ; seul le chunk de la vue rendue est téléchargé.

export const FinanceDesktopDashboard = dynamic(
  () => import("./FinanceDesktopDashboard").then((m) => m.FinanceDesktopDashboard),
  { loading: () => <WorkspaceDesktopSkeleton title="Finance" chapters={3} modules={2} /> },
)

export const FinanceMobileDashboard = dynamic(
  () => import("./FinanceMobileDashboard").then((m) => m.FinanceMobileDashboard),
  { loading: () => <MobileWorkspaceSkeleton label="Chargement de la finance" /> },
)

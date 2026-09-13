"use client"

import dynamic from "next/dynamic"
import { MobileWorkspaceSkeleton } from "@/components/layout/loading/WorkspaceSkeleton"
import { CockpitDesktopSkeleton } from "./CockpitDesktopSkeleton"

// Vues Desktop / Mobile chargées dynamiquement — audit d'ouverture des pages (O-6).
//
// Rendues par un `if` dans un Server Component, deux vues importées statiquement
// figurent toutes deux dans le manifeste d'entrée de la route : chaque appareil
// téléchargeait aussi la vue de l'autre. Next 16 ne découpe pas un Client Component
// importé dynamiquement DEPUIS un Server Component (docs `lazy-loading.md`) : le
// découpage se fait donc dans ce module client. Mêmes noms que les vues d'origine,
// rendu serveur conservé ; seul le chunk de la vue rendue est téléchargé.

export const CockpitDesktopDashboard = dynamic(
  () => import("./CockpitDesktopDashboard").then((m) => m.CockpitDesktopDashboard),
  { loading: () => <CockpitDesktopSkeleton /> },
)

export const CockpitMobileDashboard = dynamic(
  () => import("./CockpitMobileDashboard").then((m) => m.CockpitMobileDashboard),
  { loading: () => <MobileWorkspaceSkeleton label="Chargement du cockpit" /> },
)

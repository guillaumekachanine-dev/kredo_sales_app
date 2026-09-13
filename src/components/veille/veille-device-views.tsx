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

export const VeilleActualitesDesktop = dynamic(
  () => import("./VeilleActualitesDesktop").then((m) => m.VeilleActualitesDesktop),
  { loading: () => <WorkspaceDesktopSkeleton title="Veille & actualités" chapters={4} modules={4} body="reading" /> },
)

export const VeilleActualitesMobile = dynamic(
  () => import("./VeilleActualitesMobile").then((m) => m.VeilleActualitesMobile),
  { loading: () => <MobileWorkspaceSkeleton label="Chargement de la veille…" /> },
)

"use client"

import dynamic from "next/dynamic"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import {
  WATCH_ANALYSIS_COMPOSER_EVENT,
  hasLocalWatchAnalysisOwner,
} from "@/lib/reports/watch-analysis-launcher"

const WatchAnalysisComposerMobile = dynamic(
  () => import("./WatchAnalysisComposerMobile").then((mod) => mod.WatchAnalysisComposerMobile),
  { ssr: false },
)

const WatchAnalysisComposerDesktop = dynamic(
  () => import("./WatchAnalysisComposerDesktop").then((mod) => mod.WatchAnalysisComposerDesktop),
  { ssr: false },
)

/**
 * Hôte global du composeur d'analyse transverse (`manual_custom` V2).
 *
 * Avant ce host, `openWatchAnalysisComposer()` n'était écouté que par `/reports` :
 * l'action déclenchée depuis n'importe quelle autre page ne faisait rien. Le host
 * rend l'analyse transverse accessible partout, sur le modèle déjà établi par
 * `CommunicationComposerHost` et `ReportGenerationHost`.
 *
 * Il ne monte RIEN tant que l'événement n'est pas reçu, et s'efface sur les routes
 * qui possèdent leur propre composeur — voir `WATCH_ANALYSIS_LOCAL_OWNER_PATHS`.
 *
 * Les familles de sources (signaux, documents, collections) sont chargées par les
 * pickers côté client : le composeur générique n'a donc besoin d'aucune donnée en
 * prop. Seule la famille « digest » reste vide ici, faute de contexte de page —
 * c'est exactement le comportement de `/reports` aujourd'hui.
 */
export function WatchAnalysisComposerHost({ device }: { device: DashboardDevice }) {
  const pathname = usePathname()
  const router = useRouter()
  // On mémorise la ROUTE d'ouverture, pas un booléen : une navigation referme le
  // composeur sans effet de synchronisation, et il ne peut jamais réapparaître
  // sur une page qui possède le sien.
  const [openedForPath, setOpenedForPath] = useState<string | null>(null)

  const isLocallyOwned = hasLocalWatchAnalysisOwner(pathname ?? "")

  useEffect(() => {
    if (isLocallyOwned) return

    function handleOpen() {
      setOpenedForPath(pathname ?? "")
    }

    window.addEventListener(WATCH_ANALYSIS_COMPOSER_EVENT, handleOpen)
    return () => window.removeEventListener(WATCH_ANALYSIS_COMPOSER_EVENT, handleOpen)
  }, [isLocallyOwned, pathname])

  const close = () => setOpenedForPath(null)

  if (isLocallyOwned || openedForPath === null || openedForPath !== (pathname ?? "")) return null

  const handleLaunched = () => {
    close()
    router.refresh()
  }

  if (device === "mobile") {
    return (
      <WatchAnalysisComposerMobile
        open
        onClose={close}
        currentDigest={null}
        pastDigests={[]}
        knownArticles={[]}
        onLaunched={handleLaunched}
      />
    )
  }

  return (
    <WatchAnalysisComposerDesktop
      open
      onClose={close}
      currentDigest={null}
      currentDigestNumber={null}
      pastDigests={[]}
      knownArticles={[]}
      onLaunched={handleLaunched}
    />
  )
}

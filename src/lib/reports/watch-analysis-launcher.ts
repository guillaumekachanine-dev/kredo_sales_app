export const WATCH_ANALYSIS_COMPOSER_EVENT = "kredo:open-watch-analysis-composer"

/**
 * Pages qui montent DÉJÀ leur propre composeur d'analyse transverse, avec un
 * contexte plus riche que le composeur générique :
 *
 *  - `/veille`   : digest courant, digests passés et articles résolus en props ;
 *  - `/reports`  : composeur générique, mais aussi ouvert par un bouton local.
 *
 * L'hôte global (`WatchAnalysisComposerHost`) s'efface sur ces routes : sans ce
 * garde, l'événement ouvrirait deux composeurs à la fois, dont un dégradé.
 */
export const WATCH_ANALYSIS_LOCAL_OWNER_PATHS = ["/veille", "/reports"] as const

export function hasLocalWatchAnalysisOwner(pathname: string): boolean {
  const segments = pathname.split(/[?#]/, 1)[0].split("/").filter(Boolean)

  return WATCH_ANALYSIS_LOCAL_OWNER_PATHS.some((ownerPath) => {
    const ownerSegments = ownerPath.split("/").filter(Boolean)
    if (segments.length < ownerSegments.length) return false
    return ownerSegments.every((segment, index) => segment === segments[index])
  })
}

export function openWatchAnalysisComposer() {
  if (typeof window === "undefined") return

  window.dispatchEvent(new CustomEvent(WATCH_ANALYSIS_COMPOSER_EVENT))
}

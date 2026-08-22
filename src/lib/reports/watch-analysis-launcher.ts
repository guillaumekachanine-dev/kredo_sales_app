export const WATCH_ANALYSIS_COMPOSER_EVENT = "kredo:open-watch-analysis-composer"

export function openWatchAnalysisComposer() {
  if (typeof window === "undefined") return

  window.dispatchEvent(new CustomEvent(WATCH_ANALYSIS_COMPOSER_EVENT))
}

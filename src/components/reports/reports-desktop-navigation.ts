import type { ReportsSection } from "./ReportsLocalNavigation"

interface SearchParamsSnapshot {
  toString(): string
}

/**
 * Parse la valeur du query parameter `section` vers une ReportsSection valide.
 * null / undefined / valeur inconnue → "documents" (état racine canonique).
 */
export function parseReportsSection(value: string | null | undefined): ReportsSection {
  if (value === "knowledge" || value === "generation" || value === "documents") {
    return value
  }
  return "documents"
}

/**
 * Construit l'URL cible pour la navigation entre chapitres Rapports & rédaction.
 * - "documents" (racine) : supprime le paramètre `section` de l'URL.
 * - "knowledge" / "generation" : ajoute ou met à jour `section`.
 * - Tous les autres query params (filtres, pagination, doc...) sont strictement conservés.
 */
export function buildReportsSectionHref(
  pathname: string,
  searchParams: SearchParamsSnapshot,
  nextSection: ReportsSection,
): string {
  const nextSearchParams = new URLSearchParams(searchParams.toString())

  if (nextSection === "documents") {
    nextSearchParams.delete("section")
  } else {
    nextSearchParams.set("section", nextSection)
  }

  const query = nextSearchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

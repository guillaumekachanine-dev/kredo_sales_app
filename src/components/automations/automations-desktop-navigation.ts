import type { ReadonlyURLSearchParams } from "next/navigation"

export type AutomationsTabKey = "journal" | "sante" | "couts"

/**
 * Parse la section de navigation Automatisations depuis le paramètre d'URL `section`.
 * Règle déterministe :
 * - null / undefined -> journal
 * - "journal"        -> journal
 * - "sante"          -> sante
 * - "couts"          -> couts
 * - valeur inconnue  -> journal
 */
export function parseAutomationsSection(
  raw: string | null | undefined,
): AutomationsTabKey {
  if (raw === "sante") return "sante"
  if (raw === "couts") return "couts"
  return "journal"
}

/**
 * Construit l'URL cible pour un changement de chapitre dans Automatisations Desktop.
 * Conserve l'intégralité des query params existants (ex: `run`), et modifie uniquement `section`.
 * Pour `journal`, supprime le paramètre `section` (état canonique sans paramètre).
 */
export function buildAutomationsSectionHref(
  pathname: string,
  searchParams: URLSearchParams | ReadonlyURLSearchParams | string,
  nextSection: AutomationsTabKey,
): string {
  const params = new URLSearchParams(
    typeof searchParams === "string" ? searchParams : searchParams.toString(),
  )

  if (nextSection === "journal") {
    params.delete("section")
  } else {
    params.set("section", nextSection)
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

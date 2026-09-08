import type { ReadonlyURLSearchParams } from "next/navigation"

export type PiTabKey = "strategy" | "chapter_1" | "chapter_2" | "chapter_3"

/**
 * Parse la section de navigation Prospection Intelligence depuis le paramètre d'URL `section`.
 * Règle déterministe :
 * - null / undefined -> strategy
 * - "strategy"       -> strategy
 * - "chapter_1"      -> chapter_1
 * - "chapter_2"      -> chapter_2
 * - "chapter_3"      -> chapter_3
 * - valeur inconnue  -> strategy
 */
export function parseProspectionSection(
  raw: string | null | undefined,
): PiTabKey {
  if (raw === "chapter_1") return "chapter_1"
  if (raw === "chapter_2") return "chapter_2"
  if (raw === "chapter_3") return "chapter_3"
  return "strategy"
}

/**
 * Construit l'URL cible pour un changement de chapitre dans Prospection Intelligence Desktop.
 * Conserve l'intégralité des query params existants, et modifie uniquement `section`.
 * Pour `strategy`, supprime le paramètre `section` (état canonique sans paramètre).
 */
export function buildProspectionSectionHref(
  pathname: string,
  searchParams: URLSearchParams | ReadonlyURLSearchParams | string,
  nextSection: PiTabKey,
): string {
  const params = new URLSearchParams(
    typeof searchParams === "string" ? searchParams : searchParams.toString(),
  )

  if (nextSection === "strategy") {
    params.delete("section")
  } else {
    params.set("section", nextSection)
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

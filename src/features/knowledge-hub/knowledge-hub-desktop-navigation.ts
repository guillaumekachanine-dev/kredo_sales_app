import type { ReadonlyURLSearchParams } from "next/navigation"
import { domains } from "./knowledge-hub-shell-data"
import type { KnowledgeView } from "./knowledge-hub.types"

export interface KnowledgeHubSectionChapter {
  id: string
  label: string
}

export const EXPERTISE_CHAPTERS: readonly KnowledgeHubSectionChapter[] = [
  { id: "practices", label: "Practices" },
  { id: "jobs", label: "Métiers" },
  { id: "skills", label: "Compétences" },
  { id: "techs", label: "Technologies" },
] as const

export const TALENTS_CHAPTERS: readonly KnowledgeHubSectionChapter[] = [
  { id: "team", label: "Équipe" },
  { id: "alumni", label: "Alumni" },
  { id: "candidates", label: "Vivier candidats" },
  { id: "skills", label: "Cartographie" },
] as const

export function getKnowledgeHubDefaultSection(domainId: string): string | undefined {
  if (domainId === "expertise-kredo") {
    return "practices"
  }
  if (domainId === "talents") {
    return "team"
  }
  return undefined
}

export function getKnowledgeHubDomainChapters(domainId: string): readonly KnowledgeHubSectionChapter[] {
  if (domainId === "expertise-kredo") {
    return EXPERTISE_CHAPTERS
  }
  if (domainId === "talents") {
    return TALENTS_CHAPTERS
  }
  const domain = domains.find((d) => d.id === domainId)
  if (!domain) {
    return []
  }
  return domain.subItems.map((item, index) => ({
    id: `section-${index}`,
    label: item,
  }))
}

export function getKnowledgeHubActiveLabel(activeView: KnowledgeView): string {
  if (activeView.type === "categories") {
    return "Catégories"
  }

  const domain = domains.find((d) => d.id === activeView.domainId)

  if (activeView.sectionId) {
    const chapters = getKnowledgeHubDomainChapters(activeView.domainId)
    const matchingChapter = chapters.find((c) => c.id === activeView.sectionId)
    if (matchingChapter) {
      return matchingChapter.label
    }
    return activeView.sectionId
  }

  return domain?.title ?? activeView.domainId
}

export function parseKnowledgeHubView(
  domainRaw?: string | null,
  sectionRaw?: string | null,
): KnowledgeView {
  if (!domainRaw) {
    return { type: "categories" }
  }

  const domain = domains.find((d) => d.id === domainRaw)
  if (!domain) {
    return { type: "categories" }
  }

  const chapters = getKnowledgeHubDomainChapters(domain.id)
  const defaultSection = getKnowledgeHubDefaultSection(domain.id)

  if (sectionRaw) {
    const isSectionValid = chapters.some((c) => c.id === sectionRaw)
    if (isSectionValid) {
      return {
        type: "domain",
        domainId: domain.id,
        sectionId: sectionRaw,
      }
    }
  }

  if (defaultSection) {
    return {
      type: "domain",
      domainId: domain.id,
      sectionId: defaultSection,
    }
  }

  return {
    type: "domain",
    domainId: domain.id,
  }
}

export function buildKnowledgeHubViewHref(
  pathname: string,
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
  nextView: KnowledgeView,
): string {
  const params = new URLSearchParams(searchParams.toString())

  if (nextView.type === "categories") {
    params.delete("domain")
    params.delete("section")
  } else {
    const resolved = parseKnowledgeHubView(nextView.domainId, nextView.sectionId)
    if (resolved.type === "categories") {
      params.delete("domain")
      params.delete("section")
    } else {
      params.set("domain", resolved.domainId)
      if (resolved.sectionId) {
        params.set("section", resolved.sectionId)
      } else {
        params.delete("section")
      }
    }
  }

  const queryString = params.toString()
  return queryString ? `${pathname}?${queryString}` : pathname
}

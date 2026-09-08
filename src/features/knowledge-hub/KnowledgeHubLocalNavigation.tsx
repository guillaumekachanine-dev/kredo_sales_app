"use client"

import { SectionRail } from "@/components/layout/SectionRail"
import type { SectionRailEntry, SectionRailProps } from "@/lib/navigation/section-rail"
import { domains } from "./knowledge-hub-shell-data"
import type { KnowledgeView } from "./knowledge-hub.types"
import { KnowledgeHubCategoryIcon } from "./KnowledgeHubCategoryIcon"

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

export interface KnowledgeHubLocalNavigationProps {
  activeView: KnowledgeView
  onChangeView: (view: KnowledgeView) => void
  onOpenModal?: (modal: "workshop" | "ask") => void
  activeModal?: "workshop" | "ask" | null
}

export function buildKnowledgeHubRailProps({
  activeView,
  onChangeView,
  onOpenModal,
  activeModal,
}: KnowledgeHubLocalNavigationProps): SectionRailProps {
  const chapters: SectionRailEntry[] =
    activeView.type === "categories"
      ? domains.map((domain) => ({
          key: domain.id,
          label: domain.title,
          icon: (
            <KnowledgeHubCategoryIcon
              domainId={domain.id}
              className="size-4 rounded [&_svg]:size-3"
            />
          ),
          active: false,
          onSelect: () => {
            const defaultSection = getKnowledgeHubDefaultSection(domain.id)
            onChangeView({
              type: "domain",
              domainId: domain.id,
              sectionId: defaultSection,
            })
          },
        }))
      : getKnowledgeHubDomainChapters(activeView.domainId).map((section) => ({
          key: section.id,
          label: section.label,
          active: activeView.sectionId === section.id,
          onSelect: () => {
            onChangeView({
              type: "domain",
              domainId: activeView.domainId,
              sectionId: section.id,
            })
          },
        }))

  const contextualModules: SectionRailEntry[] | undefined = onOpenModal
    ? [
        {
          key: "workshop",
          label: "Ateliers",
          icon: (
            <svg
              className="size-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          ),
          active: activeModal === "workshop",
          onSelect: () => onOpenModal("workshop"),
        },
      ]
    : undefined

  return {
    ariaLabel: "Navigation Knowledge Hub",
    title: "Knowledge Hub",
    home: {
      onSelect: () => onChangeView({ type: "categories" }),
    },
    chapters,
    contextualModules,
  }
}

export function KnowledgeHubLocalNavigation(props: KnowledgeHubLocalNavigationProps) {
  return <SectionRail {...buildKnowledgeHubRailProps(props)} />
}

"use client"

import { SectionRail } from "@/components/layout/SectionRail"
import type { SectionRailEntry, SectionRailProps } from "@/lib/navigation/section-rail"
import { domains } from "./knowledge-hub-shell-data"
import type { KnowledgeView } from "./knowledge-hub.types"
import { KnowledgeHubCategoryIcon } from "./KnowledgeHubCategoryIcon"
import {
  EXPERTISE_CHAPTERS,
  TALENTS_CHAPTERS,
  getKnowledgeHubActiveLabel,
  getKnowledgeHubDefaultSection,
  getKnowledgeHubDomainChapters,
  type KnowledgeHubSectionChapter,
} from "./knowledge-hub-desktop-navigation"

export type { KnowledgeHubSectionChapter }
export {
  EXPERTISE_CHAPTERS,
  TALENTS_CHAPTERS,
  getKnowledgeHubDefaultSection,
  getKnowledgeHubDomainChapters,
  getKnowledgeHubActiveLabel,
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

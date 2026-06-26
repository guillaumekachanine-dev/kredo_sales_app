import React from "react"
import { EntityWorkspaceHeader } from "@/components/common/EntityWorkspaceHeader"
import { EntityWorkspacePage } from "@/components/common/EntityWorkspacePage"
import { PageFilterBar } from "@/components/ui/PageFilterBar"
import {
  PageViewSelector,
  type PageViewSelectorItem,
} from "@/components/ui/PageViewSelector"

export type EntityWorkspaceViewMode = "list" | "kanban" | "planning"

export interface EntityWorkspaceTemplateProps {
  title: string
  headerSubtitle?: React.ReactNode
  kpis?: React.ReactNode
  actions?: React.ReactNode
  filters?: React.ReactNode
  viewMode: EntityWorkspaceViewMode
  onViewModeChange: (viewMode: EntityWorkspaceViewMode) => void
  listView: React.ReactNode
  kanbanView?: React.ReactNode
  planningView?: React.ReactNode
  mobileView?: React.ReactNode
  isMobile?: boolean
  activeFilterCount?: number
  onResetFilters?: () => void
  secondaryActions?: React.ReactNode
  summary?: React.ReactNode
  controlsClassName?: string
  viewItems?: PageViewSelectorItem[]
}

const DEFAULT_VIEW_ITEMS = [
  { value: "list", label: "Liste" },
  { value: "kanban", label: "Kanban" },
  { value: "planning", label: "Planning" },
] as const

export function EntityWorkspaceTemplate({
  title,
  headerSubtitle,
  kpis,
  actions,
  filters,
  viewMode,
  onViewModeChange,
  listView,
  kanbanView,
  planningView,
  mobileView,
  isMobile = false,
  activeFilterCount = 0,
  onResetFilters,
  secondaryActions,
  summary,
  controlsClassName,
  viewItems = [...DEFAULT_VIEW_ITEMS],
}: EntityWorkspaceTemplateProps) {
  const activeView =
    viewMode === "kanban"
      ? kanbanView
      : viewMode === "planning"
        ? planningView
        : listView

  return (
    <EntityWorkspacePage>
      <EntityWorkspaceHeader title={title} subtitle={headerSubtitle} kpis={kpis} actions={actions} />

      {isMobile ? (
        mobileView ?? null
      ) : (
        <div className="flex flex-col gap-3">
          <PageFilterBar
            activeCount={activeFilterCount}
            onReset={onResetFilters}
            summary={summary}
            secondaryActions={secondaryActions}
            controlsClassName={controlsClassName}
            viewSelector={
              <PageViewSelector
                items={viewItems}
                value={viewMode}
                onChange={(value) => onViewModeChange(value as EntityWorkspaceViewMode)}
                ariaLabel={`Mode d'affichage de ${title.toLowerCase()}`}
              />
            }
          >
            {filters}
          </PageFilterBar>

          {activeView}
        </div>
      )}
    </EntityWorkspacePage>
  )
}

"use client"

import React from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import {
  StructuredList,
  type StructuredListColumn,
  type StructuredListDensity,
} from "@/components/ui/StructuredList"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"

export interface EntityListViewProps<T> {
  items: T[]
  columns: StructuredListColumn<T>[]
  getItemId: (item: T) => string
  density?: StructuredListDensity
  onItemClick?: (item: T) => void
  ariaLabel: string
  emptyState?: React.ReactNode
  getRowStyle?: (item: T) => React.CSSProperties | undefined
  tableFixed?: boolean
}

interface OpportunityListEntity {
  entityType?: string
  entityId?: string
}

export function EntityListView<T>({
  items,
  columns,
  getItemId,
  density = "compact",
  onItemClick,
  ariaLabel,
  emptyState,
  getRowStyle,
  tableFixed,
}: EntityListViewProps<T>) {
  const { openOpportunityDrawer } = useStaffingDrawerStore()

  const handleItemClick = onItemClick
    ? (item: T) => {
        const entity = item as T & OpportunityListEntity
        if (entity.entityType === "opportunite" && entity.entityId) {
          openOpportunityDrawer(entity.entityId, "besoin")
          return
        }
        onItemClick(item)
      }
    : undefined

  return (
    <SurfaceCard className="overflow-hidden border-0 rounded-[var(--radius-medium)]">
      <StructuredList
        density={density}
        items={items}
        columns={columns}
        getItemId={getItemId}
        onItemClick={handleItemClick}
        ariaLabel={ariaLabel}
        emptyState={emptyState}
        getRowStyle={getRowStyle}
        tableFixed={tableFixed}
      />
    </SurfaceCard>
  )
}

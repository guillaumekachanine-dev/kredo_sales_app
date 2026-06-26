import React from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import {
  StructuredList,
  type StructuredListColumn,
  type StructuredListDensity,
} from "@/components/ui/StructuredList"

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
  return (
    <SurfaceCard className="overflow-hidden border-0 rounded-[var(--radius-medium)]">
      <StructuredList
        density={density}
        items={items}
        columns={columns}
        getItemId={getItemId}
        onItemClick={onItemClick}
        ariaLabel={ariaLabel}
        emptyState={emptyState}
        getRowStyle={getRowStyle}
        tableFixed={tableFixed}
      />
    </SurfaceCard>
  )
}

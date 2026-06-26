"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"

export interface EntityKanbanColumn<TKey extends string> {
  key: TKey
  label: string
}

interface EntityKanbanColumnProps<TItem, TKey extends string> {
  column: EntityKanbanColumn<TKey>
  items: TItem[]
  draggedId: string | null
  setDraggedId: (id: string | null) => void
  getItemId: (item: TItem) => string
  getColumnAccentColor?: (columnKey: TKey) => string
  renderCard: (item: TItem) => React.ReactNode
  onCardClick?: (item: TItem) => void
  onItemMove: (itemId: string, columnKey: TKey) => Promise<void>
  emptyColumnState?: React.ReactNode
}

function EntityKanbanColumn<TItem, TKey extends string>({
  column,
  items,
  draggedId,
  setDraggedId,
  getItemId,
  getColumnAccentColor,
  renderCard,
  onCardClick,
  onItemMove,
  emptyColumnState,
}: EntityKanbanColumnProps<TItem, TKey>) {
  const [isDragOver, setIsDragOver] = useState(false)
  const accentColor = getColumnAccentColor?.(column.key)

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)
    const itemId = event.dataTransfer.getData("entity-kanban-item-id")

    if (itemId && draggedId === itemId) {
      setDraggedId(null)
      await onItemMove(itemId, column.key)
    }
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "flex min-w-[200px] max-w-[280px] flex-1 flex-col rounded-2xl border bg-surface/60 p-3 transition-all duration-200 select-none",
        isDragOver ? "border-primary bg-primary/5 ring-2 ring-primary/10 shadow-lg scale-[1.01]" : "border-border",
      )}
    >
      <div
        className="mb-3 flex items-center justify-between border-b pb-2.5 px-1"
        style={accentColor ? { borderBottomColor: accentColor } : undefined}
      >
        <span
          className="text-[13px] font-bold"
          style={accentColor ? { color: accentColor } : undefined}
        >
          {column.label}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-bold"
          style={accentColor ? { color: accentColor } : undefined}
        >
          {items.length}
        </span>
      </div>

      <div className="custom-scrollbar flex max-h-[640px] flex-col gap-3 overflow-y-auto py-1 pr-1">
        {items.map((item) => {
          const itemId = getItemId(item)

          return (
            <div
              key={itemId}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("entity-kanban-item-id", itemId)
                setDraggedId(itemId)
                event.currentTarget.style.opacity = "0.4"
              }}
              onDragEnd={(event) => {
                setDraggedId(null)
                event.currentTarget.style.opacity = "1"
              }}
              onClick={onCardClick ? () => onCardClick(item) : undefined}
              className="h-[162px] w-full cursor-grab perspective-1000 select-none active:cursor-grabbing"
            >
              {renderCard(item)}
            </div>
          )
        })}

        {items.length === 0 ? (
          emptyColumnState ?? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-canvas/30 py-10 text-muted">
              <span className="text-[10px] font-medium">Déposer une carte ici</span>
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}

export interface EntityKanbanViewProps<TItem, TKey extends string> {
  columns: readonly EntityKanbanColumn<TKey>[]
  items: TItem[]
  getItemId: (item: TItem) => string
  getColumnKey: (item: TItem) => TKey | string
  getColumnAccentColor?: (columnKey: TKey) => string
  renderCard: (item: TItem) => React.ReactNode
  onCardClick?: (item: TItem) => void
  onItemMove: (itemId: string, columnKey: TKey) => Promise<void>
}

export function EntityKanbanView<TItem, TKey extends string>({
  columns,
  items,
  getItemId,
  getColumnKey,
  getColumnAccentColor,
  renderCard,
  onCardClick,
  onItemMove,
}: EntityKanbanViewProps<TItem, TKey>) {
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const validItems = items.filter((item) =>
    columns.some((column) => column.key === getColumnKey(item)),
  )

  return (
    <div className="scrollbar-thin flex min-h-[500px] gap-4 overflow-x-auto select-none pb-4 pr-1">
      {columns.map((column) => (
        <EntityKanbanColumn
          key={column.key}
          column={column}
          items={validItems.filter((item) => getColumnKey(item) === column.key)}
          draggedId={draggedId}
          setDraggedId={setDraggedId}
          getItemId={getItemId}
          getColumnAccentColor={getColumnAccentColor}
          renderCard={renderCard}
          onCardClick={onCardClick}
          onItemMove={onItemMove}
        />
      ))}
    </div>
  )
}

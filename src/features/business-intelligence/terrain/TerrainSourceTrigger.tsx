"use client"

import { cn } from "@/lib/utils"
import type { ResolvedSource } from "../shared/SourceChip"
import { resolveTerrainSource } from "./terrain-source-model"

export type TerrainSourceTriggerProps = {
  sourceId: number
  sourceResolution?: Record<number, ResolvedSource> | null
  onClick: (sourceId: number) => void
  className?: string
}

export function TerrainSourceTrigger({
  sourceId,
  sourceResolution,
  onClick,
  className,
}: TerrainSourceTriggerProps) {
  const resolved = resolveTerrainSource(sourceId, sourceResolution)

  const label = resolved.publisher
    ? `Source S${sourceId} : ${resolved.publisher}`
    : `Source S${sourceId} non résolue`

  return (
    <button
      type="button"
      onClick={() => onClick(sourceId)}
      aria-label={label}
      className={cn(
        "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-edito-border bg-edito-chip px-2.5 font-mono text-xs font-bold text-edito-navy transition-colors hover:bg-edito-border/60 active:bg-edito-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 select-none",
        !resolved.isResolved && "opacity-75 text-edito-muted",
        className,
      )}
    >
      S{sourceId}
    </button>
  )
}

export type TerrainSourceTriggerListProps = {
  sourceIds: number[]
  sourceResolution?: Record<number, ResolvedSource> | null
  onSelectSource: (sourceId: number) => void
  className?: string
}

export function TerrainSourceTriggerList({
  sourceIds,
  sourceResolution,
  onSelectSource,
  className,
}: TerrainSourceTriggerListProps) {
  if (!sourceIds || sourceIds.length === 0) return null

  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <span className="text-[11px] font-extrabold uppercase tracking-wide text-edito-muted">
        Sources :
      </span>
      {sourceIds.map((id) => (
        <TerrainSourceTrigger
          key={id}
          sourceId={id}
          sourceResolution={sourceResolution}
          onClick={onSelectSource}
        />
      ))}
    </div>
  )
}

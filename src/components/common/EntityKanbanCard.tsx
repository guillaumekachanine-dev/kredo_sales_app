"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface EntityKanbanCardProps {
  front: React.ReactNode
  back?: React.ReactNode
  isFlipped?: boolean
}

export function EntityKanbanCard({
  front,
  back,
  isFlipped = false,
}: EntityKanbanCardProps) {
  return (
    <div
      className={cn(
        "relative h-full w-full duration-500 transform-style-3d transition-transform ease-out-back",
        isFlipped && "rotate-y-180",
      )}
    >
      <div className="absolute inset-0 h-full w-full backface-hidden">
        {front}
      </div>
      {back ? (
        <div className="absolute inset-0 h-full w-full backface-hidden rotate-y-180">
          {back}
        </div>
      ) : null}
    </div>
  )
}

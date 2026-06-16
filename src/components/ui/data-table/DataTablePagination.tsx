"use client"

import React from "react"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { cn } from "@/lib/utils"

export interface DataTablePaginationProps {
  currentPage: number
  totalPages: number
  totalResults?: number
  pageSize?: number
  pageSizeOptions?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  className?: string
}

export function DataTablePagination({
  currentPage,
  totalPages,
  totalResults,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  className,
}: DataTablePaginationProps) {
  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < totalPages

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex flex-wrap items-center gap-3 text-sm text-body">
        <span>
          Page <span className="font-semibold text-heading">{currentPage}</span> sur{" "}
          <span className="font-semibold text-heading">{Math.max(totalPages, 1)}</span>
        </span>
        {typeof totalResults === "number" ? (
          <span className="text-muted">{totalResults} résultat{totalResults > 1 ? "s" : ""}</span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && pageSize && pageSizeOptions?.length ? (
          <div className="min-w-[8.5rem]">
            <Select
              size="sm"
              aria-label="Nombre de lignes par page"
              value={String(pageSize)}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              fullWidth
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option} / page
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        <Button variant="secondary" size="sm" disabled={!canGoPrevious} onClick={() => onPageChange(currentPage - 1)}>
          Précédent
        </Button>
        <Button variant="secondary" size="sm" disabled={!canGoNext} onClick={() => onPageChange(currentPage + 1)}>
          Suivant
        </Button>
      </div>
    </div>
  )
}

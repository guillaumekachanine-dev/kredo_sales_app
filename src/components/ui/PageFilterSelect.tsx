"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Select } from "./Select"

export type PageFilterOption = {
  value: string
  label: string
}

export type PageFilterSelectProps = {
  id: string
  label: string
  value: string
  options: PageFilterOption[]
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  /** Value considered "default" — select text is grayed when on this value */
  defaultValue?: string
}

export function PageFilterSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
  className,
  defaultValue = "all",
}: PageFilterSelectProps) {
  const isDefault = value === defaultValue
  return (
    <div className={cn("flex min-w-0 w-full flex-col sm:min-w-[9rem] sm:w-auto", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Select
        id={id}
        size="sm"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "bg-surface hover:bg-surface-hover",
          isDefault && "text-muted",
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </div>
  )
}

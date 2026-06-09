"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"

export interface AsyncActionButtonProps {
  children: React.ReactNode
  onClick?: () => void | Promise<void>
  isLoading?: boolean
  disabled?: boolean
  className?: string
  type?: "button" | "submit" | "reset"
}

export function AsyncActionButton({
  children,
  onClick,
  isLoading: externalIsLoading,
  disabled,
  className,
  type = "button"
}: AsyncActionButtonProps) {
  const [internalIsLoading, setInternalIsLoading] = useState(false)
  const isLoading = externalIsLoading ?? internalIsLoading

  const handleClick = async () => {
    if (disabled || isLoading || !onClick) return

    try {
      const result = onClick()
      if (result instanceof Promise) {
        setInternalIsLoading(true)
        await result
      }
    } finally {
      setInternalIsLoading(false)
    }
  }

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none active:scale-98",
        className
      )}
    >
      {isLoading && (
        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  )
}

import React from "react"
import { cn } from "@/lib/utils"

export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = "Une erreur est survenue",
  message,
  onRetry,
  className
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center min-h-[200px] bg-danger/5 border border-danger/10 rounded-lg", className)}>
      <svg className="h-8 w-8 text-danger mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h3 className="text-xs font-bold text-heading mb-1">{title}</h3>
      <p className="text-xs text-body mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="bg-surface border border-border hover:bg-surface-hover text-heading px-3 py-1.5 text-xs font-semibold rounded transition-colors active:scale-95"
        >
          Réessayer
        </button>
      )}
    </div>
  )
}

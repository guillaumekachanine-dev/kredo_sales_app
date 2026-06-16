"use client"

import { cn } from "@/lib/utils"

/**
 * Legacy CTA spécialisé.
 * Ne pas utiliser comme primitive générique : il conserve temporairement
 * son rendu animé historique tant que ses usages métier n'ont pas été migrés.
 */
export type ReadyActionButtonProps = {
  onClick: () => void
  ariaLabel?: string
  disabled?: boolean
  className?: string
}

export function ReadyActionButton({
  onClick,
  ariaLabel = "Lancer l’action",
  disabled = false,
  className,
}: ReadyActionButtonProps) {
  return (
    <button
      type="button"
      className={cn("kredo-ready-action-button", className)}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
    >
      <svg
        className="w-5 h-5 relative z-10 text-white shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
      </svg>
    </button>
  )
}

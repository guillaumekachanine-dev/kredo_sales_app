"use client"

import { useEffect, useRef } from "react"

interface CrmLauncherSearchBoxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function CrmLauncherSearchBox({
  value,
  onChange,
  placeholder = "Rechercher un compte par nom, secteur...",
}: CrmLauncherSearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Autofocus à l'affichage
  useEffect(() => {
    // Un léger délai pour s'assurer que le rendu/l'animation de la boîte est terminé
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 80)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <svg
          className="h-4 w-4 text-muted/80"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[var(--radius-medium)] border border-border bg-canvas py-2.5 pl-9 pr-4 text-xs text-heading placeholder-muted outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
        placeholder={placeholder}
      />
      {value.length > 0 && (
        <button
          onClick={() => onChange("")}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-heading"
          type="button"
          aria-label="Effacer la recherche"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"
import { searchAccounts } from "@/app/(app)/missions/_actions/search-accounts"
import { cn } from "@/lib/utils"

export interface AccountValue {
  /** UUID du compte existant, null si c'est une création inline */
  id: string | null
  name: string
  isNew: boolean
}

interface AccountComboboxProps {
  value: AccountValue | null
  onChange: (value: AccountValue | null) => void
  className?: string
}

export function AccountCombobox({ value, onChange, className }: AccountComboboxProps) {
  const [query, setQuery] = useState(value?.name ?? "")
  const [results, setResults] = useState<Array<{ id: string; name: string }>>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Ferme le dropdown si clic en dehors
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  // Recherche avec debounce
  useEffect(() => {
    clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      return
    }

    debounceRef.current = setTimeout(async () => {
      const found = await searchAccounts(trimmed)
      setResults(found)
      setIsLoading(false)
      setIsOpen(true)
    }, 280)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  const handleSelect = (account: { id: string; name: string }) => {
    setQuery(account.name)
    setIsOpen(false)
    setResults([])
    onChange({ id: account.id, name: account.name, isNew: false })
  }

  const handleCreateNew = () => {
    setIsOpen(false)
    setResults([])
    onChange({ id: null, name: query.trim(), isNew: true })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    // Si l'utilisateur re-tape, on invalide la sélection courante
    if (value && val !== value.name) {
      onChange(null)
    }
    if (val.trim().length < 2) {
      setResults([])
      setIsLoading(false)
    } else {
      setIsLoading(true)
      setIsOpen(true)
    }
  }

  // Affiche l'option "Créer" si la saisie ne correspond à aucun résultat exact
  const showCreateOption =
    query.trim().length >= 2 &&
    !results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase())

  const isConfirmed = value !== null

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          placeholder="Tapez le nom du client…"
          autoComplete="off"
          className={cn(
            "w-full rounded-md border bg-canvas px-3 py-2 text-xs text-heading",
            "placeholder:text-muted/50 outline-none transition-colors",
            "focus:ring-1 focus:ring-primary/50 focus:border-primary/60",
            isConfirmed ? "border-primary/50" : "border-border"
          )}
        />
        {/* Indicateur inline */}
        {value?.isNew && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5 pointer-events-none">
            Nouveau
          </span>
        )}
        {value && !value.isNew && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-primary/70">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-surface shadow-lg overflow-hidden">
          {isLoading && (
            <div className="px-3 py-2.5 text-xs text-muted">Recherche…</div>
          )}

          {!isLoading && results.map((account) => (
            <button
              key={account.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()} // évite blur avant click
              onClick={() => handleSelect(account)}
              className="w-full text-left px-3 py-2.5 text-xs text-heading hover:bg-surface-hover transition-colors"
            >
              {account.name}
            </button>
          ))}

          {!isLoading && results.length === 0 && !showCreateOption && (
            <div className="px-3 py-2.5 text-xs text-muted">Aucun résultat</div>
          )}

          {!isLoading && showCreateOption && (
            <>
              {results.length > 0 && (
                <div className="border-t border-border/40" />
              )}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCreateNew}
                className="w-full text-left px-3 py-2.5 text-xs text-primary hover:bg-surface-hover flex items-center gap-2 transition-colors"
              >
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold">
                  +
                </span>
                Créer «&thinsp;{query.trim()}&thinsp;»
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

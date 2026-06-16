"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { searchAccounts } from "@/app/(app)/missions/_actions/search-accounts"
import { cn } from "@/lib/utils"
import { Combobox, ComboboxOption } from "@/components/ui/Combobox"

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
  const [isLoading, setIsLoading] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

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
    }, 280)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  const handleSelect = (account: { id: string; name: string }) => {
    setQuery(account.name)
    setResults([])
    onChange({ id: account.id, name: account.name, isNew: false })
  }

  const handleCreateNew = () => {
    setQuery(query.trim())
    setResults([])
    onChange({ id: null, name: query.trim(), isNew: true })
  }

  const updateQuery = (val: string) => {
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
    }
  }

  // Affiche l'option "Créer" si la saisie ne correspond à aucun résultat exact
  const showCreateOption =
    query.trim().length >= 2 &&
    !results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase())

  const isConfirmed = value !== null

  const options = useMemo<ComboboxOption[]>(() => {
    const accountOptions = results.map((account) => ({
      id: account.id,
      label: account.name,
      kind: "option" as const,
    }))

    if (!showCreateOption) return accountOptions

    return [
      ...accountOptions,
      {
        id: "__create__",
        label: `Créer « ${query.trim()} »`,
        description: "Créer un nouveau compte à partir de cette saisie",
        kind: "action" as const,
      },
    ]
  }, [results, showCreateOption, query])

  const rightStatus = value?.isNew ? (
    <span className="rounded-[var(--radius-small)] bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
      Nouveau
    </span>
  ) : value && !value.isNew ? (
    <span className="text-primary/70" aria-hidden="true">
      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </span>
  ) : null

  return (
    <Combobox
      type="text"
      value={query}
      onValueChange={updateQuery}
      options={query.trim().length >= 2 ? options : []}
      onSelect={(option) => {
        if (option.id === "__create__") {
          handleCreateNew()
          return
        }
        handleSelect({ id: option.id, name: option.label })
      }}
      placeholder="Tapez le nom du client…"
      autoComplete="off"
      loading={isLoading}
      canOpen={query.trim().length >= 2}
      loadingMessage="Recherche…"
      emptyMessage="Aucun résultat"
      clearable={Boolean(query || value)}
      onClear={() => {
        setQuery("")
        setResults([])
        setIsLoading(false)
        onChange(null)
      }}
      rightStatus={rightStatus}
      className={cn(isConfirmed && "border-primary/50", className)}
      renderOption={(option, state) => (
        <div className="flex min-w-0 items-start gap-2">
          {option.kind === "action" ? (
            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
              +
            </span>
          ) : null}
          <div className="flex min-w-0 flex-col">
            <span className={cn("truncate text-xs", option.kind === "action" ? "font-semibold text-primary" : state.active ? "font-medium text-heading" : "font-medium text-body")}>
              {option.label}
            </span>
            {option.description ? (
              <span className="truncate text-[11px] text-muted">{option.description}</span>
            ) : null}
          </div>
        </div>
      )}
    />
  )
}

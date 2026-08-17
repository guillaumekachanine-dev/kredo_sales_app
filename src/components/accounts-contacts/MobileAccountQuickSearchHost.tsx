"use client"

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/Input"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { cn } from "@/lib/utils"
import { fold } from "@/lib/search/normalize"
import {
  MOBILE_PRIORITY_ACCOUNT_LIMIT,
  getMobilePriorityAccountsChangeEvent,
} from "@/lib/accounts-contacts/mobile-account-custom-list"
import {
  useMobileAccountQuickSearch,
  type MobileAccountQuickSearchPreset,
} from "@/hooks/use-mobile-account-quick-search"
import { useCrmTabStore } from "@/lib/tabs/crm-tab-store"

const PRESET_OPTIONS: Array<{ id: MobileAccountQuickSearchPreset; label: string }> = [
  { id: "list", label: "Liste" },
  { id: "custom", label: "Personnalisé" },
  { id: "campaign", label: "Campagne" },
  { id: "news", label: "Actualité" },
]

function scoreLabel(score: number | null) {
  return score === null ? "—" : `${score}/5`
}

function filterEntriesByPreset(
  preset: MobileAccountQuickSearchPreset,
  pinnedIds: string[],
  query: string,
  entries: ReturnType<typeof useMobileAccountQuickSearch.getState>["entries"],
) {
  if (preset === "campaign") return entries.filter((entry) => entry.hasCampaign)
  if (preset === "news") return entries.filter((entry) => entry.hasNews)
  if (preset === "custom" && query.length === 0) {
    const pinned = new Set(pinnedIds)
    return entries.filter((entry) => pinned.has(entry.id))
  }
  return entries
}

function rankEntry(entry: ReturnType<typeof useMobileAccountQuickSearch.getState>["entries"][number], needle: string) {
  if (!needle) return 0

  const name = fold(entry.name)
  const sector = fold(entry.sector)
  const segment = fold(entry.segment)

  if (name.startsWith(needle)) return 0
  if (name.includes(needle)) return 1
  if (sector.startsWith(needle)) return 2
  if (segment.startsWith(needle)) return 3
  if (sector.includes(needle) || segment.includes(needle)) return 4
  return 99
}

export function MobileAccountQuickSearchHost() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [customListNotice, setCustomListNotice] = useState<string | null>(null)
  const { openTab } = useCrmTabStore()
  const {
    isOpen,
    query,
    preset,
    entries,
    pinnedIds,
    loadStatus,
    errorMessage,
    close,
    setQuery,
    setPreset,
    hydratePinnedIds,
    togglePinnedAccount,
  } = useMobileAccountQuickSearch()

  const deferredQuery = useDeferredValue(query)
  const foldedNeedle = fold(deferredQuery)

  useEffect(() => {
    hydratePinnedIds()

    const syncPinnedIds = () => hydratePinnedIds()
    const customEventName = getMobilePriorityAccountsChangeEvent()

    window.addEventListener("storage", syncPinnedIds)
    window.addEventListener(customEventName, syncPinnedIds)

    return () => {
      window.removeEventListener("storage", syncPinnedIds)
      window.removeEventListener(customEventName, syncPinnedIds)
    }
  }, [hydratePinnedIds])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 30)

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }

    window.addEventListener("keydown", handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.clearTimeout(timer)
      window.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, close])

  useEffect(() => {
    if (!customListNotice) return
    const timer = window.setTimeout(() => setCustomListNotice(null), 2200)
    return () => window.clearTimeout(timer)
  }, [customListNotice])

  const visibleEntries = useMemo(() => {
    const baseEntries = filterEntriesByPreset(preset, pinnedIds, foldedNeedle, entries)

    const filteredEntries = foldedNeedle
      ? baseEntries.filter((entry) =>
          fold(`${entry.name} ${entry.sector} ${entry.segment}`).includes(foldedNeedle),
        )
      : baseEntries

    const pinnedSet = new Set(pinnedIds)

    return [...filteredEntries]
      .sort((left, right) => {
        if (preset === "custom" && pinnedSet.has(left.id) !== pinnedSet.has(right.id)) {
          return pinnedSet.has(left.id) ? -1 : 1
        }

        const rankDiff = rankEntry(left, foldedNeedle) - rankEntry(right, foldedNeedle)
        if (rankDiff !== 0) return rankDiff

        if (left.hasCampaign !== right.hasCampaign) return left.hasCampaign ? -1 : 1
        if (left.hasNews !== right.hasNews) return left.hasNews ? -1 : 1
        return left.name.localeCompare(right.name)
      })
      .slice(0, foldedNeedle ? 24 : 18)
  }, [entries, foldedNeedle, pinnedIds, preset])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 pb-[calc(var(--layout-bottom-nav-height)+1.25rem)] pt-10">
      <button
        type="button"
        aria-label="Fermer le sélecteur de comptes"
        onClick={close}
        className="absolute inset-0 bg-heading/58 backdrop-blur-md"
      />

      <div className="relative z-10 flex w-full max-w-xl flex-col gap-4 rounded-[28px] border border-white/12 bg-[#0c1732]/92 px-4 py-4 text-white shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
              Comptes & contacts
            </p>
            <h2 className="mt-1 text-lg font-bold leading-tight text-white">
              Rechercher un compte
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/10 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
            aria-label="Fermer"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tapez le nom du compte à consulter…"
          autoComplete="off"
          spellCheck={false}
          fullWidth
          leftElement={
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
            </svg>
          }
          rightElement={
            loadStatus === "loading" ? (
              <span className="mr-1 inline-flex size-4 rounded-full border border-white/40 border-t-transparent animate-spin" />
            ) : null
          }
          className="h-14 rounded-[22px] border-white/14 bg-white/[0.07] text-base font-semibold text-white placeholder:text-white/35"
        />

        <div className="flex flex-wrap gap-2">
          {PRESET_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setPreset(option.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors",
                preset === option.id
                  ? "border-[#6ea7ff] bg-[#1f5ba8] text-white"
                  : "border-white/12 bg-white/[0.05] text-white/68 hover:text-white",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {preset === "custom" ? (
          <p className="text-[11px] leading-relaxed text-white/62">
            Gérez ici votre liste prioritaire de {MOBILE_PRIORITY_ACCOUNT_LIMIT} comptes max. Touchez l&apos;épingle pour ajouter ou retirer un compte.
          </p>
        ) : null}

        <div className="max-h-[min(48vh,26rem)] overflow-y-auto rounded-[22px] border border-white/10 bg-black/10">
          {errorMessage ? (
            <div className="px-4 py-5 text-sm text-white/70">{errorMessage}</div>
          ) : null}

          {!errorMessage && loadStatus === "loading" && entries.length === 0 ? (
            <div className="px-4 py-5 text-sm text-white/70">Chargement des comptes…</div>
          ) : null}

          {!errorMessage && loadStatus !== "loading" && visibleEntries.length === 0 ? (
            <div className="px-4 py-5 text-sm text-white/70">
              {preset === "custom" && pinnedIds.length === 0 && !foldedNeedle
                ? "Aucun compte prioritaire enregistré pour le moment."
                : "Aucun compte ne correspond à cette recherche."}
            </div>
          ) : null}

          {!errorMessage && visibleEntries.length > 0 ? (
            <div className="divide-y divide-white/10">
              {visibleEntries.map((entry) => {
                const isPinned = pinnedIds.includes(entry.id)

                return (
                  <div key={entry.id} className="flex items-center gap-2 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        close()
                        openTab({
                          entityType: "company-intelligence",
                          entityId: entry.id,
                          title: entry.name,
                        })
                        router.push("/prospection/accounts")
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <CompanyLogo
                        name={entry.name}
                        logoPath={entry.logoPath}
                        website={entry.website}
                        size="sm"
                        className="shrink-0 border-white/12 bg-white"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-white">
                          {entry.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-white/55">
                          {entry.sector} · {entry.segment} · Score {scoreLabel(entry.score)}
                          {entry.hasCampaign ? " · Campagne" : ""}
                          {entry.hasNews ? " · Actualité" : ""}
                        </span>
                      </span>
                    </button>

                    {preset === "custom" ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const result = await togglePinnedAccount(entry.id)
                          if (result === "limit") {
                            setCustomListNotice(`Maximum ${MOBILE_PRIORITY_ACCOUNT_LIMIT} comptes`)
                          } else if (result === "error") {
                            setCustomListNotice("Impossible d'enregistrer cette liste pour le moment")
                          }
                        }}
                        aria-pressed={isPinned}
                        aria-label={isPinned ? "Retirer de la liste personnalisée" : "Ajouter à la liste personnalisée"}
                        className={cn(
                          "inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
                          isPinned
                            ? "border-[#8ec5ff] bg-[#2558a8] text-white"
                            : "border-white/12 bg-white/[0.05] text-white/62 hover:text-white",
                        )}
                      >
                        <svg className="size-4" fill={isPinned ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.75l-5.29 3.12 1.41-6.02L3.5 10.6l6.09-.52L12 4.5l2.41 5.58 6.09.52-4.62 4.25 1.41 6.02L12 17.75z" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>

        {customListNotice ? (
          <p className="text-center text-[11px] font-semibold text-[#ffd18b]">{customListNotice}</p>
        ) : null}
      </div>
    </div>
  )
}

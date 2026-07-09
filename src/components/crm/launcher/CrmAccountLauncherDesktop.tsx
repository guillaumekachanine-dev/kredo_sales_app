"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { CrmLauncherSearchBox } from "./CrmLauncherSearchBox"
import { CrmLauncherModeTabs } from "./CrmLauncherModeTabs"
import { CrmLauncherDestinationTabs } from "./CrmLauncherDestinationTabs"
import { CrmLauncherAccountCard } from "./CrmLauncherAccountCard"
import type { CrmLauncherAccount, CrmLauncherDestination, CrmLauncherMode } from "./CrmAccountLauncher"

interface CrmAccountLauncherDesktopProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  destination: CrmLauncherDestination
  onDestinationChange: (dest: CrmLauncherDestination) => void
  mode: CrmLauncherMode
  onModeChange: (mode: CrmLauncherMode) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  accounts: CrmLauncherAccount[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onSelectAccount: (account: CrmLauncherAccount) => void
}

export function CrmAccountLauncherDesktop({
  open,
  onOpenChange,
  destination,
  onDestinationChange,
  mode,
  onModeChange,
  searchQuery,
  onSearchChange,
  accounts,
  loading,
  error,
  onRetry,
  onSelectAccount,
}: CrmAccountLauncherDesktopProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        onOpenChange(false)
      }
    }

    const handleCancel = (e: Event) => {
      e.preventDefault()
      onOpenChange(false)
    }

    dialog.addEventListener("keydown", handleKeyDown)
    dialog.addEventListener("cancel", handleCancel)
    return () => {
      dialog.removeEventListener("keydown", handleKeyDown)
      dialog.removeEventListener("cancel", handleCancel)
    }
  }, [open, onOpenChange])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onOpenChange(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={cn(
        "fixed inset-0 m-auto flex flex-col h-[520px] w-[500px] max-w-full overflow-hidden rounded-[var(--radius-large)] border border-border bg-surface p-5 text-heading shadow-xl",
        "backdrop:bg-heading/30 backdrop:backdrop-blur-sm",
        "open:animate-in open:fade-in open:zoom-in-95 duration-200 outline-none",
        "z-[9999]"
      )}
    >
      <div className="flex flex-col h-full gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <svg
              className="w-4 h-4 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            CRM Launcher
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted hover:text-heading transition-colors"
            aria-label="Fermer"
          >
            <svg
              className="w-4 h-4"
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
        </div>

        {/* Search & Liste complète */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <CrmLauncherSearchBox value={searchQuery} onChange={onSearchChange} />
          </div>
          <Link
            href="/prospection/accounts?tab=accounts"
            prefetch={false}
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-white shadow-sm hover:bg-primary/95 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] shrink-0 whitespace-nowrap h-[38px]"
          >
            <svg
              className="w-3.5 h-3.5 text-white shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
            Liste complète
          </Link>
        </div>

        {/* Modes de liste directement sous la recherche */}
        <CrmLauncherModeTabs activeMode={mode} onChange={onModeChange} />

        {/* Content list */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-[60px] rounded-[var(--radius-medium)] bg-canvas/60 animate-pulse border border-border/20"
                />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-6">
              <p className="text-xs text-danger">{error}</p>
              <button
                onClick={onRetry}
                className="text-[10px] font-bold px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Réessayer
              </button>
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <svg
                className="w-8 h-8 text-muted/50 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 12H4"
                />
              </svg>
              <p className="text-xs text-muted">Aucun compte trouvé</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {accounts.map((account) => (
                <CrmLauncherAccountCard
                  key={account.id}
                  account={account}
                  mode={mode}
                  onSelect={() => onSelectAccount(account)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </dialog>
  )
}

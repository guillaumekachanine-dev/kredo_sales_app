"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { CrmLauncherSearchBox } from "./CrmLauncherSearchBox"
import { CrmLauncherModeTabs } from "./CrmLauncherModeTabs"
import { CrmLauncherDestinationTabs } from "./CrmLauncherDestinationTabs"
import { CrmLauncherAccountCard } from "./CrmLauncherAccountCard"
import type { CrmLauncherAccount, CrmLauncherDestination, CrmLauncherMode } from "./CrmAccountLauncher"

interface CrmAccountLauncherMobileProps {
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

export function CrmAccountLauncherMobile({
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
}: CrmAccountLauncherMobileProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      if (!dialog.open) {
        dialog.showModal()
        // Empêcher le scroll du body sous la modale
        document.body.style.overflow = "hidden"
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !open) return

    const handleCancel = (e: Event) => {
      e.preventDefault()
      onOpenChange(false)
    }

    dialog.addEventListener("cancel", handleCancel)
    return () => {
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
        "fixed inset-x-0 bottom-0 top-12 m-0 flex flex-col h-[calc(100dvh-3rem)] w-full overflow-hidden rounded-t-2xl border-t border-border bg-surface p-4 text-heading shadow-2xl",
        "backdrop:bg-heading/30 backdrop:backdrop-blur-sm",
        "open:animate-slide-up duration-300 outline-none",
        "z-[9999]"
      )}
    >
      <div className="flex flex-col h-full gap-3.5">
        {/* Handle de bottom sheet pour donner l'aspect mobile */}
        <div className="w-10 h-1 bg-border/80 rounded-full mx-auto shrink-0 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
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
            className="w-8 h-8 rounded-full bg-canvas flex items-center justify-center text-muted hover:text-heading transition-colors"
            style={{ minHeight: "44px", minWidth: "44px" }}
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

        {/* Search */}
        <div className="shrink-0">
          <CrmLauncherSearchBox value={searchQuery} onChange={onSearchChange} />
        </div>

        {/* Configuration Actions & Modes */}
        <div className="flex flex-col gap-3.5 shrink-0">
          <CrmLauncherDestinationTabs
            activeDestination={destination}
            onChange={onDestinationChange}
          />
          <CrmLauncherModeTabs activeMode={mode} onChange={onModeChange} />
        </div>

        {/* Content list (défilement tactile fluide) */}
        <div className="flex-1 overflow-y-auto overscroll-contain pr-1 min-h-0">
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-[68px] rounded-[var(--radius-medium)] bg-canvas/60 animate-pulse border border-border/20"
                />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-6">
              <p className="text-xs text-danger">{error}</p>
              <button
                onClick={onRetry}
                className="text-xs font-bold px-4 py-2.5 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                style={{ minHeight: "44px" }}
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
            <div className="flex flex-col gap-2 pb-6">
              {accounts.map((account) => (
                <div key={account.id} className="active:scale-[0.99] transition-transform">
                  <CrmLauncherAccountCard
                    account={account}
                    mode={mode}
                    onSelect={() => onSelectAccount(account)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/40 pt-3 flex items-center justify-between shrink-0 pb-4">
          <span className="text-[10px] text-muted">
            {accounts.length} compte{accounts.length > 1 ? "s" : ""} disponible{accounts.length > 1 ? "s" : ""}
          </span>
          <Link
            href="/prospection/accounts?tab=accounts"
            prefetch={false}
            onClick={() => onOpenChange(false)}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 py-2 px-3 bg-primary/5 rounded-full"
            style={{ minHeight: "44px" }}
          >
            Liste complète
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    </dialog>
  )
}

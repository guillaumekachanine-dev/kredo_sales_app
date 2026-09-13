"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import {
  ACCOUNT_WATCH_CADENCE_LABELS,
  ACCOUNT_WATCH_LEVEL_LABELS,
} from "@/lib/intelligence/account-watch-settings"
import { cn } from "@/lib/utils"
import { AccountSignalsCard } from "./AccountKnowledgeBlocks"
import { AccountWatchHeaderActions } from "./AccountWatchHeaderActions"
import { AccountWatchSettingsDialog } from "./AccountWatchSettingsDialog"
import { saveAccountWatchSettings } from "./save-account-watch-settings"

const WATCH_STATUS_LABELS = {
  queued: "En file d’attente",
  running: "Mise à jour en cours",
  succeeded: "Dernière mise à jour réussie",
  failed: "Dernière mise à jour en échec",
} as const

type Feedback = {
  message: string
  tone: "info" | "success" | "error"
} | null

/** Grand contrôle switch — volontairement plus visible qu'un toggle de
 *  formulaire classique (cf. section 6 du chantier « Shell Mobile »). Local à
 *  cet écran : ce n'est pas un composant partagé, seul le langage de couleurs
 *  (border-primary/bg-primary) reprend celui du `Switch` de
 *  WatchSettingsDialogShell. */
function BigWatchSwitch({
  checked,
  label,
  onToggle,
  disabled,
}: {
  checked: boolean
  label: string
  onToggle: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      disabled={disabled}
      className="inline-flex min-h-11 items-center gap-4 disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-11 w-20 shrink-0 items-center rounded-full border-2 transition-colors duration-200",
          checked ? "border-primary bg-primary" : "border-edito-border bg-edito-chip",
        )}
      >
        <span
          className={cn(
            "block size-9 rounded-full bg-white shadow-sm transition-transform duration-200 motion-reduce:transition-none",
            checked ? "translate-x-[38px]" : "translate-x-1",
          )}
        />
      </span>
      <span className="text-base font-bold text-edito-heading">{label}</span>
    </button>
  )
}

export function AccountWatchMobileTab({ data }: { data: ClientIntelligenceData }) {
  const router = useRouter()
  const { accountWatch, company } = data
  const [isEnabled, setIsEnabled] = useState(accountWatch.isEnabled)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const statusLabel = accountWatch.lastStatus
    ? WATCH_STATUS_LABELS[accountWatch.lastStatus]
    : "Aucune mise à jour exécutée"

  async function handleToggle() {
    if (pending) return
    const next = !isEnabled
    const previous = isEnabled
    setIsEnabled(next)
    setPending(true)
    setFeedback(null)
    const result = await saveAccountWatchSettings(company.id, {
      isEnabled: next,
      watchLevel: accountWatch.watchLevel,
    })
    setPending(false)
    if (result.error) {
      setIsEnabled(previous)
      setFeedback({ message: result.error, tone: "error" })
      return
    }
    router.refresh()
  }

  if (!isEnabled) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <BigWatchSwitch checked={false} label="Activer la veille" onToggle={handleToggle} disabled={pending} />
        {feedback ? (
          <p
            role="status"
            className={cn(
              "text-[11px] font-semibold",
              feedback.tone === "error" ? "text-danger" : "text-edito-muted",
            )}
          >
            {feedback.message}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-col items-center gap-3 border-y border-edito-border bg-edito-surface px-4 py-6 text-center">
        <BigWatchSwitch checked label="Veille activée" onToggle={handleToggle} disabled={pending} />
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-edito-border bg-edito-surface px-4 text-xs font-bold text-primary transition-colors hover:bg-primary/[0.035] active:scale-98 cursor-pointer"
        >
          Paramétrer la veille
        </button>

        {feedback ? (
          <p
            role="status"
            className={cn(
              "text-[11px] font-semibold",
              feedback.tone === "success"
                ? "text-success"
                : feedback.tone === "error"
                  ? "text-danger"
                  : "text-info",
            )}
          >
            {feedback.message}
          </p>
        ) : null}
      </section>

      <section className="space-y-4 border-y border-edito-border bg-edito-surface px-4 py-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-success">
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
              Veille active
            </span>
            <span className="text-[10px] font-semibold text-edito-muted">
              {ACCOUNT_WATCH_LEVEL_LABELS[accountWatch.watchLevel]} · {ACCOUNT_WATCH_CADENCE_LABELS[accountWatch.cadence]}
            </span>
          </div>
          <p className="text-xs font-semibold text-edito-heading">{statusLabel}</p>
          {accountWatch.lastError ? (
            <p className="text-[11px] leading-relaxed text-danger">{accountWatch.lastError}</p>
          ) : null}
        </div>

        <AccountWatchHeaderActions
          companyId={company.id}
          companyName={company.name}
          companyLogoPath={company.logoPath}
          companyWebsite={company.website}
          onFeedback={(message, tone) => setFeedback({ message, tone })}
          hideSettingsButton
        />
      </section>

      <div className="px-4">
        <AccountSignalsCard
          signals={data.accountSignals}
          isMobile
          companyId={company.id}
          companyName={company.name}
          lastUpdatedAt={accountWatch.lastRunAt}
        />
      </div>

      <AccountWatchSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        companyId={company.id}
        companyName={company.name}
        companyLogoPath={company.logoPath}
        companyWebsite={company.website}
        onBack={() => setSettingsOpen(false)}
        onReturnToCockpit={() => setSettingsOpen(false)}
      />
    </div>
  )
}

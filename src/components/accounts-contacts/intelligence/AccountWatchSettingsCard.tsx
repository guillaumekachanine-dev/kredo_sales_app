"use client"

import { useState, useTransition, type ReactNode } from "react"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { cn } from "@/lib/utils"
import {
  ACCOUNT_WATCH_LEVELS,
  ACCOUNT_WATCH_CADENCE_LABELS,
  ACCOUNT_WATCH_LEVEL_LABELS,
  cadenceForWatchLevel,
  type AccountWatchLevel,
  type AccountWatchSettingsState,
} from "@/lib/intelligence/account-watch-settings"
import type { AccountWatchOverview } from "@/lib/intelligence/intelligence-data"
import { estimateMonthlyWatchCost } from "@/lib/intelligence/client-intelligence-home"
import { SectionBlock } from "./intelligence-parts"
import { saveAccountWatchSettings } from "./save-account-watch-settings"

type AccountWatchSettingsCardProps = {
  companyId: string
  initialSettings: AccountWatchSettingsState
  overview?: AccountWatchOverview
  desktopSignals?: ReactNode
  isMobile?: boolean
  variant?: "default" | "desktopHome"
}

type FeedbackState =
  | { tone: "success" | "error"; message: string }
  | null

const LAST_STATUS_LABELS: Record<NonNullable<AccountWatchSettingsState["lastStatus"]>, string> = {
  queued: "En file d'attente",
  running: "En cours",
  succeeded: "Succès",
  failed: "Échec",
}

function formatDateTime(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function hasSettingsChanged(a: AccountWatchSettingsState, b: AccountWatchSettingsState): boolean {
  return a.isEnabled !== b.isEnabled || a.watchLevel !== b.watchLevel || a.cadence !== b.cadence
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold text-heading">{value}</span>
    </div>
  )
}

function formatCurrency(value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(value)
}

export function AccountWatchSettingsCard({
  companyId,
  initialSettings,
  overview,
  desktopSignals,
  isMobile = false,
  variant = "default",
}: AccountWatchSettingsCardProps) {
  const [savedSettings, setSavedSettings] = useState(initialSettings)
  const [draft, setDraft] = useState(initialSettings)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [isSaving, startSavingTransition] = useTransition()
  const [isRefreshing, startRefreshingTransition] = useTransition()

  const isDirty = hasSettingsChanged(draft, savedSettings)
  const isBusy = isSaving || isRefreshing
  const updatedAtLabel = formatDateTime(savedSettings.updatedAt)
  const lastRunAtLabel = formatDateTime(savedSettings.lastRunAt)
  const nextRunAtLabel = formatDateTime(savedSettings.nextRunAt)
  const lastStatusLabel = savedSettings.lastStatus ? LAST_STATUS_LABELS[savedSettings.lastStatus] : null
  const isDesktopHome = variant === "desktopHome" && !isMobile
  const estimatedMonthlyCost = estimateMonthlyWatchCost(overview?.averageCostPerRun ?? null, draft.cadence)

  function handleToggle() {
    setFeedback(null)
    setDraft((current) => ({ ...current, isEnabled: !current.isEnabled }))
  }

  function handleLevelChange(nextLevel: AccountWatchLevel) {
    setFeedback(null)
    setDraft((current) => ({
      ...current,
      watchLevel: nextLevel,
      cadence: cadenceForWatchLevel(nextLevel),
    }))
  }

  function handleSave() {
    setFeedback(null)
    startSavingTransition(async () => {
      const result = await saveAccountWatchSettings(companyId, {
        isEnabled: draft.isEnabled,
        watchLevel: draft.watchLevel,
      })

      if (result.error || !result.data) {
        setFeedback({
          tone: "error",
          message: result.error ?? "Impossible d'enregistrer la veille du compte.",
        })
        return
      }

      setSavedSettings(result.data)
      setDraft(result.data)
      setFeedback({
        tone: "success",
        message: "Paramètres de veille enregistrés.",
      })
    })
  }

  function handleRefresh() {
    setFeedback(null)
    startRefreshingTransition(async () => {
      try {
        const response = await fetch(`/api/intelligence/accounts/${companyId}/watch-refresh`, {
          method: "POST",
        })

        const payload = (await response.json().catch(() => null)) as
          | { runId?: string; error?: string }
          | null

        if (!response.ok || !payload?.runId) {
          setFeedback({
            tone: "error",
            message:
              payload?.error ?? "Impossible de lancer la mise à jour de veille pour le moment.",
          })
          return
        }

        setSavedSettings((current) => ({
          ...current,
          exists: true,
          lastStatus: "queued",
          lastError: null,
          updatedAt: new Date().toISOString(),
        }))
        setFeedback({
          tone: "success",
          message: "Mise à jour lancée. Le run a été mis en file d'attente.",
        })
      } catch {
        setFeedback({
          tone: "error",
          message: "Impossible de lancer la mise à jour de veille pour le moment.",
        })
      }
    })
  }

  if (isDesktopHome) {
    const stateLabel = draft.isEnabled
      ? `Active / ${ACCOUNT_WATCH_LEVEL_LABELS[draft.watchLevel]} / ${ACCOUNT_WATCH_CADENCE_LABELS[draft.cadence]}`
      : "Inactive"

    return (
      <SectionBlock
        title="Veille du compte"
        className="h-full"
        action={
          <span className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide",
            draft.isEnabled
              ? "border-success/30 bg-success/10 text-white"
              : "border-white/25 bg-white/5 text-white/75",
          )}>
            {stateLabel}
          </span>
        }
      >
        <div className="space-y-4 py-4">
          <div className="rounded-md border border-edito-border bg-edito-canvas/70 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-edito-heading">
                  Paramétrer la veille
                </h4>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-edito-body">
                  Active une surveillance ciblée du compte et enregistre le niveau souhaité avant la prochaine exécution.
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-edito-muted">
                  État enregistré : {savedSettings.isEnabled ? "active" : "inactive"}
                </p>
              </div>
              <Button
                variant={draft.isEnabled ? "secondary" : "primary"}
                size="sm"
                onClick={handleToggle}
                disabled={isBusy}
                role="switch"
                aria-checked={draft.isEnabled}
                className="min-h-10 shrink-0"
              >
                {draft.isEnabled ? "Désactiver" : "Activer"}
              </Button>
            </div>

            <div className={cn(
              "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
              draft.isEnabled ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}>
              <div className="overflow-hidden" aria-hidden={!draft.isEnabled} inert={!draft.isEnabled}>
                <div className="grid gap-4 border-t border-edito-border pt-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label htmlFor="account-watch-level-home" className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                        Niveau de veille
                      </label>
                      <Select
                        id="account-watch-level-home"
                        value={draft.watchLevel}
                        onChange={(event) => handleLevelChange(event.target.value as AccountWatchLevel)}
                        disabled={isBusy}
                      >
                        {ACCOUNT_WATCH_LEVELS.map((level) => (
                          <option key={level} value={level}>{ACCOUNT_WATCH_LEVEL_LABELS[level]}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="rounded border border-edito-border bg-edito-surface px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Cadence correspondante</p>
                      <p className="mt-1 text-xs font-semibold text-edito-heading">
                        {ACCOUNT_WATCH_CADENCE_LABELS[draft.cadence]}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded border border-edito-border bg-edito-surface p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Coût moyen par run</p>
                      <p className="mt-1 text-sm font-bold text-edito-heading">
                        {overview?.averageCostPerRun === null || overview?.averageCostPerRun === undefined
                          ? "Estimation indisponible"
                          : formatCurrency(overview.averageCostPerRun, 4)}
                      </p>
                      <p className="mt-1 text-[10px] leading-relaxed text-edito-muted">
                        Estimation basée sur le coût moyen historique des exécutions.
                      </p>
                    </div>
                    <div className="rounded border border-edito-border bg-edito-surface p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Estimation mensuelle</p>
                      <p className="mt-1 text-sm font-bold text-edito-heading">
                        {estimatedMonthlyCost === null ? "Estimation indisponible" : formatCurrency(estimatedMonthlyCost, 2)}
                      </p>
                      <p className="mt-1 text-[10px] text-edito-muted">
                        Pour la cadence {ACCOUNT_WATCH_CADENCE_LABELS[draft.cadence].toLowerCase()}.
                      </p>
                    </div>
                    <div className="rounded border border-edito-border bg-edito-surface p-3 sm:col-span-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Sources surveillées</p>
                        <span className="text-xs font-bold text-edito-heading">
                          {overview?.capturedSignalsCount ?? 0} signaux captés
                        </span>
                      </div>
                      {overview?.monitoredSourceLabels.length ? (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {overview.monitoredSourceLabels.map((label) => (
                            <li key={label} className="rounded border border-edito-border bg-edito-chip px-2 py-1 text-[10px] font-semibold text-edito-body">
                              {label}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-edito-muted">Aucune source surveillée.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 rounded border border-edito-border bg-edito-surface p-3 sm:grid-cols-2">
                  {lastRunAtLabel ? <MetaRow label="Dernière exécution" value={lastRunAtLabel} /> : null}
                  {nextRunAtLabel ? <MetaRow label="Prochaine exécution" value={nextRunAtLabel} /> : null}
                  {lastStatusLabel ? <MetaRow label="Statut du dernier run" value={lastStatusLabel} /> : null}
                  {updatedAtLabel ? <MetaRow label="Paramètres mis à jour" value={updatedAtLabel} /> : null}
                  {!lastRunAtLabel && !nextRunAtLabel && !lastStatusLabel ? (
                    <p className="text-xs text-edito-muted sm:col-span-2">Aucune exécution horodatée pour le moment.</p>
                  ) : null}
                  {savedSettings.lastError ? (
                    <p className="rounded border border-danger/25 bg-danger/5 px-2.5 py-2 text-[11px] text-danger sm:col-span-2">
                      {savedSettings.lastError}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {feedback ? (
              <p className={cn("mt-3 text-[11px] font-medium", feedback.tone === "success" ? "text-success" : "text-danger")}>
                {feedback.message}
              </p>
            ) : null}

            <div className="mt-4 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                loading={isSaving}
                loadingLabel="Enregistrement"
                disabled={!isDirty || isRefreshing}
              >
                Sauvegarder les paramètres
              </Button>
            </div>
          </div>
          {desktopSignals}
        </div>
      </SectionBlock>
    )
  }

  const content = (
    <div className={cn("space-y-4", isMobile ? "space-y-3" : "")}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                draft.isEnabled
                  ? "border-success/25 bg-success/10 text-success"
                  : "border-border bg-canvas/50 text-muted",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  draft.isEnabled ? "bg-success" : "bg-muted",
                )}
                aria-hidden="true"
              />
              {draft.isEnabled ? "Veille active" : "Veille inactive"}
            </span>
            {!savedSettings.exists ? (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Valeurs par défaut
              </span>
            ) : null}
          </div>
          <p className="text-xs text-body">
            Active une veille dédiée pour ce compte et déclenche une mise à jour à la demande.
          </p>
        </div>

        {!isMobile ? (
          <Button
            variant={draft.isEnabled ? "secondary" : "primary"}
            size="sm"
            onClick={handleToggle}
            disabled={isBusy}
            role="switch"
            aria-checked={draft.isEnabled}
            className="shrink-0"
          >
            {draft.isEnabled ? "Désactiver" : "Activer"}
          </Button>
        ) : null}
      </div>

      {isMobile ? (
        <Button
          variant={draft.isEnabled ? "secondary" : "primary"}
          size="sm"
          onClick={handleToggle}
          disabled={isBusy}
          role="switch"
          aria-checked={draft.isEnabled}
          fullWidth
        >
          {draft.isEnabled ? "Désactiver la veille" : "Activer la veille"}
        </Button>
      ) : null}

      <div className={cn("grid gap-3", isMobile ? "grid-cols-1" : "md:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)]")}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor={isMobile ? "account-watch-level-mobile" : "account-watch-level-desktop"}
              className="text-[10px] font-bold uppercase tracking-wider text-muted"
            >
              Niveau de veille
            </label>
            <Select
              id={isMobile ? "account-watch-level-mobile" : "account-watch-level-desktop"}
              value={draft.watchLevel}
              onChange={(event) => handleLevelChange(event.target.value as AccountWatchLevel)}
              disabled={isBusy}
            >
              {ACCOUNT_WATCH_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {ACCOUNT_WATCH_LEVEL_LABELS[level]}
                </option>
              ))}
            </Select>
          </div>

          <div className="rounded border border-border/60 bg-canvas/40 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Cadence</p>
            <p className="mt-1 text-xs font-semibold text-heading">
              {ACCOUNT_WATCH_CADENCE_LABELS[draft.cadence]}
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded border border-border/60 bg-canvas/30 px-3 py-3">
          <MetaRow
            label="Niveau"
            value={ACCOUNT_WATCH_LEVEL_LABELS[draft.watchLevel]}
          />
          <MetaRow
            label="Cadence"
            value={ACCOUNT_WATCH_CADENCE_LABELS[draft.cadence]}
          />
          {updatedAtLabel ? <MetaRow label="Dernière mise à jour" value={updatedAtLabel} /> : null}
          {lastStatusLabel ? <MetaRow label="Dernier statut" value={lastStatusLabel} /> : null}
          {lastRunAtLabel ? <MetaRow label="Dernier run" value={lastRunAtLabel} /> : null}
          {nextRunAtLabel ? <MetaRow label="Prochain run prévu" value={nextRunAtLabel} /> : null}
          {savedSettings.lastError ? (
            <p className="rounded border border-danger/25 bg-danger/5 px-2.5 py-2 text-[11px] text-danger">
              {savedSettings.lastError}
            </p>
          ) : null}
        </div>
      </div>

      {feedback ? (
        <p
          className={cn(
            "text-[11px] font-medium",
            feedback.tone === "success" ? "text-success" : "text-danger",
          )}
        >
          {feedback.message}
        </p>
      ) : null}

      {isDirty ? (
        <p className="text-[11px] text-muted">
          Sauvegarde les paramètres avant de lancer une mise à jour manuelle.
        </p>
      ) : null}

      <div className={cn("flex gap-2", isMobile ? "flex-col" : "justify-end")}>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          loading={isRefreshing}
          loadingLabel="Lancement"
          disabled={isDirty || isSaving}
          fullWidth={isMobile}
        >
          Mettre à jour maintenant
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          loading={isSaving}
          loadingLabel="Enregistrement"
          disabled={!isDirty || isRefreshing}
          fullWidth={isMobile}
        >
          Sauvegarder les paramètres
        </Button>
      </div>
    </div>
  )

  if (isMobile) {
    return <div className="rounded-lg border border-border bg-surface p-4">{content}</div>
  }

  return <SectionBlock title="Veille du compte">{content}</SectionBlock>
}

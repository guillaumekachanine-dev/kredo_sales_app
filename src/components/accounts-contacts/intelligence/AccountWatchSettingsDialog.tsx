"use client"

import { useEffect, useState, useTransition } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Select } from "@/components/ui/Select"
import {
  ACCOUNT_WATCH_CADENCE_LABELS,
  ACCOUNT_WATCH_CATEGORIES,
  ACCOUNT_WATCH_LEVEL_LABELS,
  ACCOUNT_WATCH_LEVELS,
  cadenceForWatchLevel,
  DEFAULT_ACCOUNT_WATCH_DETAILED_SETTINGS,
  type AccountWatchDetailedSettings,
  type AccountWatchLevel,
} from "@/lib/intelligence/account-watch-settings"
import {
  loadAccountWatchDetailedSettings,
  saveAccountWatchDetailedSettings,
} from "./save-account-watch-settings"

type AccountWatchSettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companyName: string
}

const SOURCE_OPTIONS = [
  { key: "includeOfficialSite", label: "Site officiel" },
  { key: "includeNews", label: "Presse & actualités" },
  { key: "includePublicRecords", label: "Registres publics" },
  { key: "includeTenders", label: "Appels d’offres" },
  { key: "includeSocialManual", label: "Réseaux sociaux" },
  { key: "includeJobs", label: "Offres d’emploi" },
] as const satisfies ReadonlyArray<{
  key: keyof Pick<
    AccountWatchDetailedSettings,
    | "includeOfficialSite"
    | "includeNews"
    | "includePublicRecords"
    | "includeTenders"
    | "includeSocialManual"
    | "includeJobs"
  >
  label: string
}>

export function AccountWatchSettingsDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
}: AccountWatchSettingsDialogProps) {
  const [settings, setSettings] = useState<AccountWatchDetailedSettings>(
    DEFAULT_ACCOUNT_WATCH_DETAILED_SETTINGS,
  )
  const [aliases, setAliases] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading")
  const [message, setMessage] = useState<string | null>(null)
  const [isSaving, startSaving] = useTransition()

  useEffect(() => {
    if (!open) return
    let active = true

    void loadAccountWatchDetailedSettings(companyId).then((result) => {
      if (!active) return
      if (result.error || !result.data) {
        setStatus("error")
        setMessage(result.error ?? "Chargement des paramètres indisponible")
        return
      }
      setSettings(result.data)
      setAliases(result.data.queryAliases.join(", "))
      setStatus("idle")
    })

    return () => {
      active = false
    }
  }, [companyId, open])

  function updateBoolean(key: (typeof SOURCE_OPTIONS)[number]["key"], value: boolean) {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  function toggleCategory(value: (typeof ACCOUNT_WATCH_CATEGORIES)[number]["value"]) {
    setSettings((current) => ({
      ...current,
      monitoredCategories: current.monitoredCategories.includes(value)
        ? current.monitoredCategories.filter((category) => category !== value)
        : [...current.monitoredCategories, value],
    }))
  }

  function handleSave() {
    setMessage(null)
    setStatus("idle")
    startSaving(async () => {
      const result = await saveAccountWatchDetailedSettings(companyId, {
        isEnabled: settings.isEnabled,
        watchLevel: settings.watchLevel,
        includeOfficialSite: settings.includeOfficialSite,
        includeNews: settings.includeNews,
        includePublicRecords: settings.includePublicRecords,
        includeTenders: settings.includeTenders,
        includeSocialManual: settings.includeSocialManual,
        includeJobs: settings.includeJobs,
        queryAliases: aliases.split(/[\n,]/),
        monitoredCategories: settings.monitoredCategories,
        notes: settings.notes,
      })

      if (result.error || !result.data) {
        setStatus("error")
        setMessage(result.error ?? "Enregistrement impossible")
        return
      }

      setSettings(result.data)
      setAliases(result.data.queryAliases.join(", "))
      setStatus("idle")
      setMessage("Paramètres de veille enregistrés.")
    })
  }

  const cadence = cadenceForWatchLevel(settings.watchLevel)

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Paramétrer la veille · ${companyName}`}
      description="Définissez le rythme, les sources et les thèmes surveillés pour ce compte."
      className="w-[min(calc(100vw-1rem),40rem)] sm:max-w-2xl"
      maxHeightClassName="max-h-[calc(100dvh-1rem)] sm:max-h-[min(calc(100dvh-3rem),52rem)]"
      bodyClassName="space-y-5"
      footer={
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || status === "loading"}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-small)] bg-primary px-5 text-sm font-bold text-primary-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? "Enregistrement…" : "Enregistrer"}
        </button>
      }
    >
      {status === "loading" ? (
        <p className="rounded-[var(--radius-small)] bg-canvas px-4 py-8 text-center text-sm text-muted">
          Chargement des paramètres…
        </p>
      ) : (
        <>
          <section className="rounded-[var(--radius-small)] border border-border bg-canvas p-4">
            <label className="flex min-h-11 items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-bold text-heading">Veille active</span>
                <span className="mt-0.5 block text-xs text-muted">Inclure ce compte dans les prochaines collectes.</span>
              </span>
              <input
                type="checkbox"
                checked={settings.isEnabled}
                onChange={(event) => setSettings((current) => ({ ...current, isEnabled: event.target.checked }))}
                className="size-5 accent-primary"
              />
            </label>
          </section>

          <section className="space-y-2">
            <label htmlFor="account-watch-level" className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Fréquence de mise à jour
            </label>
            <Select
              id="account-watch-level"
              value={settings.watchLevel}
              onChange={(event) => setSettings((current) => ({
                ...current,
                watchLevel: event.target.value as AccountWatchLevel,
              }))}
              fullWidth
            >
              {ACCOUNT_WATCH_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {ACCOUNT_WATCH_LEVEL_LABELS[level]} · {ACCOUNT_WATCH_CADENCE_LABELS[cadenceForWatchLevel(level)]}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted">Cadence appliquée : {ACCOUNT_WATCH_CADENCE_LABELS[cadence]}.</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Sources</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SOURCE_OPTIONS.map((source) => (
                <label key={source.key} className="flex min-h-11 items-center gap-3 rounded-[var(--radius-small)] border border-border px-3 text-sm font-semibold text-heading">
                  <input
                    type="checkbox"
                    checked={settings[source.key]}
                    onChange={(event) => updateBoolean(source.key, event.target.checked)}
                    className="size-4 accent-primary"
                  />
                  {source.label}
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Catégories surveillées</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ACCOUNT_WATCH_CATEGORIES.map((category) => (
                <label key={category.value} className="flex min-h-11 items-center gap-3 rounded-[var(--radius-small)] border border-border px-3 text-sm font-semibold text-heading">
                  <input
                    type="checkbox"
                    checked={settings.monitoredCategories.includes(category.value)}
                    onChange={() => toggleCategory(category.value)}
                    className="size-4 accent-primary"
                  />
                  {category.label}
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <label htmlFor="account-watch-aliases" className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Noms, marques et termes associés
            </label>
            <textarea
              id="account-watch-aliases"
              value={aliases}
              onChange={(event) => setAliases(event.target.value)}
              rows={3}
              placeholder="Séparez les termes par une virgule ou un retour à la ligne"
              className="w-full rounded-[var(--radius-small)] border border-border bg-surface px-3 py-2.5 text-sm text-heading outline-none transition-colors placeholder:text-muted focus:border-primary"
            />
          </section>

          <section className="space-y-2">
            <label htmlFor="account-watch-notes" className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Notes de précision
            </label>
            <textarea
              id="account-watch-notes"
              value={settings.notes}
              onChange={(event) => setSettings((current) => ({ ...current, notes: event.target.value }))}
              rows={4}
              maxLength={2_000}
              placeholder="Angles prioritaires, exclusions ou contexte à prendre en compte…"
              className="w-full rounded-[var(--radius-small)] border border-border bg-surface px-3 py-2.5 text-sm text-heading outline-none transition-colors placeholder:text-muted focus:border-primary"
            />
          </section>

          {message ? (
            <p role="status" className={`rounded-[var(--radius-small)] px-3 py-2 text-sm ${status === "error" ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>
              {message}
            </p>
          ) : null}
        </>
      )}
    </AppDialog>
  )
}

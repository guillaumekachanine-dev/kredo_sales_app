"use client"

import { useEffect, useState, useTransition } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Select } from "@/components/ui/Select"
import { CockpitReturnButton } from "@/components/intelligence/CockpitReturnButton"
import {
  ACCOUNT_WATCH_CADENCE_LABELS,
  ACCOUNT_WATCH_CATEGORIES,
  ACCOUNT_WATCH_DEPTH_DESCRIPTIONS,
  ACCOUNT_WATCH_DEPTH_LABELS,
  ACCOUNT_WATCH_DEPTHS,
  ACCOUNT_WATCH_LEVEL_LABELS,
  ACCOUNT_WATCH_LEVELS,
  cadenceForWatchLevel,
  DEFAULT_ACCOUNT_WATCH_DETAILED_SETTINGS,
  type AccountWatchDepth,
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
  onBack: () => void
  onReturnToCockpit: () => void
}

const STEPS = [
  { id: "type", label: "Type de veille" },
  { id: "sources", label: "Sources" },
  { id: "subjects", label: "Sujets" },
  { id: "details", label: "Précisions" },
] as const

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

function WatchSteps({ activeIndex }: { activeIndex: number }) {
  return (
    <ol className="grid grid-cols-4" aria-label="Étapes de paramétrage de la veille">
      {STEPS.map((step, index) => {
        const reached = index <= activeIndex
        return (
          <li key={step.id} className="relative flex min-w-0 flex-col items-center gap-1">
            {index > 0 ? (
              <span className={`absolute right-1/2 top-3 h-px w-full ${reached ? "bg-edito-brass" : "bg-white/25"}`} aria-hidden="true" />
            ) : null}
            <span className={`relative z-10 flex size-6 items-center justify-center rounded-full border text-[10px] font-black ${reached ? "border-edito-brass bg-edito-brass text-edito-ink" : "border-white/55 text-white/70"}`}>
              {index < activeIndex ? "✓" : index + 1}
            </span>
            <span className={`relative z-10 max-w-full truncate text-[9px] font-bold ${reached ? "text-edito-brass" : "text-white/60"}`}>
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function AccountWatchSettingsDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  onBack,
  onReturnToCockpit,
}: AccountWatchSettingsDialogProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [settings, setSettings] = useState<AccountWatchDetailedSettings>(
    DEFAULT_ACCOUNT_WATCH_DETAILED_SETTINGS,
  )
  const [aliases, setAliases] = useState("")
  const [manualUrl, setManualUrl] = useState("")
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

  function addManualUrl() {
    const url = manualUrl.trim()
    if (!/^https?:\/\//i.test(url)) {
      setStatus("error")
      setMessage("Renseignez une URL complète commençant par http:// ou https://.")
      return
    }
    setSettings((current) => ({
      ...current,
      manualSourceUrls: current.manualSourceUrls.includes(url)
        ? current.manualSourceUrls
        : [...current.manualSourceUrls, url],
    }))
    setManualUrl("")
    setStatus("idle")
    setMessage(null)
  }

  function handleSave() {
    setMessage(null)
    setStatus("idle")
    startSaving(async () => {
      const result = await saveAccountWatchDetailedSettings(companyId, {
        isEnabled: settings.isEnabled,
        watchLevel: settings.watchLevel,
        depth: settings.depth,
        includeOfficialSite: settings.includeOfficialSite,
        includeNews: settings.includeNews,
        includePublicRecords: settings.includePublicRecords,
        includeTenders: settings.includeTenders,
        includeSocialManual: settings.includeSocialManual,
        includeJobs: settings.includeJobs,
        manualSourceUrls: settings.manualSourceUrls,
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

  function goBack() {
    if (stepIndex > 0) {
      setStepIndex((current) => current - 1)
      return
    }
    onBack()
  }

  const cadence = cadenceForWatchLevel(settings.watchLevel)

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Paramétrer la veille · ${companyName}`}
      className="w-[min(calc(100vw-0.5rem),42rem)] sm:max-w-2xl"
      maxHeightClassName="max-h-[calc(100dvh-0.5rem)] sm:max-h-[min(calc(100dvh-3rem),52rem)]"
      headerClassName="pb-0"
      bodyClassName="-mx-4 -mb-4 sm:-mx-6 sm:-mb-6"
      footerClassName="hidden"
    >
      <div className="border-y border-edito-brass/60 bg-edito-navy px-4 py-3 text-white">
        <WatchSteps activeIndex={stepIndex} />
      </div>

      <div className="px-4 py-4 sm:px-6">
        <CockpitReturnButton onClick={onReturnToCockpit} className="mb-2" />

        {status === "loading" ? (
          <p className="rounded-[var(--radius-small)] bg-canvas px-4 py-8 text-center text-sm text-muted">
            Chargement des paramètres…
          </p>
        ) : (
          <>
            {stepIndex === 0 ? (
              <div className="space-y-5">
                <section className="rounded-[var(--radius-small)] border border-border bg-canvas p-4">
                  <label className="flex min-h-11 items-center justify-between gap-4">
                    <span className="text-sm font-bold text-heading">Activer la veille</span>
                    <input type="checkbox" checked={settings.isEnabled} onChange={(event) => setSettings((current) => ({ ...current, isEnabled: event.target.checked }))} className="size-5 accent-primary" />
                  </label>
                </section>
                <section className="space-y-2">
                  <label htmlFor="account-watch-level" className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Fréquence</label>
                  <Select id="account-watch-level" value={settings.watchLevel} onChange={(event) => setSettings((current) => ({ ...current, watchLevel: event.target.value as AccountWatchLevel }))} fullWidth>
                    {ACCOUNT_WATCH_LEVELS.map((level) => <option key={level} value={level}>{ACCOUNT_WATCH_LEVEL_LABELS[level]} · {ACCOUNT_WATCH_CADENCE_LABELS[cadenceForWatchLevel(level)]}</option>)}
                  </Select>
                  <p className="text-xs text-muted">Cadence appliquée : {ACCOUNT_WATCH_CADENCE_LABELS[cadence]}.</p>
                </section>
                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Profondeur</h3>
                  <div className="grid gap-2">
                    {ACCOUNT_WATCH_DEPTHS.map((depth) => (
                      <button key={depth} type="button" onClick={() => setSettings((current) => ({ ...current, depth: depth as AccountWatchDepth }))} className={`min-h-16 rounded-[var(--radius-small)] border px-3 py-2 text-left ${settings.depth === depth ? "border-primary bg-primary/8" : "border-border bg-surface"}`}>
                        <span className="block text-sm font-bold text-heading">{ACCOUNT_WATCH_DEPTH_LABELS[depth]}</span>
                        <span className="mt-1 block text-xs text-muted">{ACCOUNT_WATCH_DEPTH_DESCRIPTIONS[depth]}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {stepIndex === 1 ? (
              <div className="space-y-5">
                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Sources</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SOURCE_OPTIONS.map((source) => (
                      <label key={source.key} className="flex min-h-11 items-center gap-3 rounded-[var(--radius-small)] border border-border px-3 text-sm font-semibold text-heading">
                        <input type="checkbox" checked={settings[source.key]} onChange={(event) => updateBoolean(source.key, event.target.checked)} className="size-4 accent-primary" />
                        {source.label}
                      </label>
                    ))}
                  </div>
                </section>
                <section className="space-y-2">
                  <label htmlFor="manual-watch-source" className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Ajouter manuellement</label>
                  <div className="flex gap-2">
                    <input id="manual-watch-source" type="url" value={manualUrl} onChange={(event) => setManualUrl(event.target.value)} placeholder="https://…" className="min-h-11 min-w-0 flex-1 rounded-[var(--radius-small)] border border-border bg-surface px-3 text-sm text-heading outline-none focus:border-primary" />
                    <button type="button" onClick={addManualUrl} className="min-h-11 rounded-[var(--radius-small)] border border-primary px-3 text-xs font-bold text-primary">Ajouter</button>
                  </div>
                  {settings.manualSourceUrls.length > 0 ? <ul className="space-y-1">{settings.manualSourceUrls.map((url) => <li key={url} className="flex items-center justify-between gap-2 rounded bg-canvas px-2 py-1.5 text-xs text-body"><span className="truncate">{url}</span><button type="button" onClick={() => setSettings((current) => ({ ...current, manualSourceUrls: current.manualSourceUrls.filter((item) => item !== url) }))} className="text-danger">Retirer</button></li>)}</ul> : null}
                </section>
                <button type="button" disabled className="w-full rounded-[var(--radius-small)] border border-dashed border-border bg-canvas p-4 text-left opacity-70">
                  <span className="block text-sm font-bold text-heading">Lier un corpus thématique</span>
                  <span className="mt-1 block text-xs text-muted">Ajout d’un bloc cohérent de sources · fonctionnalité à venir</span>
                </button>
              </div>
            ) : null}

            {stepIndex === 2 ? (
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Sujets privilégiés</h3>
                <p className="text-xs text-muted">Contrats remportés, réglementation, recrutement, communication officielle et autres thèmes prioritaires.</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ACCOUNT_WATCH_CATEGORIES.map((category) => (
                    <label key={category.value} className="flex min-h-12 items-center gap-3 rounded-[var(--radius-small)] border border-border px-3 text-sm font-semibold text-heading">
                      <input type="checkbox" checked={settings.monitoredCategories.includes(category.value)} onChange={() => toggleCategory(category.value)} className="size-4 accent-primary" />
                      {category.label}
                    </label>
                  ))}
                </div>
              </section>
            ) : null}

            {stepIndex === 3 ? (
              <div className="space-y-5">
                <section className="space-y-2">
                  <label htmlFor="account-watch-aliases" className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Noms, marques et termes associés</label>
                  <textarea id="account-watch-aliases" value={aliases} onChange={(event) => setAliases(event.target.value)} rows={4} placeholder="Séparez les termes par une virgule ou un retour à la ligne" className="w-full rounded-[var(--radius-small)] border border-border bg-surface px-3 py-2.5 text-sm text-heading outline-none placeholder:text-muted focus:border-primary" />
                </section>
                <section className="space-y-2">
                  <label htmlFor="account-watch-notes" className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Notes de précision</label>
                  <textarea id="account-watch-notes" value={settings.notes} onChange={(event) => setSettings((current) => ({ ...current, notes: event.target.value }))} rows={5} maxLength={2_000} placeholder="Angles prioritaires, exclusions ou contexte…" className="w-full rounded-[var(--radius-small)] border border-border bg-surface px-3 py-2.5 text-sm text-heading outline-none placeholder:text-muted focus:border-primary" />
                </section>
              </div>
            ) : null}

            {message ? <p role="status" className={`mt-4 rounded-[var(--radius-small)] px-3 py-2 text-sm ${status === "error" ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>{message}</p> : null}
          </>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
          <button type="button" onClick={goBack} className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-small)] border border-border px-4 text-sm font-bold text-body">← Revenir</button>
          {stepIndex < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStepIndex((current) => current + 1)} disabled={status === "loading"} className="min-h-11 rounded-[var(--radius-small)] bg-primary px-5 text-sm font-bold text-primary-fg disabled:opacity-50">Suivant →</button>
          ) : (
            <button type="button" onClick={handleSave} disabled={isSaving || status === "loading"} className="min-h-11 rounded-[var(--radius-small)] bg-primary px-5 text-sm font-bold text-primary-fg disabled:opacity-50">{isSaving ? "Enregistrement…" : "Enregistrer"}</button>
          )}
        </div>
      </div>
    </AppDialog>
  )
}

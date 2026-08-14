"use client"

import { useEffect, useState, useTransition, type ReactNode } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Select } from "@/components/ui/Select"
import { cn } from "@/lib/utils"
import {
  ACCOUNT_WATCH_CADENCE_LABELS,
  ACCOUNT_WATCH_CATEGORIES,
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
import { loadAccountWatchDetailedSettings, saveAccountWatchDetailedSettings } from "./save-account-watch-settings"

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
  { id: "subjects", label: "Intérêts" },
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

type SourceKey = (typeof SOURCE_OPTIONS)[number]["key"]
type MiniDialog = "source" | "corpus" | "current" | null

const DEPTH_SOURCE_RANGES: Record<AccountWatchDepth, string> = {
  standard: "8–12 sources",
  balanced: "15–25 sources",
  deep: "30–45 sources",
}

const CORPUS_PRESETS = [
  { value: "institutional", label: "Institutionnel & gouvernance", sources: ["includeOfficialSite", "includeNews", "includePublicRecords"] satisfies SourceKey[] },
  { value: "markets", label: "Marchés & réglementation", sources: ["includeNews", "includePublicRecords", "includeTenders"] satisfies SourceKey[] },
  { value: "talent", label: "Talents & transformation", sources: ["includeOfficialSite", "includeNews", "includeSocialManual", "includeJobs"] satisfies SourceKey[] },
] as const

function Triangle({ direction }: { direction: "left" | "right" }) {
  return <span aria-hidden="true" className={cn("block size-0 border-y-[4px] border-y-transparent", direction === "left" ? "border-r-[7px] border-r-current" : "border-l-[7px] border-l-current")} />
}

function Switch({ checked, onChange, disabled = false, label }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40", checked ? "border-primary bg-primary" : "border-border-strong bg-border", disabled && "cursor-not-allowed opacity-50")}>
      <span className={cn("block size-[18px] rounded-full bg-surface shadow-sm transition-transform duration-200 motion-reduce:transition-none", checked ? "translate-x-[21px]" : "translate-x-0.5")} />
    </button>
  )
}

function WatchSteps({ activeIndex }: { activeIndex: number }) {
  return (
    <ol className="grid h-[68px] grid-cols-4 px-3 pt-3 sm:h-[74px] sm:px-5 sm:pt-3.5" aria-label="Étapes de paramétrage de la veille">
      {STEPS.map((step, index) => {
        const reached = index <= activeIndex
        return (
          <li key={step.id} className="relative flex min-w-0 flex-col items-center gap-1">
            {index > 0 ? <span className={cn("absolute right-1/2 top-[11px] h-px w-full", reached ? "bg-edito-brass" : "bg-white/25")} aria-hidden="true" /> : null}
            <span className={cn("relative z-10 flex size-[23px] items-center justify-center rounded-full border text-[10px] font-black leading-none", reached ? "border-edito-brass bg-edito-brass text-edito-ink" : "border-white/55 bg-edito-navy text-white/70")}>{index < activeIndex ? "✓" : index + 1}</span>
            <span className={cn("relative z-10 max-w-full truncate text-[8px] font-bold leading-3 sm:text-[9px]", reached ? "text-edito-brass" : "text-white/65")}>{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-edito-heading">{children}</h3>
}

function ActionTile({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex h-[92px] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-small)] border border-edito-border bg-edito-surface text-edito-navy transition-[border-color,background-color,transform] duration-200 hover:border-primary/50 hover:bg-primary/[0.035] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 sm:h-[104px]">
      <span className="text-[32px] font-light leading-none text-primary transition-transform duration-200 group-hover:scale-110">+</span>
      <span className="text-xs font-bold leading-4">{label}</span>
    </button>
  )
}

function CompactDialogShell({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode }) {
  return (
    <AppDialog open={open} onOpenChange={onOpenChange} title={title} className="w-[min(calc(100vw-1.5rem),25rem)]" maxHeightClassName="max-h-[min(calc(100dvh-2rem),34rem)]" headerClassName="border-b border-border pb-3" bodyClassName="pr-0">
      {children}
    </AppDialog>
  )
}

export function AccountWatchSettingsDialog({ open, onOpenChange, companyId, companyName, onBack, onReturnToCockpit }: AccountWatchSettingsDialogProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [settings, setSettings] = useState<AccountWatchDetailedSettings>(DEFAULT_ACCOUNT_WATCH_DETAILED_SETTINGS)
  const [aliases, setAliases] = useState("")
  const [manualSourceName, setManualSourceName] = useState("")
  const [manualUrl, setManualUrl] = useState("")
  const [manualSourceNames, setManualSourceNames] = useState<Record<string, string>>({})
  const [selectedCorpus, setSelectedCorpus] = useState<(typeof CORPUS_PRESETS)[number]["value"]>("institutional")
  const [miniDialog, setMiniDialog] = useState<MiniDialog>(null)
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
    return () => { active = false }
  }, [companyId, open])

  function updateBoolean(key: SourceKey, value: boolean) {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  function toggleCategory(value: (typeof ACCOUNT_WATCH_CATEGORIES)[number]["value"]) {
    setSettings((current) => ({ ...current, monitoredCategories: current.monitoredCategories.includes(value) ? current.monitoredCategories.filter((category) => category !== value) : [...current.monitoredCategories, value] }))
  }

  function addManualSource() {
    const url = manualUrl.trim()
    if (!manualSourceName.trim() || !/^https?:\/\//i.test(url)) {
      setStatus("error")
      setMessage("Renseignez un nom et une URL complète commençant par http:// ou https://.")
      return
    }
    setSettings((current) => ({ ...current, manualSourceUrls: current.manualSourceUrls.includes(url) ? current.manualSourceUrls : [...current.manualSourceUrls, url] }))
    setManualSourceNames((current) => ({ ...current, [url]: manualSourceName.trim() }))
    setManualSourceName("")
    setManualUrl("")
    setStatus("idle")
    setMessage(null)
    setMiniDialog(null)
  }

  function applyCorpus() {
    const preset = CORPUS_PRESETS.find((corpus) => corpus.value === selectedCorpus)
    if (!preset) return
    const enabledSources = new Set<SourceKey>(preset.sources)
    setSettings((current) => {
      const sourceSettings = Object.fromEntries(SOURCE_OPTIONS.map(({ key }) => [key, enabledSources.has(key)])) as Pick<AccountWatchDetailedSettings, SourceKey>
      return { ...current, ...sourceSettings }
    })
    setMessage(`Corpus « ${preset.label} » appliqué aux sources.`)
    setStatus("idle")
    setMiniDialog(null)
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
    setMessage(null)
    if (stepIndex > 0) {
      setStepIndex((current) => current - 1)
      return
    }
    onBack()
  }

  function goNext() {
    setMessage(null)
    setStepIndex((current) => current + 1)
  }

  const cadence = cadenceForWatchLevel(settings.watchLevel)
  const enabledSourceCount = SOURCE_OPTIONS.filter(({ key }) => settings[key]).length
  const activeInterestCount = settings.monitoredCategories.length

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`Paramétrer la veille · ${companyName}`}
        headerLeading={<button type="button" onClick={onReturnToCockpit} className="inline-flex min-h-9 items-center gap-2 text-xs font-bold text-primary transition-colors hover:text-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"><Triangle direction="left" />Retour</button>}
        className="!h-[min(calc(100dvh-0.5rem),44rem)] !w-[min(calc(100vw-0.5rem),38rem)] !max-w-[38rem] sm:!h-[39rem]"
        maxHeightClassName="max-h-[calc(100dvh-0.5rem)] sm:max-h-[39rem]"
        headerClassName="pb-0"
        bodyClassName="-mx-4 -mb-4 flex flex-1 flex-col overflow-hidden pr-0 sm:-mx-6 sm:-mb-6"
        closeButtonClassName="size-9 rounded-full border border-transparent hover:border-border hover:bg-canvas"
        footerClassName="hidden"
        fillHeight
      >
        <div className="shrink-0 border-y border-edito-brass/60 bg-edito-navy text-white"><WatchSteps activeIndex={stepIndex} /></div>
        <div className="flex min-h-0 flex-1 flex-col px-4 sm:px-5">
          <div className="flex min-h-[74px] shrink-0 items-center justify-between gap-3 border-b border-border/70 py-2.5 sm:min-h-[82px] sm:py-3">
            <div className="min-w-0">
              <h2 className="truncate font-heading text-lg font-bold leading-6 text-edito-navy">Paramétrer la veille</h2>
              <div className="mt-0.5 flex min-w-0 items-center gap-2">
                <span className="truncate text-xs font-semibold leading-4 text-edito-muted">{companyName}</span><span className="text-edito-border" aria-hidden="true">·</span>
                <button type="button" aria-label="Consulter les paramètres actuels" disabled={!settings.exists || status === "loading"} onClick={() => setMiniDialog("current")} className="shrink-0 text-[10px] font-bold leading-4 text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:text-primary-deep disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"><span className="sm:hidden">Paramètres actuels</span><span className="hidden sm:inline">Consulter les paramètres actuels</span></button>
              </div>
            </div>
            {stepIndex === 0 ? <div className="flex shrink-0 items-center gap-2.5"><span className="max-w-20 text-right text-[10px] font-bold leading-4 text-edito-navy sm:max-w-none sm:text-xs">Activer la veille</span><Switch label="Activer la veille" checked={settings.isEnabled} onChange={(isEnabled) => setSettings((current) => ({ ...current, isEnabled }))} /></div> : null}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden py-3 sm:py-4">
            {status === "loading" ? <div className="flex h-full items-center justify-center"><p className="text-sm font-semibold text-muted">Chargement des paramètres…</p></div> : (
              <div key={stepIndex} className="h-full animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none">
                {stepIndex === 0 ? (
                  <fieldset disabled={!settings.isEnabled} className="h-full space-y-3 disabled:opacity-45 sm:space-y-4">
                    <section className="space-y-1.5">
                      <SectionLabel>Fréquence</SectionLabel>
                      <Select id="account-watch-level" value={settings.watchLevel} onChange={(event) => setSettings((current) => ({ ...current, watchLevel: event.target.value as AccountWatchLevel }))} fullWidth className="min-h-10">
                        {ACCOUNT_WATCH_LEVELS.map((level) => <option key={level} value={level}>{ACCOUNT_WATCH_LEVEL_LABELS[level]} · {ACCOUNT_WATCH_CADENCE_LABELS[cadenceForWatchLevel(level)]}</option>)}
                      </Select>
                    </section>
                    <section className="space-y-1.5">
                      <SectionLabel>Profondeur</SectionLabel>
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        {ACCOUNT_WATCH_DEPTHS.map((depth) => {
                          const selected = settings.depth === depth
                          return <button key={depth} type="button" onClick={() => setSettings((current) => ({ ...current, depth }))} className={cn("relative min-h-[76px] rounded-[var(--radius-small)] border px-2 py-2 text-left transition-colors sm:min-h-[84px] sm:px-3", selected ? "border-edito-brass bg-edito-brass/[0.055]" : "border-edito-border bg-edito-surface hover:border-primary/35")}><span className={cn("mb-1 block size-3 rounded-full border", selected ? "border-[3px] border-edito-brass" : "border-edito-border")} /><span className="block truncate text-[11px] font-bold leading-4 text-edito-navy sm:text-xs">{ACCOUNT_WATCH_DEPTH_LABELS[depth]}</span><span className="block text-[9px] font-semibold leading-3 text-edito-muted sm:text-[10px]">{DEPTH_SOURCE_RANGES[depth]}</span></button>
                        })}
                      </div>
                    </section>
                    <div className="flex items-center justify-between rounded-[var(--radius-small)] bg-edito-chip px-3 py-2 text-[10px] font-semibold leading-4 text-edito-body"><span>Cadence appliquée</span><strong className="text-edito-navy">{ACCOUNT_WATCH_CADENCE_LABELS[cadence]}</strong></div>
                  </fieldset>
                ) : null}

                {stepIndex === 1 ? (
                  <div className="grid h-full grid-rows-[auto_1fr] gap-3 sm:gap-4">
                    <section className="space-y-1.5">
                      <div className="flex items-center justify-between"><SectionLabel>Sources existantes</SectionLabel><span className="text-[10px] font-bold text-edito-navy">{enabledSourceCount} actives</span></div>
                      <div className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-small)] border border-edito-border bg-edito-surface">
                        {SOURCE_OPTIONS.map((source, index) => <div key={source.key} className={cn("flex min-h-10 items-center justify-between gap-2 px-2.5 py-1.5", index < SOURCE_OPTIONS.length - 2 && "border-b border-edito-border/70", index % 2 === 0 && "border-r border-edito-border/70")}><span className="min-w-0 truncate text-[10px] font-semibold leading-4 text-edito-navy sm:text-[11px]">{source.label}</span><Switch label={source.label} checked={settings[source.key]} onChange={(checked) => updateBoolean(source.key, checked)} /></div>)}
                      </div>
                    </section>
                    <section className="grid min-h-0 grid-cols-2 content-start gap-2 sm:gap-3">
                      <ActionTile label="Source" onClick={() => setMiniDialog("source")} /><ActionTile label="Corpus" onClick={() => setMiniDialog("corpus")} />
                      {settings.manualSourceUrls.length > 0 ? <div className="col-span-2 flex min-h-8 items-center gap-2 overflow-x-auto rounded-[var(--radius-small)] bg-edito-chip px-2.5 py-1.5"><span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.1em] text-edito-heading">Ajoutées</span>{settings.manualSourceUrls.slice(0, 2).map((url) => <button key={url} type="button" title={url} onClick={() => setSettings((current) => ({ ...current, manualSourceUrls: current.manualSourceUrls.filter((item) => item !== url) }))} className="max-w-36 truncate rounded-full bg-surface px-2 py-1 text-[9px] font-semibold text-edito-body hover:text-danger">{manualSourceNames[url] ?? new URL(url).hostname} ×</button>)}{settings.manualSourceUrls.length > 2 ? <span className="shrink-0 text-[9px] font-bold text-edito-muted">+{settings.manualSourceUrls.length - 2}</span> : null}</div> : null}
                    </section>
                  </div>
                ) : null}

                {stepIndex === 2 ? (
                  <section className="h-full">
                    <div className="mb-2 flex items-center justify-between"><SectionLabel>Intérêts</SectionLabel><span className="text-[10px] font-bold text-edito-navy">{activeInterestCount} actifs</span></div>
                    <div className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-small)] border-y border-edito-border bg-edito-surface">
                      {ACCOUNT_WATCH_CATEGORIES.map((category, index) => <div key={category.value} className={cn("relative flex min-h-[43px] items-center justify-between gap-2 border-edito-border/70 px-2.5 py-1.5 pl-3.5", index < ACCOUNT_WATCH_CATEGORIES.length - 2 && "border-b", index % 2 === 0 && "border-r")}><span className="absolute inset-y-2 left-0 w-0.5 bg-edito-brass" aria-hidden="true" /><span className="min-w-0 text-[10px] font-semibold leading-3 text-edito-navy sm:text-[11px] sm:leading-4">{category.label}</span><Switch label={category.label} checked={settings.monitoredCategories.includes(category.value)} onChange={() => toggleCategory(category.value)} /></div>)}
                    </div>
                  </section>
                ) : null}

                {stepIndex === 3 ? (
                  <div className="grid h-full grid-rows-2 gap-3 sm:gap-4">
                    <section className="flex min-h-0 flex-col gap-1.5"><label htmlFor="account-watch-aliases" className="text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-edito-heading">Précisions de contexte et de l’objectif</label><textarea id="account-watch-aliases" value={aliases} onChange={(event) => setAliases(event.target.value)} placeholder="Contexte, objectif et termes associés…" className="min-h-0 flex-1 resize-none rounded-[var(--radius-small)] border border-edito-border bg-edito-surface px-3 py-2.5 text-xs leading-5 text-edito-ink outline-none placeholder:text-edito-muted focus:border-primary" /></section>
                    <section className="flex min-h-0 flex-col gap-1.5"><label htmlFor="account-watch-notes" className="text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-edito-heading">Sujets à exclure</label><textarea id="account-watch-notes" value={settings.notes} onChange={(event) => setSettings((current) => ({ ...current, notes: event.target.value }))} maxLength={2_000} placeholder="Thèmes, signaux ou angles à ignorer…" className="min-h-0 flex-1 resize-none rounded-[var(--radius-small)] border border-edito-border bg-edito-surface px-3 py-2.5 text-xs leading-5 text-edito-ink outline-none placeholder:text-edito-muted focus:border-primary" /></section>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="min-h-8 shrink-0">{message ? <p role="status" className={cn("truncate rounded-[var(--radius-small)] px-2.5 py-1.5 text-[10px] font-semibold leading-4", status === "error" ? "bg-danger/10 text-danger" : "bg-success/10 text-success")}>{message}</p> : null}</div>
          <div className="flex min-h-[58px] shrink-0 items-center justify-between gap-3 border-t border-border">
            <button type="button" onClick={goBack} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-small)] bg-cockpit-cobalt-soft px-3.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15 active:scale-[0.98]"><Triangle direction="left" />Revenir</button>
            {stepIndex < STEPS.length - 1 ? <button type="button" onClick={goNext} disabled={status === "loading"} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-small)] bg-primary px-4 text-xs font-bold text-primary-fg transition-colors hover:bg-primary-deep active:scale-[0.98] disabled:opacity-50">Suivant<Triangle direction="right" /></button> : <button type="button" onClick={handleSave} disabled={isSaving || status === "loading"} className="min-h-10 rounded-[var(--radius-small)] bg-primary px-4 text-xs font-bold text-primary-fg transition-colors hover:bg-primary-deep active:scale-[0.98] disabled:opacity-50">{isSaving ? "Enregistrement…" : "Enregistrer"}</button>}
          </div>
        </div>
      </AppDialog>

      <CompactDialogShell open={miniDialog === "source"} onOpenChange={(isOpen) => setMiniDialog(isOpen ? "source" : null)} title="Ajouter une source">
        <div className="space-y-4">
          <label className="block space-y-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-edito-heading">Nom de la source<input value={manualSourceName} onChange={(event) => setManualSourceName(event.target.value)} className="mt-1 min-h-11 w-full rounded-[var(--radius-small)] border border-edito-border bg-edito-surface px-3 text-sm font-normal normal-case tracking-normal text-edito-ink outline-none focus:border-primary" /></label>
          <label className="block space-y-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-edito-heading">URL<input type="url" value={manualUrl} onChange={(event) => setManualUrl(event.target.value)} placeholder="https://…" className="mt-1 min-h-11 w-full rounded-[var(--radius-small)] border border-edito-border bg-edito-surface px-3 text-sm font-normal normal-case tracking-normal text-edito-ink outline-none placeholder:text-edito-muted focus:border-primary" /></label>
          <div className="flex justify-end gap-2 border-t border-border pt-3"><button type="button" onClick={() => setMiniDialog(null)} className="min-h-10 rounded-[var(--radius-small)] bg-cockpit-cobalt-soft px-4 text-xs font-bold text-primary">Annuler</button><button type="button" onClick={addManualSource} className="min-h-10 rounded-[var(--radius-small)] bg-primary px-4 text-xs font-bold text-primary-fg">Valider</button></div>
        </div>
      </CompactDialogShell>

      <CompactDialogShell open={miniDialog === "corpus"} onOpenChange={(isOpen) => setMiniDialog(isOpen ? "corpus" : null)} title="Ajouter un corpus">
        <div className="space-y-4">
          <label className="block space-y-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-edito-heading">Corpus thématique<select value={selectedCorpus} onChange={(event) => setSelectedCorpus(event.target.value as (typeof CORPUS_PRESETS)[number]["value"])} className="mt-1 min-h-11 w-full rounded-[var(--radius-small)] border border-edito-border bg-edito-surface px-3 text-sm font-normal normal-case tracking-normal text-edito-ink outline-none focus:border-primary">{CORPUS_PRESETS.map((corpus) => <option key={corpus.value} value={corpus.value}>{corpus.label}</option>)}</select></label>
          <div className="flex justify-end gap-2 border-t border-border pt-3"><button type="button" onClick={() => setMiniDialog(null)} className="min-h-10 rounded-[var(--radius-small)] bg-cockpit-cobalt-soft px-4 text-xs font-bold text-primary">Annuler</button><button type="button" onClick={applyCorpus} className="min-h-10 rounded-[var(--radius-small)] bg-primary px-4 text-xs font-bold text-primary-fg">Valider</button></div>
        </div>
      </CompactDialogShell>

      <CompactDialogShell open={miniDialog === "current"} onOpenChange={(isOpen) => setMiniDialog(isOpen ? "current" : null)} title="Paramètres actuels">
        <dl className="divide-y divide-edito-border text-xs">
          {[
            ["État", settings.isEnabled ? "Veille active" : "Veille suspendue"],
            ["Fréquence", `${ACCOUNT_WATCH_LEVEL_LABELS[settings.watchLevel]} · ${ACCOUNT_WATCH_CADENCE_LABELS[cadence]}`],
            ["Profondeur", `${ACCOUNT_WATCH_DEPTH_LABELS[settings.depth]} · ${DEPTH_SOURCE_RANGES[settings.depth]}`],
            ["Sources", `${enabledSourceCount} familles · ${settings.manualSourceUrls.length} ajoutée(s)`],
            ["Intérêts", `${activeInterestCount} actifs`],
            ["Contexte", aliases || "Non renseigné"],
            ["Exclusions", settings.notes || "Aucune"],
          ].map(([label, value]) => <div key={label} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2.5"><dt className="font-bold text-edito-heading">{label}</dt><dd className="min-w-0 break-words text-edito-body">{value}</dd></div>)}
        </dl>
      </CompactDialogShell>
    </>
  )
}

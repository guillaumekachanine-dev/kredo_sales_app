"use client"

import { useEffect, useState, useTransition, type ReactNode } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { Select } from "@/components/ui/Select"
import { cn } from "@/lib/utils"
import {
  Triangle,
  Switch,
  WatchSteps,
  SectionLabel,
  CompactActionTile,
  LargeActionTile,
  CompactDialogShell,
} from "@/components/intelligence/WatchSettingsDialogShell"
import { CompactCorpusImport } from "@/components/intelligence/CompactCorpusImport"

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
  companyLogoPath?: string | null
  companyWebsite?: string | null
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

// Components extracted to WatchSettingsDialogShell.tsx

export function AccountWatchSettingsDialog({ open, onOpenChange, companyId, companyName, companyLogoPath, companyWebsite, onBack, onReturnToCockpit }: AccountWatchSettingsDialogProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [settings, setSettings] = useState<AccountWatchDetailedSettings>(DEFAULT_ACCOUNT_WATCH_DETAILED_SETTINGS)
  const [sourcesByFamily, setSourcesByFamily] = useState<Record<string, string[]>>({})
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
      setSourcesByFamily(result.sourcesByFamily ?? {})
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
  const [manualFamily, setManualFamily] = useState("Autre")
  const [expandedDepth, setExpandedDepth] = useState<AccountWatchDepth | null>(settings.depth ?? "balanced")

  const DEPTH_CONFIG: Record<AccountWatchDepth, { label: string; subtitle: string; details: string }> = {
    standard: {
      label: "Légère",
      subtitle: "Détecter et catégoriser les signaux essentiels",
      details: "Jusqu'à 15 sources consultées + production d'un court résumé de chaque signal détecté",
    },
    balanced: {
      label: "Standard",
      subtitle: "Convertir les signaux en opportunités",
      details: 'Jusqu\'à 25 sources consultées + production des sections "Pourquoi c\'est important" et "Lecture commerciale"',
    },
    deep: {
      label: "Approfondie",
      subtitle: "Identifier et comprendre les forces en mouvement",
      details: "Jusqu'à 40 sources consultées + production d'une analyse approfondie paramétrable",
    },
  }

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`Paramétrer la veille du compte · ${companyName}`}
        headerLeading={miniDialog === "corpus" ? null : <button type="button" onClick={onReturnToCockpit} className="inline-flex min-h-8 items-center gap-2 text-xs font-bold text-primary transition-colors hover:text-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"><Triangle direction="left" />Retour</button>}
        headerCenter={stepIndex === 0 && miniDialog !== "corpus" ? <div className="flex items-center gap-2"><span className="text-[10px] font-bold leading-4 text-edito-navy sm:text-xs">Activer la veille</span><Switch label="Activer la veille" checked={settings.isEnabled} onChange={(isEnabled) => setSettings((current) => ({ ...current, isEnabled }))} /></div> : null}
        className={cn("!h-[min(calc(100dvh-0.5rem),44rem)] !w-[min(calc(100vw-0.5rem),38rem)] !max-w-[38rem] sm:!h-[39rem]", miniDialog === "corpus" && "sm:!w-[48rem] sm:!max-w-[48rem]")}
        maxHeightClassName="max-h-[calc(100dvh-0.5rem)] sm:max-h-[39rem]"
        headerClassName={miniDialog === "corpus" ? "hidden" : "-mb-2 pb-0"}
        bodyClassName={cn(miniDialog === "corpus" ? "p-0 flex flex-1 flex-col overflow-hidden" : "-mx-4 -mb-4 flex flex-1 flex-col overflow-hidden pr-0 sm:-mx-6 sm:-mb-6")}
        closeButtonClassName={miniDialog === "corpus" ? "hidden" : "size-8 rounded-full border border-transparent hover:border-border hover:bg-canvas"}
        footerClassName="hidden"
        fillHeight
      >
        {miniDialog === "corpus" ? (
          <CompactCorpusImport onBack={() => setMiniDialog(null)} />
        ) : (
          <>
            <div className="shrink-0 border-y border-edito-brass/60 bg-edito-navy text-white"><WatchSteps activeIndex={stepIndex} steps={STEPS} /></div>
            <div className="flex min-h-0 flex-1 flex-col px-4 sm:px-5">
          <div className="flex min-h-[64px] shrink-0 items-center justify-between gap-3 border-b border-border/70 py-2 sm:min-h-[70px]">
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-heading text-lg font-bold leading-6 text-edito-navy">Paramétrer la veille du compte</h2>
            </div>
            <div className="flex w-16 shrink-0 flex-col items-center gap-1">
              <div className="flex size-10 items-center justify-center rounded-[var(--radius-small)] border border-edito-border bg-edito-canvas p-1 shadow-2xs">
                <CompanyLogo name={companyName} logoPath={companyLogoPath} website={companyWebsite} size="md" className="border-0 bg-transparent" />
              </div>
              <span className="w-full truncate text-center text-[9px] font-semibold leading-3 text-edito-muted" title={companyName}>{companyName}</span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto veille-scrollbar py-3 pr-1 sm:py-4">
            {status === "loading" ? <div className="flex h-full items-center justify-center"><p className="text-sm font-semibold text-muted">Chargement des paramètres…</p></div> : (
              <div key={stepIndex} className="animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none">
                {stepIndex === 0 ? (
                  <fieldset disabled={!settings.isEnabled} className="space-y-3 disabled:opacity-45 sm:space-y-4">
                    <section className="space-y-1.5">
                      <SectionLabel>Fréquence</SectionLabel>
                      <Select id="account-watch-level" value={settings.watchLevel} onChange={(event) => setSettings((current) => ({ ...current, watchLevel: event.target.value as AccountWatchLevel }))} fullWidth className="min-h-10">
                        {ACCOUNT_WATCH_LEVELS.map((level) => <option key={level} value={level}>{ACCOUNT_WATCH_LEVEL_LABELS[level]} · {ACCOUNT_WATCH_CADENCE_LABELS[cadenceForWatchLevel(level)]}</option>)}
                      </Select>
                    </section>
                    <section className="space-y-2">
                      <SectionLabel>Profondeur</SectionLabel>
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        {ACCOUNT_WATCH_DEPTHS.map((depth) => {
                          const selected = settings.depth === depth
                          const active = expandedDepth === depth
                          const config = DEPTH_CONFIG[depth]
                          return (
                            <button
                              key={depth}
                              type="button"
                              onClick={() => {
                                setSettings((current) => ({ ...current, depth }))
                                setExpandedDepth((prev) => (prev === depth ? null : depth))
                              }}
                              className={cn(
                                "relative flex flex-col justify-between min-h-[85px] rounded-[var(--radius-small)] border px-2.5 py-2.5 text-left transition-colors sm:min-h-[92px] sm:px-3",
                                active || selected ? "border-edito-brass bg-edito-brass/[0.055]" : "border-edito-border bg-edito-surface hover:border-primary/35"
                              )}
                            >
                              <div>
                                <span className={cn("mb-1.5 block size-3 rounded-full border", selected ? "border-[3px] border-edito-brass" : "border-edito-border")} />
                                <span className="block truncate text-[11px] font-bold leading-4 text-edito-navy sm:text-xs">{config.label}</span>
                              </div>
                              <span className="mt-1 block text-[9px] font-medium leading-3 text-edito-muted sm:text-[10px]">{config.subtitle}</span>
                            </button>
                          )
                        })}
                      </div>
                      {expandedDepth && DEPTH_CONFIG[expandedDepth] ? (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-150 rounded-[var(--radius-small)] border border-edito-brass/40 bg-edito-brass/[0.04] p-3 text-xs text-edito-navy">
                          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-edito-brass mb-0.5">Détails du niveau {DEPTH_CONFIG[expandedDepth].label}</p>
                          <p className="text-[11px] font-normal leading-4 text-edito-body">{DEPTH_CONFIG[expandedDepth].details}</p>
                        </div>
                      ) : null}
                    </section>
                  </fieldset>
                ) : null}

                {stepIndex === 1 ? (
                  <div className="flex flex-col gap-4">
                    <section className="space-y-2">
                      <div className="flex items-center justify-between"><SectionLabel>Sources existantes</SectionLabel><span className="text-[10px] font-bold text-edito-navy">{enabledSourceCount} actives</span></div>
                      
                      {/* 2-column Grid with single-line family header */}
                      <div className="overflow-hidden rounded-[var(--radius-small)] border border-edito-border bg-edito-surface">
                        <div className="grid grid-cols-2 divide-x divide-y divide-edito-border">
                          {SOURCE_OPTIONS.map((source) => {
                            const familySources = sourcesByFamily[source.label] ?? []
                            const count = familySources.length
                            return (
                              <div key={source.key} className="p-3">
                                <details className="group [&>summary::-webkit-details-marker]:hidden [&[open]>summary>div>svg]:rotate-90">
                                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 outline-none">
                                    <div className="flex min-w-0 items-center gap-1.5">
                                      <svg className="size-3 shrink-0 text-edito-muted transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                      <span className="truncate text-xs font-bold text-edito-navy">{source.label}</span>
                                      <span className="shrink-0 text-[11px] font-semibold text-edito-muted">({count})</span>
                                    </div>
                                    <div onClick={(e) => e.stopPropagation()}>
                                      <Switch label={source.label} checked={settings[source.key]} onChange={(checked) => updateBoolean(source.key, checked)} />
                                    </div>
                                  </summary>
                                  <div className="mt-2.5 border-t border-edito-border/60 pt-2">
                                    {count > 0 ? (
                                      <ul className="max-h-24 space-y-1 overflow-y-auto veille-scrollbar pr-1">
                                        {familySources.map((srcName, idx) => (
                                          <li key={idx} className="flex items-start gap-1.5 text-[9px] text-edito-body">
                                            <span className="mt-1 size-1 shrink-0 rounded-full bg-edito-muted/50" />
                                            <span className="leading-tight">{srcName}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-[9px] italic text-edito-muted">Aucune source détaillée</p>
                                    )}
                                  </div>
                                </details>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </section>

                    {/* 2 Large Action Cards: + Source and + Corpus */}
                    <section className="grid grid-cols-2 gap-3 sm:gap-4">
                      <LargeActionTile label="Source" onClick={() => setMiniDialog("source")} />
                      <LargeActionTile label="Corpus" onClick={() => setMiniDialog("corpus")} />
                    </section>
                  </div>
                ) : null}

                {stepIndex === 2 ? (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between"><SectionLabel>Intérêts</SectionLabel><span className="text-[10px] font-bold text-edito-navy">{activeInterestCount} actifs</span></div>
                    <div className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-small)] border-y border-edito-border bg-edito-surface">
                      {ACCOUNT_WATCH_CATEGORIES.map((category, index) => <div key={category.value} className={cn("relative flex min-h-[43px] items-center justify-between gap-2 border-edito-border/70 px-2.5 py-1.5 pl-3.5", index < ACCOUNT_WATCH_CATEGORIES.length - 2 && "border-b", index % 2 === 0 && "border-r")}><span className="absolute inset-y-2 left-0 w-0.5 bg-edito-brass" aria-hidden="true" /><span className="min-w-0 text-[10px] font-semibold leading-3 text-edito-navy sm:text-[11px] sm:leading-4">{category.label}</span><Switch label={category.label} checked={settings.monitoredCategories.includes(category.value)} onChange={() => toggleCategory(category.value)} /></div>)}
                    </div>
                  </section>
                ) : null}

                {stepIndex === 3 ? (
                  <div className="space-y-4">
                    <section className="flex flex-col gap-1.5"><label htmlFor="account-watch-aliases" className="text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-edito-heading">Intention & finalité</label><textarea id="account-watch-aliases" value={aliases} onChange={(event) => setAliases(event.target.value)} rows={3} placeholder="Clarifier l’intention et la finalité de la veille, orienter les recherches et l’analyse…" className="min-h-[90px] w-full resize-y rounded-[var(--radius-small)] border border-edito-border bg-edito-surface px-3 py-2.5 text-xs leading-5 text-edito-ink outline-none placeholder:text-edito-muted focus:border-primary" /></section>
                    <section className="flex flex-col gap-1.5"><label htmlFor="account-watch-notes" className="text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-edito-heading">Sujets à exclure</label><textarea id="account-watch-notes" value={settings.notes} onChange={(event) => setSettings((current) => ({ ...current, notes: event.target.value }))} rows={3} maxLength={2_000} placeholder="Thèmes, signaux ou angles à ignorer…" className="min-h-[90px] w-full resize-y rounded-[var(--radius-small)] border border-edito-border bg-edito-surface px-3 py-2.5 text-xs leading-5 text-edito-ink outline-none placeholder:text-edito-muted focus:border-primary" /></section>
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
          </>
        )}
      </AppDialog>

      <CompactDialogShell open={miniDialog === "source"} onOpenChange={(isOpen) => setMiniDialog(isOpen ? "source" : null)} title="Ajouter une source">
        <div className="space-y-4">
          <label className="block space-y-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-edito-heading">Nom de la source<input value={manualSourceName} onChange={(event) => setManualSourceName(event.target.value)} className="mt-1 min-h-11 w-full rounded-[var(--radius-small)] border border-edito-border bg-edito-surface px-3 text-sm font-normal normal-case tracking-normal text-edito-ink outline-none focus:border-primary" /></label>
          <label className="block space-y-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-edito-heading">Famille<select value={manualFamily} onChange={(event) => setManualFamily(event.target.value)} className="mt-1 min-h-11 w-full rounded-[var(--radius-small)] border border-edito-border bg-edito-surface px-3 text-sm font-normal normal-case tracking-normal text-edito-ink outline-none focus:border-primary">{SOURCE_OPTIONS.map((opt) => <option key={opt.key} value={opt.label}>{opt.label}</option>)}<option value="Autre">Autre</option></select></label>
          <label className="block space-y-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-edito-heading">URL<input type="url" value={manualUrl} onChange={(event) => setManualUrl(event.target.value)} placeholder="https://…" className="mt-1 min-h-11 w-full rounded-[var(--radius-small)] border border-edito-border bg-edito-surface px-3 text-sm font-normal normal-case tracking-normal text-edito-ink outline-none placeholder:text-edito-muted focus:border-primary" /></label>
          <div className="flex justify-end gap-2 border-t border-border pt-3"><button type="button" onClick={() => setMiniDialog(null)} className="min-h-10 rounded-[var(--radius-small)] bg-cockpit-cobalt-soft px-4 text-xs font-bold text-primary">Annuler</button><button type="button" onClick={addManualSource} className="min-h-10 rounded-[var(--radius-small)] bg-primary px-4 text-xs font-bold text-primary-fg">Valider</button></div>
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

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { AppDialog } from "@/components/ui/AppDialog"
import { Select } from "@/components/ui/Select"
import {
  Triangle,
  Switch,
  WatchSteps,
  SectionLabel,
  LargeActionTile,
  CompactDialogShell,
} from "@/components/intelligence/WatchSettingsDialogShell"
import { CompactCorpusImport } from "@/components/intelligence/CompactCorpusImport"
import { saveGlobalWatchSettingsAction } from "@/app/(app)/veille/_actions/veille-actions"
import type { GlobalWatchSettings } from "./veille-desktop-contracts"
import type { SourceManagementSnapshot } from "@/features/source-management/domain/source-management-contracts"

const GLOBAL_WATCH_STEPS = [
  { id: "type", label: "Type de veille" },
  { id: "sources", label: "Sources" },
  { id: "interests", label: "Intérêts" },
  { id: "details", label: "Précisions" },
] as const

const GLOBAL_INTERESTS = [
  "IA générative, agents & modèles",
  "Cloud, infrastructures & data centers",
  "Cybersécurité & menaces",
  "Data, plateformes & gouvernance",
  "Réglementation, conformité & souveraineté",
  "Marché IT, ESN & services numériques",
  "Transformation SI & grands programmes",
  "Logiciels, produits & innovations",
  "Investissements, M&A & partenariats",
  "Verticaux sectoriels & usages métier",
]

const DEPTH_CONFIG = {
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
} as const

export interface GlobalWatchSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSettings: GlobalWatchSettings
  sourceManagementSnapshot: SourceManagementSnapshot
}

export function GlobalWatchSettingsDialog({
  open,
  onOpenChange,
  initialSettings,
  sourceManagementSnapshot,
}: GlobalWatchSettingsDialogProps) {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const [settings, setSettings] = useState<GlobalWatchSettings>(initialSettings)
  const [miniDialog, setMiniDialog] = useState<"source" | "corpus" | "current" | null>(null)
  const [expandedDepth, setExpandedDepth] = useState<"standard" | "balanced" | "deep" | null>(settings.depth ?? "balanced")
  
  const [manualSourceName, setManualSourceName] = useState("")
  const [manualUrl, setManualUrl] = useState("")
  const [manualFamily, setManualFamily] = useState("Autre")
  
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const corpus = sourceManagementSnapshot.sectorCorpora.find(c => c.slug === "socle-sources-editoriales")
  const sourcesByFamily: Record<string, string[]> = {}
  
  if (corpus) {
    for (const item of corpus.items) {
      if (item.source && item.source.family) {
        const family = item.source.family
        if (!sourcesByFamily[family]) sourcesByFamily[family] = []
        sourcesByFamily[family].push(item.source.name)
      }
    }
  }
  
  const families = Object.keys(sourcesByFamily).sort()
  const activeFamiliesCount = families.filter(f => settings.sourceFamilyOverrides[f] !== false).length

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await saveGlobalWatchSettingsAction(settings)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSettings(result.settings)
      onOpenChange(false)
      router.refresh()
    })
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, GLOBAL_WATCH_STEPS.length - 1))
  }

  function goBack() {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1)
    } else {
      onOpenChange(false)
    }
  }

  function toggleInterest(interest: string) {
    setSettings(current => {
      const newInterests = current.interestTopics.includes(interest)
        ? current.interestTopics.filter(i => i !== interest)
        : [...current.interestTopics, interest]
      return { ...current, interestTopics: newInterests }
    })
  }

  function toggleFamily(family: string, checked: boolean) {
    setSettings(current => ({
      ...current,
      sourceFamilyOverrides: {
        ...current.sourceFamilyOverrides,
        [family]: checked
      }
    }))
  }

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Paramétrer la veille des actualités"
        headerLeading={miniDialog === "corpus" ? null : <button type="button" onClick={() => onOpenChange(false)} className="inline-flex min-h-8 items-center gap-2 text-xs font-bold text-primary transition-colors hover:text-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"><Triangle direction="left" />Retour</button>}
        headerCenter={stepIndex === 0 && miniDialog !== "corpus" ? <div className="flex items-center gap-2"><span className="text-[10px] font-bold leading-4 text-edito-navy sm:text-xs">Veille active</span><Switch label="Veille active" checked={settings.enabled} onChange={(enabled) => setSettings((current) => ({ ...current, enabled }))} /></div> : null}
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
            <div className="shrink-0 border-y border-edito-brass/60 bg-edito-navy text-white"><WatchSteps activeIndex={stepIndex} steps={GLOBAL_WATCH_STEPS} /></div>
            <div className="flex min-h-0 flex-1 flex-col px-4 sm:px-5">
              <div className="flex min-h-[64px] shrink-0 items-center justify-between gap-3 border-b border-border/70 py-2 sm:min-h-[70px]">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-heading text-lg font-bold leading-6 text-edito-navy">Paramétrer la veille des actualités</h2>
                </div>
                <div className="flex shrink-0 items-center justify-center">
                  <div className="flex size-10 items-center justify-center rounded-[var(--radius-small)] border border-edito-border bg-edito-canvas p-1 shadow-2xs">
                    <Image src="/icons_set/intel_actualite_client.png" alt="" width={24} height={24} className="size-6 object-contain" />
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto veille-scrollbar py-3 pr-1 sm:py-4">
                {stepIndex === 0 ? (
                  <fieldset disabled={!settings.enabled} className="space-y-3 disabled:opacity-45 sm:space-y-4">
                    <section className="space-y-1.5">
                      <SectionLabel>Fréquence</SectionLabel>
                      <Select id="global-watch-cadence" value={settings.cadence} disabled fullWidth className="min-h-10">
                        <option value="weekly">Standard · Hebdomadaire</option>
                      </Select>
                    </section>
                    <section className="space-y-2">
                      <SectionLabel>Profondeur</SectionLabel>
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        {(["standard", "balanced", "deep"] as const).map((depth) => {
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
                      <div className="flex items-center justify-between"><SectionLabel>Sources existantes</SectionLabel><span className="text-[10px] font-bold text-edito-navy">{activeFamiliesCount} actives</span></div>
                      
                      {/* 2-column Grid with single-line family header */}
                      <div className="overflow-hidden rounded-[var(--radius-small)] border border-edito-border bg-edito-surface">
                        <div className="grid grid-cols-2 divide-x divide-y divide-edito-border">
                          {families.map((family) => {
                            const familySources = sourcesByFamily[family] ?? []
                            const count = familySources.length
                            const isChecked = settings.sourceFamilyOverrides[family] !== false
                            return (
                              <div key={family} className="p-3">
                                <details className="group [&>summary::-webkit-details-marker]:hidden [&[open]>summary>div>svg]:rotate-90">
                                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 outline-none">
                                    <div className="flex min-w-0 items-center gap-1.5">
                                      <svg className="size-3 shrink-0 text-edito-muted transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                      <span className="truncate text-xs font-bold text-edito-navy">{family}</span>
                                      <span className="shrink-0 text-[11px] font-semibold text-edito-muted">({count})</span>
                                    </div>
                                    <div onClick={(e) => e.stopPropagation()}>
                                      <Switch label={family} checked={isChecked} onChange={(checked) => toggleFamily(family, checked)} />
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
                          {families.length === 0 && (
                            <p className="p-3 text-xs text-edito-muted italic">Aucune source trouvée dans le socle éditorial.</p>
                          )}
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
                    <div className="flex items-center justify-between"><SectionLabel>Intérêts</SectionLabel><span className="text-[10px] font-bold text-edito-navy">{settings.interestTopics.length} actifs</span></div>
                    <div className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-small)] border-y border-edito-border bg-edito-surface">
                      {GLOBAL_INTERESTS.map((interest, index) => <div key={interest} className={cn("relative flex min-h-[43px] items-center justify-between gap-2 border-edito-border/70 px-2.5 py-1.5 pl-3.5", index < GLOBAL_INTERESTS.length - 2 && "border-b", index % 2 === 0 && "border-r")}><span className="absolute inset-y-2 left-0 w-0.5 bg-edito-brass" aria-hidden="true" /><span className="min-w-0 text-[10px] font-semibold leading-3 text-edito-navy sm:text-[11px] sm:leading-4">{interest}</span><Switch label={interest} checked={settings.interestTopics.includes(interest)} onChange={() => toggleInterest(interest)} /></div>)}
                    </div>
                  </section>
                ) : null}

                {stepIndex === 3 ? (
                  <div className="space-y-4">
                    <section className="flex flex-col gap-1.5">
                      <label htmlFor="global-watch-intention" className="text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-edito-heading">Intention & finalité</label>
                      <textarea id="global-watch-intention" value={settings.intention ?? ""} onChange={(event) => setSettings((current) => ({ ...current, intention: event.target.value }))} rows={3} placeholder="Clarifier l’intention et la finalité de la veille, orienter les recherches et l’analyse…" className="min-h-[90px] w-full resize-y rounded-[var(--radius-small)] border border-edito-border bg-edito-surface px-3 py-2.5 text-xs leading-5 text-edito-ink outline-none placeholder:text-edito-muted focus:border-primary" />
                    </section>
                    <section className="flex flex-col gap-1.5">
                      <label htmlFor="global-watch-exclusions" className="text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-edito-heading">Sujets à exclure</label>
                      <textarea id="global-watch-exclusions" value={settings.exclusions ?? ""} onChange={(event) => setSettings((current) => ({ ...current, exclusions: event.target.value }))} rows={3} maxLength={2_000} placeholder="Thèmes, signaux ou angles à ignorer…" className="min-h-[90px] w-full resize-y rounded-[var(--radius-small)] border border-edito-border bg-edito-surface px-3 py-2.5 text-xs leading-5 text-edito-ink outline-none placeholder:text-edito-muted focus:border-primary" />
                    </section>
                  </div>
                ) : null}
              </div>

              <div className="min-h-8 shrink-0">{error ? <p role="status" className="truncate rounded-[var(--radius-small)] px-2.5 py-1.5 text-[10px] font-semibold leading-4 bg-danger/10 text-danger">{error}</p> : null}</div>
              <div className="flex min-h-[58px] shrink-0 items-center justify-between gap-3 border-t border-border">
                <button type="button" onClick={goBack} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-small)] bg-cockpit-cobalt-soft px-3.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15 active:scale-[0.98]"><Triangle direction="left" />Revenir</button>
                {stepIndex < GLOBAL_WATCH_STEPS.length - 1 ? <button type="button" onClick={goNext} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-small)] bg-primary px-4 text-xs font-bold text-primary-fg transition-colors hover:bg-primary-deep active:scale-[0.98]">Suivant<Triangle direction="right" /></button> : <button type="button" onClick={handleSave} disabled={isPending} className="min-h-10 rounded-[var(--radius-small)] bg-primary px-4 text-xs font-bold text-primary-fg transition-colors hover:bg-primary-deep active:scale-[0.98] disabled:opacity-50">{isPending ? "Enregistrement…" : "Enregistrer"}</button>}
              </div>
            </div>
          </>
        )}
      </AppDialog>

      <CompactDialogShell open={miniDialog === "source"} onOpenChange={(isOpen) => setMiniDialog(isOpen ? "source" : null)} title="Ajouter une source">
        <div className="space-y-4">
          <label className="block space-y-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-edito-heading">Nom de la source<input value={manualSourceName} onChange={(event) => setManualSourceName(event.target.value)} className="mt-1 min-h-11 w-full rounded-[var(--radius-small)] border border-edito-border bg-edito-surface px-3 text-sm font-normal normal-case tracking-normal text-edito-ink outline-none focus:border-primary" /></label>
          <label className="block space-y-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-edito-heading">Famille<select value={manualFamily} onChange={(event) => setManualFamily(event.target.value)} className="mt-1 min-h-11 w-full rounded-[var(--radius-small)] border border-edito-border bg-edito-surface px-3 text-sm font-normal normal-case tracking-normal text-edito-ink outline-none focus:border-primary">{families.map((f) => <option key={f} value={f}>{f}</option>)}<option value="Autre">Autre</option></select></label>
          <label className="block space-y-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-edito-heading">URL<input type="url" value={manualUrl} onChange={(event) => setManualUrl(event.target.value)} placeholder="https://…" className="mt-1 min-h-11 w-full rounded-[var(--radius-small)] border border-edito-border bg-edito-surface px-3 text-sm font-normal normal-case tracking-normal text-edito-ink outline-none placeholder:text-edito-muted focus:border-primary" /></label>
          <div className="flex justify-end gap-2 border-t border-border pt-3"><button type="button" onClick={() => setMiniDialog(null)} className="min-h-10 rounded-[var(--radius-small)] bg-cockpit-cobalt-soft px-4 text-xs font-bold text-primary">Annuler</button><button type="button" onClick={() => setMiniDialog(null)} className="min-h-10 rounded-[var(--radius-small)] bg-primary px-4 text-xs font-bold text-primary-fg">Valider</button></div>
        </div>
      </CompactDialogShell>

      <CompactDialogShell open={miniDialog === "current"} onOpenChange={(isOpen) => setMiniDialog(isOpen ? "current" : null)} title="Paramètres actuels">
        <dl className="divide-y divide-edito-border text-xs">
          {[
            ["État", settings.enabled ? "Veille active" : "Veille suspendue"],
            ["Cadence", "Hebdomadaire"],
            ["Profondeur", DEPTH_CONFIG[settings.depth]?.label ?? "Standard"],
            ["Sources", `${activeFamiliesCount} familles actives`],
            ["Intérêts", `${settings.interestTopics.length} thèmes`],
            ["Intention", settings.intention || "Non renseignée"],
            ["Exclusions", settings.exclusions || "Aucune"],
          ].map(([label, value]) => <div key={label} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2.5"><dt className="font-bold text-edito-heading">{label}</dt><dd className="min-w-0 break-words text-edito-body">{value}</dd></div>)}
        </dl>
      </CompactDialogShell>
    </>
  )
}

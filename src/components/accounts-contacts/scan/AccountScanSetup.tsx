"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { AccountScanCompanyField, AccountScanFactAttribute, AccountScanInformationMode } from "@/lib/n8n/types"
import { COMPANY_FIELD_LABELS, FACT_ATTRIBUTE_LABELS, type AccountScanSetupValues } from "./account-scan-utils"

export type AccountScanSetupCompany = {
  name: string
  website: string | null
  hqLocation: string | null
  siren: string | null
}

export type AccountScanSetupSummary = {
  elementCount: number
  sourceCount: number
  mode: AccountScanInformationMode
}

interface AccountScanSetupProps {
  company: AccountScanSetupCompany
  isMobile: boolean
  launching: boolean
  onLaunch: (values: AccountScanSetupValues) => void
  onSummaryChange?: (summary: AccountScanSetupSummary) => void
}

type ScopeCategory = {
  id: string
  label: string
  fields?: AccountScanCompanyField[]
  facts?: AccountScanFactAttribute[]
  classification?: boolean
}

const SCOPE_CATEGORIES: ScopeCategory[] = [
  { id: "identity", label: "Identité & coordonnées", fields: ["legal_name", "siren", "hq_location", "website"] },
  { id: "company", label: "Entreprise", fields: ["naf_code", "description", "sector", "employee_count", "revenue"] },
  { id: "news", label: "Faits & actualités", facts: ["strategic_priority", "transformation_program", "growth_trend"] },
  { id: "classification", label: "Classification & segmentation", classification: true },
  { id: "positioning", label: "Positionnement & marché", facts: ["business_model", "primary_activity", "technology", "establishment_count", "geographic_reach", "value_proposition", "differentiators", "market_position", "marketing_position", "target_customers"] },
  { id: "relations", label: "Relations & affiliations", facts: ["competitor", "partner", "market"] },
]

const SOURCE_OPTIONS = [
  { id: "inpi", label: "INPI · Registre des entreprises", monogram: "I", locked: true },
  { id: "infogreffe", label: "Infogreffe", monogram: "IG" },
  { id: "pappers", label: "Pappers", monogram: "P" },
  { id: "societe", label: "Societe.com", monogram: "S" },
  { id: "legal", label: "Data Legal Drive", monogram: "DL" },
] as const

const DEFAULT_FIELDS: AccountScanCompanyField[] = ["legal_name", "siren", "naf_code", "hq_location", "employee_count", "website", "description"]
const DEFAULT_FACTS = Object.keys(FACT_ATTRIBUTE_LABELS) as AccountScanFactAttribute[]

function categoryCount(category: ScopeCategory, fields: AccountScanCompanyField[], facts: AccountScanFactAttribute[], classification: boolean) {
  return (category.fields?.filter((field) => fields.includes(field)).length ?? 0)
    + (category.facts?.filter((fact) => facts.includes(fact)).length ?? 0)
    + (category.classification && classification ? 1 : 0)
}

function categorySize(category: ScopeCategory) {
  return (category.fields?.length ?? 0) + (category.facts?.length ?? 0) + (category.classification ? 1 : 0)
}

function ScopeCheck({ checked, indeterminate = false }: { checked: boolean; indeterminate?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[3px] border text-[10px] font-black transition-colors",
        checked || indeterminate ? "border-edito-navy bg-edito-navy text-white" : "border-edito-border bg-white text-transparent",
      )}
    >
      {indeterminate ? "−" : "✓"}
    </span>
  )
}

function SourceSwitch({ checked }: { checked: boolean }) {
  return (
    <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-edito-navy" : "bg-edito-border")}>
      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </span>
  )
}

export function AccountScanSetup({ company, isMobile, launching, onLaunch, onSummaryChange }: AccountScanSetupProps) {
  const [informationMode, setInformationMode] = useState<AccountScanInformationMode>("find")
  const [websiteHint, setWebsiteHint] = useState(company.website ?? "")
  const [locationHint, setLocationHint] = useState(company.hqLocation ?? "")
  const [sirenHint, setSirenHint] = useState(company.siren ?? "")
  const [requestedFields, setRequestedFields] = useState<AccountScanCompanyField[]>(DEFAULT_FIELDS)
  const [requestedFacts, setRequestedFacts] = useState<AccountScanFactAttribute[]>(DEFAULT_FACTS)
  const [requestClassification, setRequestClassification] = useState(true)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(isMobile ? null : "identity")
  const [sources, setSources] = useState<Record<string, boolean>>({ inpi: true, infogreffe: true, pappers: true, societe: true, legal: false })
  const [customSources, setCustomSources] = useState<{ url: string; label: string }[]>([])
  const [showCustomSource, setShowCustomSource] = useState(false)
  const [showCadrage, setShowCadrage] = useState(false)
  const [newSourceUrl, setNewSourceUrl] = useState("")
  const [newSourceLabel, setNewSourceLabel] = useState("")

  const elementCount = requestedFields.length + requestedFacts.length + (requestClassification ? 1 : 0)
  const sourceCount = Object.values(sources).filter(Boolean).length + customSources.length
  const summary = useMemo(() => ({ elementCount, sourceCount, mode: informationMode }), [elementCount, informationMode, sourceCount])

  useEffect(() => {
    onSummaryChange?.(summary)
  }, [onSummaryChange, summary])

  const setCategoryChecked = (category: ScopeCategory, checked: boolean) => {
    if (category.fields) {
      setRequestedFields((current) => checked
        ? Array.from(new Set([...current, ...category.fields!]))
        : current.filter((item) => !category.fields!.includes(item)))
    }
    if (category.facts) {
      setRequestedFacts((current) => checked
        ? Array.from(new Set([...current, ...category.facts!]))
        : current.filter((item) => !category.facts!.includes(item)))
    }
    if (category.classification) setRequestClassification(checked)
  }

  const toggleField = (field: AccountScanCompanyField) => {
    setRequestedFields((current) => current.includes(field) ? current.filter((item) => item !== field) : [...current, field])
  }

  const toggleFact = (fact: AccountScanFactAttribute) => {
    setRequestedFacts((current) => current.includes(fact) ? current.filter((item) => item !== fact) : [...current, fact])
  }

  const addCustomSource = () => {
    const url = newSourceUrl.trim()
    if (!url.startsWith("http")) return
    setCustomSources((current) => [...current, { url, label: newSourceLabel.trim() || url }])
    setNewSourceUrl("")
    setNewSourceLabel("")
    setShowCustomSource(false)
  }

  const handleLaunch = () => {
    if (launching || elementCount === 0) return
    onLaunch({
      informationMode,
      requestedFields,
      requestedFacts,
      requestClassification,
      websiteHint: websiteHint.trim() || null,
      locationHint: locationHint.trim() || null,
      selectedSiren: sirenHint.trim() || null,
      customSources,
    })
  }

  return (
    <div className="flex min-h-full flex-col bg-edito-canvas">
      <div className={cn("flex-1 p-4 sm:p-5 lg:p-6", isMobile ? "pb-28" : "overflow-y-auto")}>
        <fieldset className="mb-5 grid grid-cols-2 gap-2.5" aria-label="Mode du scan">
          {([
            { value: "find" as const, label: "Compléter les informations", description: "Identifier et compléter les données manquantes ou incomplètes" },
            { value: "verify" as const, label: "Vérifier l’existant", description: "Contrôler et valider les informations clés déjà présentes" },
          ]).map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 transition-[border-color,box-shadow] motion-reduce:transition-none",
                informationMode === option.value ? "border-primary ring-1 ring-primary/20" : "border-edito-border hover:border-primary/50",
              )}
            >
              <input className="sr-only" type="radio" name="scan-mode" checked={informationMode === option.value} onChange={() => setInformationMode(option.value)} />
              <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", informationMode === option.value ? "border-primary bg-primary text-white" : "border-edito-border")}>
                {informationMode === option.value ? <span className="size-1.5 rounded-full bg-white" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-edito-navy sm:text-sm">{option.label}</span>
                <span className="mt-0.5 hidden text-[11px] leading-snug text-edito-muted sm:block">{option.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className={cn("grid items-start gap-4", isMobile ? "grid-cols-1" : "lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]")}>
          <section className="overflow-hidden rounded-xl border border-edito-border bg-white" aria-labelledby="scan-scope-title">
            <div className="border-b border-edito-border px-4 py-3">
              <h3 id="scan-scope-title" className="text-[11px] font-black uppercase tracking-[0.08em] text-edito-navy">Périmètre</h3>
              <p className="mt-0.5 text-[11px] text-edito-muted">Choisissez les catégories d’informations à analyser.</p>
            </div>
            <div className="divide-y divide-edito-border/70 px-4">
              {SCOPE_CATEGORIES.map((category) => {
                const selectedCount = categoryCount(category, requestedFields, requestedFacts, requestClassification)
                const totalCount = categorySize(category)
                const checked = selectedCount === totalCount
                const partial = selectedCount > 0 && !checked
                const expanded = expandedCategory === category.id
                return (
                  <div key={category.id}>
                    <div className="flex min-h-12 items-center gap-2.5">
                      <button type="button" className="flex min-h-11 flex-1 items-center gap-2.5 text-left" onClick={() => setCategoryChecked(category, !checked)} aria-label={`${checked ? "Désélectionner" : "Sélectionner"} ${category.label}`}>
                        <ScopeCheck checked={checked} indeterminate={partial} />
                        <span className="flex-1 text-xs font-semibold text-edito-heading">{category.label}</span>
                      </button>
                      <span className="min-w-7 rounded-md bg-edito-chip px-1.5 py-1 text-center text-[10px] font-bold text-edito-muted">{selectedCount}</span>
                      <button type="button" onClick={() => setExpandedCategory(expanded ? null : category.id)} className="flex size-10 items-center justify-center text-edito-muted hover:text-edito-navy" aria-expanded={expanded} aria-label={`Afficher ${category.label}`}>
                        <svg className={cn("size-3.5 transition-transform", expanded && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
                      </button>
                    </div>
                    {expanded ? (
                      <div className="grid grid-cols-1 gap-1.5 pb-3 pl-6 sm:grid-cols-2 animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none">
                        {category.fields?.map((field) => (
                          <label key={field} className="flex min-h-8 cursor-pointer items-center gap-2 rounded px-2 hover:bg-edito-chip/60">
                            <input type="checkbox" checked={requestedFields.includes(field)} onChange={() => toggleField(field)} className="size-3.5 accent-primary" />
                            <span className="text-[11px] text-edito-body">{COMPANY_FIELD_LABELS[field]}</span>
                          </label>
                        ))}
                        {category.facts?.map((fact) => (
                          <label key={fact} className="flex min-h-8 cursor-pointer items-center gap-2 rounded px-2 hover:bg-edito-chip/60">
                            <input type="checkbox" checked={requestedFacts.includes(fact)} onChange={() => toggleFact(fact)} className="size-3.5 accent-primary" />
                            <span className="text-[11px] text-edito-body">{FACT_ATTRIBUTE_LABELS[fact]}</span>
                          </label>
                        ))}
                        {category.classification ? (
                          <label className="flex min-h-8 cursor-pointer items-center gap-2 rounded px-2 hover:bg-edito-chip/60 sm:col-span-2">
                            <input type="checkbox" checked={requestClassification} onChange={(event) => setRequestClassification(event.target.checked)} className="size-3.5 accent-primary" />
                            <span className="text-[11px] text-edito-body">Classification du compte sur les 7 axes KREDO</span>
                          </label>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <div className="border-t border-edito-border px-4 py-3">
              <button type="button" onClick={() => { setRequestedFields([]); setRequestedFacts([]); setRequestClassification(false) }} className="min-h-9 rounded-md border border-edito-border px-3 text-[11px] font-bold text-edito-body hover:bg-edito-chip">Réinitialiser</button>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-edito-border bg-white" aria-labelledby="scan-sources-title">
            <div className="border-b border-edito-border px-4 py-3">
              <h3 id="scan-sources-title" className="text-[11px] font-black uppercase tracking-[0.08em] text-edito-navy">Sources consultées</h3>
              <p className="mt-0.5 text-[11px] text-edito-muted">Activez les sources publiques à interroger.</p>
            </div>
            <div className="divide-y divide-edito-border/70 px-4">
              {SOURCE_OPTIONS.map((source) => {
                const checked = sources[source.id]
                const locked = "locked" in source && source.locked
                return (
                  <label key={source.id} className={cn("flex min-h-12 items-center gap-3", locked ? "cursor-default" : "cursor-pointer")}>
                    <input type="checkbox" className="sr-only" checked={checked} disabled={locked} onChange={(event) => setSources((current) => ({ ...current, [source.id]: event.target.checked }))} />
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-edito-chip text-[9px] font-black text-primary">{source.monogram}</span>
                    <span className="flex-1 text-xs font-semibold text-edito-heading">{source.label}</span>
                    <SourceSwitch checked={checked} />
                  </label>
                )
              })}
            </div>

            {customSources.map((source, index) => (
              <div key={`${source.url}-${index}`} className="flex items-center gap-3 border-t border-edito-border/70 px-4 py-2.5">
                <span className="flex size-7 items-center justify-center rounded-md bg-edito-chip text-sm font-bold text-primary">+</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-edito-heading">{source.label}</span><span className="block truncate text-[10px] text-edito-muted">{source.url}</span></span>
                <button type="button" onClick={() => setCustomSources((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="flex size-9 items-center justify-center text-edito-muted hover:text-danger" aria-label={`Supprimer ${source.label}`}>×</button>
              </div>
            ))}

            <div className="border-t border-edito-border px-4 py-3">
              {showCustomSource ? (
                <div className="grid gap-2 animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none sm:grid-cols-[1fr_1fr_auto]">
                  <input type="url" value={newSourceUrl} onChange={(event) => setNewSourceUrl(event.target.value)} placeholder="https://source.fr" className="min-h-10 rounded-md border border-edito-border bg-white px-3 text-xs outline-none focus:border-primary" />
                  <input type="text" value={newSourceLabel} onChange={(event) => setNewSourceLabel(event.target.value)} placeholder="Nom de la source" className="min-h-10 rounded-md border border-edito-border bg-white px-3 text-xs outline-none focus:border-primary" />
                  <button type="button" onClick={addCustomSource} className="min-h-10 rounded-md bg-edito-navy px-3 text-[11px] font-bold text-white hover:bg-edito-heading">Ajouter</button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowCustomSource(true)} className="flex min-h-10 items-center gap-2 text-[11px] font-bold text-edito-navy hover:text-primary"><span className="text-base leading-none">+</span> Ajouter une source personnalisée</button>
              )}
            </div>

            <div className="border-t border-edito-border px-4 py-3">
              <button type="button" onClick={() => setShowCadrage((current) => !current)} className="flex min-h-9 w-full items-center justify-between text-left text-[10px] font-black uppercase tracking-[0.08em] text-edito-muted" aria-expanded={showCadrage}>
                Cadrage manuel
                <svg className={cn("size-3.5 transition-transform", showCadrage && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
              </button>
              {showCadrage ? (
                <div className="grid gap-2 pt-2 sm:grid-cols-3 animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none">
                  <input type="url" value={websiteHint} onChange={(event) => setWebsiteHint(event.target.value)} placeholder="Site ciblé" aria-label="Site ciblé" className="min-h-10 rounded-md border border-edito-border px-3 text-xs outline-none focus:border-primary" />
                  <input type="text" value={locationHint} onChange={(event) => setLocationHint(event.target.value)} placeholder="Ville du siège" aria-label="Ville du siège" className="min-h-10 rounded-md border border-edito-border px-3 text-xs outline-none focus:border-primary" />
                  <input type="text" value={sirenHint} onChange={(event) => setSirenHint(event.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="SIREN (9 chiffres)" aria-label="SIREN forcé" className="min-h-10 rounded-md border border-edito-border px-3 text-xs outline-none focus:border-primary" />
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <div className={cn("flex shrink-0 items-center justify-between gap-3 border-t border-edito-border bg-white px-4 py-3 sm:px-5", isMobile && "fixed inset-x-0 bottom-0 z-30 pb-[max(0.75rem,env(safe-area-inset-bottom))]")}>
        <p className="text-[10px] font-semibold text-edito-muted sm:text-xs"><span className="font-black text-edito-navy">{elementCount}</span> éléments <span className="mx-1">·</span> <span className="font-black text-edito-navy">{sourceCount}</span> sources <span className="hidden sm:inline"><span className="mx-1">·</span> 2–4 min</span></p>
        <button type="button" onClick={handleLaunch} disabled={launching || elementCount === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-edito-brass bg-edito-navy px-4 text-xs font-bold text-white transition-colors hover:bg-edito-heading disabled:cursor-not-allowed disabled:border-edito-border disabled:bg-edito-border disabled:text-edito-muted">
          {launching ? "Initialisation…" : "Démarrer l’analyse"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  )
}

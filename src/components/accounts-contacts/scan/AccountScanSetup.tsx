"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { AccountScanCompanyField, AccountScanFactAttribute, AccountScanInformationMode } from "@/lib/n8n/types"
import { COMPANY_FIELD_LABELS, FACT_ATTRIBUTE_LABELS, type AccountScanSetupValues } from "./account-scan-utils"

export type AccountScanSetupCompany = {
  name: string
  website: string | null
  hqLocation: string | null
  siren: string | null
}

interface AccountScanSetupProps {
  company: AccountScanSetupCompany
  isMobile: boolean
  launching: boolean
  onLaunch: (values: AccountScanSetupValues) => void
}

export function AccountScanSetup({ company, isMobile, launching, onLaunch }: AccountScanSetupProps) {
  const [informationMode, setInformationMode] = useState<AccountScanInformationMode>("find")
  const [websiteHint, setWebsiteHint] = useState(company.website ?? "")
  const [locationHint, setLocationHint] = useState(company.hqLocation ?? "")
  const [sirenHint, setSirenHint] = useState(company.siren ?? "")
  
  // Flip card states
  const [flipRequested, setFlipRequested] = useState(false)
  const [flipSources, setFlipSources] = useState(false)
  
  // Custom sources
  const [customSources, setCustomSources] = useState<{ url: string; label: string }[]>([])
  const [newSourceUrl, setNewSourceUrl] = useState("")
  const [newSourceLabel, setNewSourceLabel] = useState("")

  // Checkboxes
  const [requestedFields, setRequestedFields] = useState<AccountScanCompanyField[]>([
    "legal_name", "siren", "naf_code", "hq_location", "employee_count", "website", "description"
  ])
  const [requestedFacts, setRequestedFacts] = useState<AccountScanFactAttribute[]>(
    Object.keys(FACT_ATTRIBUTE_LABELS) as AccountScanFactAttribute[]
  )
  const [requestClassification, setRequestClassification] = useState(true)
  
  // Sources selection
  const [sourceWebsite, setSourceWebsite] = useState(true)
  const [sourceNews, setSourceNews] = useState(true)

  const handleLaunch = () => {
    if (launching) return
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

  const toggleField = (field: AccountScanCompanyField) => {
    setRequestedFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field])
  }
  
  const toggleFact = (fact: AccountScanFactAttribute) => {
    setRequestedFacts(prev => prev.includes(fact) ? prev.filter(f => f !== fact) : [...prev, fact])
  }
  
  const addCustomSource = () => {
    if (!newSourceUrl.trim() || !newSourceUrl.startsWith("http")) return
    setCustomSources(prev => [...prev, { url: newSourceUrl.trim(), label: newSourceLabel.trim() || newSourceUrl.trim() }])
    setNewSourceUrl("")
    setNewSourceLabel("")
  }

  const removeCustomSource = (index: number) => {
    setCustomSources(prev => prev.filter((_, i) => i !== index))
  }

  const isSelectionEmpty = requestedFields.length === 0 && requestedFacts.length === 0 && !requestClassification

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300 py-0">
      <div className="pb-0.5">
        <h3 className="text-lg font-extrabold text-[#1E3150] tracking-tight">Scan IA - informations de l'entreprise</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Strategy Selection */}
        <fieldset className="space-y-2 sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Stratégie d'analyse</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                { 
                  value: "find" as const, 
                  label: "Trouver les informations manquantes",
                  badge: "Recommandé",
                  description: "Rechercher et compléter les champs non renseignés sur la fiche.",
                  icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )
                },
                { 
                  value: "verify" as const, 
                  label: "Vérifier l'existant",
                  badge: "Audit",
                  description: "Contrôler et auditer la fraîcheur des données déjà renseignées.",
                  icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                },
              ]
            ).map((option) => (
              <label
                key={option.value}
                className={cn(
                  "group relative flex cursor-pointer flex-col justify-between rounded-xl border-2 p-3.5 transition-all duration-200 ease-out",
                  informationMode === option.value
                    ? "border-[#D89B16] bg-[#FFFFFF] shadow-sm ring-2 ring-[#D89B16]/10"
                    : "border-[#CBD5E1] bg-[#FFFFFF] hover:border-[#D89B16]/60 hover:bg-[#F8FAFC]"
                )}
              >
                <input
                  type="radio"
                  name="informationMode"
                  value={option.value}
                  checked={informationMode === option.value}
                  onChange={() => setInformationMode(option.value)}
                  className="absolute right-4 top-4 h-4 w-4 opacity-0"
                />
                
                <div className="flex items-start justify-between">
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                    informationMode === option.value
                      ? "bg-[#1E3150] text-[#FBBF24]"
                      : "bg-[#F1F5F9] text-[#64748B] group-hover:bg-[#1E3150]/10"
                  )}>
                    {option.icon}
                  </div>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                    informationMode === option.value
                      ? "bg-[#D89B16] text-[#1E293B]"
                      : "bg-[#F1F5F9] text-[#64748B]"
                  )}>
                    {option.badge}
                  </span>
                </div>

                <div className="mt-2.5 space-y-0.5">
                  <span className={cn(
                    "block text-xs font-bold",
                    informationMode === option.value ? "text-[#1E3150]" : "text-[#243B63]"
                  )}>
                    {option.label}
                  </span>
                  <span className="block text-[10px] leading-relaxed text-[#526074]">
                    {option.description}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Informations recherchées Card */}
        <div className="relative perspective-1000 h-[250px]">
          <div className={cn("relative w-full h-full transition-transform duration-500 transform-style-3d", flipRequested && "rotate-y-180")}>
            
            {/* Front */}
            <div className={cn(
              "absolute inset-0 w-full h-full backface-hidden rounded-xl border-2 border-[#CBD5E1] bg-[#FFFFFF] p-4 flex flex-col items-center justify-center text-center hover:border-[#CBD5E1]/80 hover:shadow-sm transition-all",
              !flipRequested && "z-10"
            )}>
              <div className="h-10 w-10 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-2 text-[#1E3150] shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-[#1E3150] mb-1">Informations recherchées</h4>
              <p className="text-[11px] text-[#526074] mb-3 px-2 line-clamp-2">
                Sélectionnez spécifiquement les données firmographiques, faits ou classifications à extraire.
              </p>
              <button 
                type="button"
                onClick={() => setFlipRequested(true)}
                className="rounded-lg bg-[#1E3150] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#243B63] transition-colors shadow-sm"
              >
                Configurer
              </button>
              <div className="mt-2.5 text-[10px] font-semibold text-[#D89B16]">
                {requestedFields.length + requestedFacts.length + (requestClassification ? 1 : 0)} éléments sélectionnés
              </div>
            </div>

            {/* Back */}
            <div className={cn(
              "absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-xl border-2 border-[#D89B16] bg-[#FFFFFF] flex flex-col shadow-lg overflow-hidden",
              flipRequested && "z-10"
            )}>
              <div className="flex items-center justify-between border-b border-[#CBD5E1]/40 bg-[#F8FAFC] px-3.5 py-2 rounded-t-xl shrink-0">
                <h4 className="text-xs font-extrabold text-[#1E3150] uppercase tracking-wider">Sélection des données</h4>
                <button type="button" onClick={() => setFlipRequested(false)} className="text-[#64748B] hover:text-[#1E3150]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted block">Données de base</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["legal_name", "siren", "naf_code", "hq_location", "employee_count", "website", "description"] as AccountScanCompanyField[]).map(field => (
                      <label key={field} className="flex items-start gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={requestedFields.includes(field)} onChange={() => toggleField(field)} className="mt-0.5 rounded border-[#CBD5E1] text-[#1E3150] focus:ring-[#1E3150]" />
                        <span className="text-[10px] font-medium text-[#1E3150] leading-tight">{COMPANY_FIELD_LABELS[field]}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted block">Faits stratégiques</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(FACT_ATTRIBUTE_LABELS) as AccountScanFactAttribute[]).map(fact => (
                      <label key={fact} className="flex items-start gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={requestedFacts.includes(fact)} onChange={() => toggleFact(fact)} className="mt-0.5 rounded border-[#CBD5E1] text-[#1E3150] focus:ring-[#1E3150]" />
                        <span className="text-[10px] font-medium text-[#1E3150] leading-tight">{FACT_ATTRIBUTE_LABELS[fact]}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted block">Classification</label>
                  <label className="flex items-start gap-1.5 cursor-pointer bg-[#F8FAFC] p-1.5 rounded-lg border border-[#CBD5E1]/40">
                    <input type="checkbox" checked={requestClassification} onChange={(e) => setRequestClassification(e.target.checked)} className="mt-0.5 rounded border-[#CBD5E1] text-[#1E3150] focus:ring-[#1E3150]" />
                    <span className="text-[10px] font-bold text-[#1E3150] leading-tight">Classification du compte (7 axes)</span>
                  </label>
                </div>

              </div>
              <div className="border-t border-[#CBD5E1]/40 p-2 bg-[#F8FAFC] rounded-b-xl flex justify-between items-center shrink-0">
                <span className="text-[9px] text-muted">{requestedFields.length + requestedFacts.length + (requestClassification ? 1 : 0)} sélectionnés</span>
                <button type="button" onClick={() => { setRequestedFields([]); setRequestedFacts([]); setRequestClassification(false) }} className="text-[9px] font-semibold text-primary hover:underline">Tout désélectionner</button>
              </div>
            </div>
          </div>
        </div>

        {/* Sources consultées Card */}
        <div className="relative perspective-1000 h-[250px]">
          <div className={cn("relative w-full h-full transition-transform duration-500 transform-style-3d", flipSources && "rotate-y-180")}>
            
            {/* Front */}
            <div className={cn(
              "absolute inset-0 w-full h-full backface-hidden rounded-xl border-2 border-[#CBD5E1] bg-[#FFFFFF] p-4 flex flex-col items-center justify-center text-center hover:border-[#CBD5E1]/80 hover:shadow-sm transition-all",
              !flipSources && "z-10"
            )}>
              <div className="h-10 w-10 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-2 text-[#1E3150] shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-[#1E3150] mb-1">Sources & Cadrage</h4>
              <p className="text-[11px] text-[#526074] mb-3 px-2 line-clamp-2">
                Définissez les sources et apportez des éléments de contexte (site, ville, SIREN).
              </p>
              <button 
                type="button"
                onClick={() => setFlipSources(true)}
                className="rounded-lg bg-[#1E3150] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#243B63] transition-colors shadow-sm"
              >
                Configurer
              </button>
            </div>

            {/* Back */}
            <div className={cn(
              "absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-xl border-2 border-[#D89B16] bg-[#FFFFFF] flex flex-col shadow-lg overflow-hidden",
              flipSources && "z-10"
            )}>
              <div className="flex items-center justify-between border-b border-[#CBD5E1]/40 bg-[#F8FAFC] px-3.5 py-2 rounded-t-xl shrink-0">
                <h4 className="text-xs font-extrabold text-[#1E3150] uppercase tracking-wider">Sources & Cadrage</h4>
                <button type="button" onClick={() => setFlipSources(false)} className="text-[#64748B] hover:text-[#1E3150]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted block">Sources automatiques</label>
                  <label className="flex items-center gap-1.5 cursor-not-allowed opacity-70">
                    <input type="checkbox" checked={true} disabled className="rounded border-[#CBD5E1] text-[#1E3150]" />
                    <span className="text-[10px] font-medium text-[#1E3150]">Registre officiel (INSEE, Pappers...)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={sourceWebsite} onChange={(e) => setSourceWebsite(e.target.checked)} className="rounded border-[#CBD5E1] text-[#1E3150]" />
                    <span className="text-[10px] font-medium text-[#1E3150]">Site officiel</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={sourceNews} onChange={(e) => setSourceNews(e.target.checked)} className="rounded border-[#CBD5E1] text-[#1E3150]" />
                    <span className="text-[10px] font-medium text-[#1E3150]">Presse / actualités</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted block">Sources manuelles</label>
                  {customSources.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#F8FAFC] border border-[#CBD5E1]/40 rounded p-1.5">
                      <div className="truncate text-[9px] flex flex-col">
                        <span className="font-bold text-[#1E3150]">{s.label}</span>
                        <span className="text-[#64748B] truncate">{s.url}</span>
                      </div>
                      <button type="button" onClick={() => removeCustomSource(i)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-1.5 items-start pt-0.5">
                    <div className="flex flex-col gap-1 flex-1">
                      <input type="url" placeholder="https://..." value={newSourceUrl} onChange={e => setNewSourceUrl(e.target.value)} className="w-full text-[9px] px-2 py-1 border rounded" />
                      <input type="text" placeholder="Titre (optionnel)" value={newSourceLabel} onChange={e => setNewSourceLabel(e.target.value)} className="w-full text-[9px] px-2 py-1 border rounded" />
                    </div>
                    <button onClick={addCustomSource} type="button" className="shrink-0 bg-[#F1F5F9] text-[#1E3150] border border-[#CBD5E1] rounded px-2 py-1 text-[9px] font-bold hover:bg-[#E2E8F0] h-[44px] flex items-center">
                      Ajouter
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1.5 border-t border-[#CBD5E1]/40">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted block">Cadrage manuel</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <span className="text-[8px] text-[#64748B] mb-0.5 block">Site ciblé</span>
                      <input type="url" value={websiteHint} onChange={e => setWebsiteHint(e.target.value)} placeholder="https://..." className="w-full text-[9px] px-1.5 py-1 border rounded" />
                    </div>
                    <div>
                      <span className="text-[8px] text-[#64748B] mb-0.5 block">Ville HQ</span>
                      <input type="text" value={locationHint} onChange={e => setLocationHint(e.target.value)} placeholder="Paris" className="w-full text-[9px] px-1.5 py-1 border rounded" />
                    </div>
                    <div className="col-span-2">
                      <span className="text-[8px] text-[#64748B] mb-0.5 block">SIREN forcé</span>
                      <input type="text" value={sirenHint} onChange={e => setSirenHint(e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="9 chiffres" className="w-full text-[9px] px-1.5 py-1 border rounded" />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Launch Button */}
      <div className="pt-1">
        {isSelectionEmpty && (
          <p className="text-center text-xs text-red-500 mb-1 font-medium">Vous devez sélectionner au moins une information à rechercher.</p>
        )}
        <button
          type="button"
          onClick={handleLaunch}
          disabled={launching || isSelectionEmpty}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold text-[#FFFFFF] shadow-md transition-all duration-200",
            isMobile ? "min-h-[48px]" : "min-h-[44px]",
            (launching || isSelectionEmpty)
              ? "bg-[#CBD5E1] text-[#64748B] cursor-not-allowed shadow-none"
              : "bg-[#1E3150] hover:bg-[#243B63] hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]"
          )}
        >
          {launching ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Initialisation de l'analyse en cours…
            </>
          ) : (
            <>
              <svg className="h-4 w-4 text-[#FBBF24] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Démarrer l'analyse de compte
            </>
          )}
        </button>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />
    </div>
  )
}

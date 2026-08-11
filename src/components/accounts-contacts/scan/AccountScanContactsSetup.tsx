"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { AccountScanContactMode } from "@/lib/n8n/types"
import { clampMaxContacts, type AccountScanContactsSetupValues } from "./account-scan-utils"

const ROLE_OPTIONS = [
  "Direction générale",
  "Opérationnel",
  "Manager",
  "Achats",
  "IT",
]

const SEARCH_VECTOR_OPTIONS = [
  { id: "public_web", label: "Internet public" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "professional_networks", label: "Réseaux professionnels" },
  { id: "news", label: "Presse" },
]

interface AccountScanContactsSetupProps {
  companyName: string
  isMobile: boolean
  launching: boolean
  onLaunch: (values: AccountScanContactsSetupValues) => void
  onBackToInformation: () => void
}

export function AccountScanContactsSetup({
  companyName,
  isMobile,
  launching,
  onLaunch,
  onBackToInformation,
}: AccountScanContactsSetupProps) {
  const [contactMode, setContactMode] = useState<Exclude<AccountScanContactMode, "none">>("identify")
  const [requestedRoles, setRequestedRoles] = useState<string[]>(["Direction générale"])
  const [maxContacts, setMaxContacts] = useState(5)
  const [recentHireOnly, setRecentHireOnly] = useState(false)
  const [searchVectors, setSearchVectors] = useState<string[]>(["public_web", "linkedin"])

  const [flipProfiles, setFlipProfiles] = useState(false)
  const [flipVectors, setFlipVectors] = useState(false)

  function toggleRole(role: string) {
    setRequestedRoles((prev) => (
      prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]
    ))
  }

  function toggleVector(vector: string) {
    setSearchVectors((prev) => (
      prev.includes(vector) ? prev.filter((item) => item !== vector) : [...prev, vector]
    ))
  }

  function handleLaunch() {
    if (launching) return
    onLaunch({
      contactMode,
      requestedRoles,
      maxContacts: clampMaxContacts(maxContacts),
      recentHireOnly,
      searchVectors,
    })
  }
  
  const isRolesEmpty = requestedRoles.length === 0
  const isVectorsEmpty = searchVectors.length === 0

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300 py-0">
      <div className="pb-0.5">
        <h3 className="text-lg font-extrabold text-[#1E3150] tracking-tight">Scan IA - recherche de contacts</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Strategy Selection */}
        <fieldset className="space-y-2 sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Stratégie d'analyse</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                { 
                  value: "identify" as const, 
                  label: "Identifier de nouveaux contacts",
                  badge: "Prospection",
                  description: "Chercher de nouveaux interlocuteurs selon les profils ciblés.",
                  icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  )
                },
                { 
                  value: "confirm" as const, 
                  label: "Mettre à jour les contacts",
                  badge: "Audit",
                  description: "Vérifier si les contacts actuels sont toujours en poste.",
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
                  contactMode === option.value
                    ? "border-[#D89B16] bg-[#FFFFFF] shadow-sm ring-2 ring-[#D89B16]/10"
                    : "border-[#CBD5E1] bg-[#FFFFFF] hover:border-[#D89B16]/60 hover:bg-[#F8FAFC]"
                )}
              >
                <input
                  type="radio"
                  name="contactMode"
                  value={option.value}
                  checked={contactMode === option.value}
                  onChange={() => setContactMode(option.value)}
                  className="absolute right-4 top-4 h-4 w-4 opacity-0"
                />
                
                <div className="flex items-start justify-between">
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                    contactMode === option.value
                      ? "bg-[#1E3150] text-[#FBBF24]"
                      : "bg-[#F1F5F9] text-[#64748B] group-hover:bg-[#1E3150]/10"
                  )}>
                    {option.icon}
                  </div>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                    contactMode === option.value
                      ? "bg-[#D89B16] text-[#1E293B]"
                      : "bg-[#F1F5F9] text-[#64748B]"
                  )}>
                    {option.badge}
                  </span>
                </div>

                <div className="mt-2.5 space-y-0.5">
                  <span className={cn(
                    "block text-xs font-bold",
                    contactMode === option.value ? "text-[#1E3150]" : "text-[#243B63]"
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

        {/* Profils recherchés Card */}
        <div className="relative perspective-1000 h-[220px]">
          <div className={cn("relative w-full h-full transition-transform duration-500 transform-style-3d", flipProfiles && "rotate-y-180")}>
            
            {/* Front */}
            <div className={cn(
              "absolute inset-0 w-full h-full backface-hidden rounded-xl border-2 border-[#CBD5E1] bg-[#FFFFFF] p-4 flex flex-col items-center justify-center text-center hover:border-[#CBD5E1]/80 hover:shadow-sm transition-all",
              !flipProfiles && "z-10"
            )}>
              <div className="h-10 w-10 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-2 text-[#1E3150] shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-[#1E3150] mb-1">Profils recherchés</h4>
              <p className="text-[11px] text-[#526074] mb-3 px-2 line-clamp-2">
                Sélectionnez les fonctions à cibler et la volumétrie.
              </p>
              <button 
                type="button"
                onClick={() => setFlipProfiles(true)}
                className="rounded-lg bg-[#1E3150] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#243B63] transition-colors shadow-sm"
              >
                Configurer
              </button>
            </div>

            {/* Back */}
            <div className={cn(
              "absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-xl border-2 border-[#D89B16] bg-[#FFFFFF] flex flex-col shadow-lg overflow-hidden",
              flipProfiles && "z-10"
            )}>
              <div className="flex items-center justify-between border-b border-[#CBD5E1]/40 bg-[#F8FAFC] px-3.5 py-2 rounded-t-xl shrink-0">
                <h4 className="text-xs font-extrabold text-[#1E3150] uppercase tracking-wider">Profils</h4>
                <button type="button" onClick={() => setFlipProfiles(false)} className="text-[#64748B] hover:text-[#1E3150]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted block">Rôles cibles</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLE_OPTIONS.map((role) => {
                      const selected = requestedRoles.includes(role)
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => toggleRole(role)}
                          className={cn(
                            "inline-flex min-h-[26px] items-center rounded-lg border px-2.5 text-[10px] font-semibold transition-colors",
                            selected
                              ? "border-[#D89B16] bg-[#D89B16]/10 text-[#1E3150]"
                              : "border-[#CBD5E1] bg-white text-[#64748B] hover:text-[#1E3150]"
                          )}
                        >
                          {role}
                        </button>
                      )
                    })}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 border-t border-[#CBD5E1]/40 pt-2.5">
                  <label className="block">
                    <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-muted">Max. contacts</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={maxContacts}
                      onChange={(event) => setMaxContacts(clampMaxContacts(Number(event.target.value)))}
                      className="w-20 rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-xs text-[#1E3150] focus:border-[#D89B16] focus:outline-none"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer mt-4">
                    <input type="checkbox" checked={recentHireOnly} onChange={(e) => setRecentHireOnly(e.target.checked)} className="rounded border-[#CBD5E1] text-[#1E3150]" />
                    <span className="text-[10px] font-medium text-[#1E3150]">Recrutement (nouveaux arrivants)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vecteurs de recherche Card */}
        <div className="relative perspective-1000 h-[220px]">
          <div className={cn("relative w-full h-full transition-transform duration-500 transform-style-3d", flipVectors && "rotate-y-180")}>
            
            {/* Front */}
            <div className={cn(
              "absolute inset-0 w-full h-full backface-hidden rounded-xl border-2 border-[#CBD5E1] bg-[#FFFFFF] p-4 flex flex-col items-center justify-center text-center hover:border-[#CBD5E1]/80 hover:shadow-sm transition-all",
              !flipVectors && "z-10"
            )}>
              <div className="h-10 w-10 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-2 text-[#1E3150] shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-[#1E3150] mb-1">Vecteurs de recherche</h4>
              <p className="text-[11px] text-[#526074] mb-3 px-2 line-clamp-2">
                Définissez les canaux par lesquels l'IA cherchera les contacts.
              </p>
              <button 
                type="button"
                onClick={() => setFlipVectors(true)}
                className="rounded-lg bg-[#1E3150] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#243B63] transition-colors shadow-sm"
              >
                Configurer
              </button>
            </div>

            {/* Back */}
            <div className={cn(
              "absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-xl border-2 border-[#D89B16] bg-[#FFFFFF] flex flex-col shadow-lg overflow-hidden",
              flipVectors && "z-10"
            )}>
              <div className="flex items-center justify-between border-b border-[#CBD5E1]/40 bg-[#F8FAFC] px-3.5 py-2 rounded-t-xl shrink-0">
                <h4 className="text-xs font-extrabold text-[#1E3150] uppercase tracking-wider">Vecteurs</h4>
                <button type="button" onClick={() => setFlipVectors(false)} className="text-[#64748B] hover:text-[#1E3150]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                
                <div className="space-y-1.5">
                  {SEARCH_VECTOR_OPTIONS.map((vector) => (
                    <label key={vector.id} className="flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-[#F8FAFC] border border-transparent hover:border-[#CBD5E1]/40">
                      <span className="text-[10px] font-bold text-[#1E3150]">{vector.label}</span>
                      <input 
                        type="checkbox" 
                        checked={searchVectors.includes(vector.id)} 
                        onChange={() => toggleVector(vector.id)} 
                        className="rounded border-[#CBD5E1] text-[#D89B16] focus:ring-[#D89B16]" 
                      />
                    </label>
                  ))}
                </div>
                
                <div className="p-2 bg-yellow-50 rounded text-[9px] text-yellow-800 border border-yellow-200 leading-tight">
                  <strong>Note:</strong> Si un connecteur web n'est pas encore opérationnel dans le workflow n8n, l'IA tentera l'extraction depuis les sources directes.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={cn(
        "flex flex-col-reverse gap-2 border-t border-[#CBD5E1]/60 pt-3 sm:flex-row sm:items-center sm:justify-between",
        isMobile && "sticky bottom-0 z-20 -mx-4 bg-edito-canvas px-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
      )}>
        <button
          type="button"
          onClick={onBackToInformation}
          className={cn(
            "inline-flex items-center justify-center rounded-xl border-2 border-[#CBD5E1] bg-[#FFFFFF] px-4 text-xs font-bold text-[#1E3150] transition-colors hover:bg-[#F8FAFC]",
            isMobile ? "min-h-[44px]" : "min-h-[38px]"
          )}
        >
          Retour aux informations
        </button>
        <button
          type="button"
          onClick={handleLaunch}
          disabled={launching || isRolesEmpty || isVectorsEmpty}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl border px-6 text-xs font-bold transition-colors",
            isMobile ? "min-h-[44px]" : "min-h-[38px]",
            (launching || isRolesEmpty || isVectorsEmpty)
              ? "cursor-not-allowed border-[#CBD5E1] bg-[#CBD5E1] text-[#FFFFFF]"
              : "border-[#1E3150] bg-[#1E3150] text-[#FFFFFF] hover:bg-[#243B63] hover:shadow-lg"
          )}
        >
          {launching ? "Lancement…" : "Lancer la recherche contacts"}
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

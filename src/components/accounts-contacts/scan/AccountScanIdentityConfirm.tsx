"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export interface AccountScanIdentityConfirmProps {
  companyId: string
  selectedSirenHint: string | null
  isMobile: boolean
  onConfirm: (siren: string) => void
  onCancel: () => void
}

interface Candidate {
  siren: string
  name: string
  location: string
  nafCode: string | null
}

export function AccountScanIdentityConfirm({
  companyId,
  selectedSirenHint,
  isMobile,
  onConfirm,
  onCancel,
}: AccountScanIdentityConfirmProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSiren, setSelectedSiren] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualSiren, setManualSiren] = useState("")

  useEffect(() => {
    let cancelled = false
    async function fetchCandidates() {
      try {
        const res = await fetch("/api/intelligence/account-identity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, selectedSiren: selectedSirenHint }),
        })
        if (!res.ok) {
          throw new Error("Erreur lors de la recherche des candidats.")
        }
        const data = await res.json()
        if (cancelled) return
        setCandidates(data.candidates || [])
        
        if (data.candidates && data.candidates.length > 0) {
          setSelectedSiren(data.candidates[0].siren)
        } else {
          setManualMode(true)
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Erreur inattendue")
        setManualMode(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchCandidates()
    return () => { cancelled = true }
  }, [companyId, selectedSirenHint])

  const handleConfirm = () => {
    if (manualMode) {
      if (manualSiren.length === 9) {
        onConfirm(manualSiren)
      }
    } else if (selectedSiren) {
      onConfirm(selectedSiren)
    }
  }

  const isValid = manualMode ? manualSiren.length === 9 : !!selectedSiren

  const desktopContent = (
    <div className="mx-auto w-full max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300 py-2">
      <div className="space-y-1.5 pb-2">
        <h3 className="text-xl font-extrabold text-[#1E3150] tracking-tight">Confirmer l&apos;identité légale du compte</h3>
        <p className="text-sm text-[#526074]">
          Sélectionnez l&apos;entité juridique correspondante afin d'optimiser l'exactitude des recherches officielles.
        </p>
      </div>

      {loading ? (
        <div className="flex h-40 flex-col items-center justify-center gap-3 text-sm font-bold text-[#64748B] rounded-2xl border border-dashed border-[#CBD5E1] bg-[#FFFFFF]">
          <span className="h-6 w-6 rounded-full border-3 border-[#D89B16] border-t-transparent animate-spin" />
          Recherche en cours dans le registre national (INSEE / SIRENE)...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : (
        <div className="space-y-5">
          {!manualMode ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {candidates.map((c) => (
                <label
                  key={c.siren}
                  className={cn(
                    "group relative flex cursor-pointer flex-col justify-between rounded-2xl border-2 p-5 transition-all duration-300 ease-out",
                    selectedSiren === c.siren
                      ? "border-[#D89B16] bg-[#FFFFFF] shadow-xl ring-4 ring-[#D89B16]/15 scale-[1.01] -translate-y-1"
                      : "border-[#CBD5E1] bg-[#FFFFFF] hover:border-[#D89B16]/60 hover:bg-[#F8FAFC] hover:shadow-md hover:-translate-y-0.5"
                  )}
                >
                  <input
                    type="radio"
                    name="candidateSiren"
                    value={c.siren}
                    checked={selectedSiren === c.siren}
                    onChange={() => setSelectedSiren(c.siren)}
                    className="absolute right-4 top-4 h-4 w-4 opacity-0"
                  />
                  
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className={cn(
                        "text-base font-extrabold transition-colors",
                        selectedSiren === c.siren ? "text-[#1E3150]" : "text-[#243B63] group-hover:text-[#1E3150]"
                      )}>
                        {c.name}
                      </p>
                      <div className="flex flex-col gap-0.5 text-xs text-[#526074]">
                        <span className="font-mono font-bold text-[#1E3150]">SIREN : {c.siren}</span>
                        <span>{c.location}</span>
                        {c.nafCode && (
                          <span className="mt-1.5 inline-block rounded bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#64748B] w-fit">
                            NAF {c.nafCode}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110",
                      selectedSiren === c.siren
                        ? "bg-[#1E3150] text-[#FBBF24] shadow-md"
                        : "bg-[#F1F5F9] text-[#64748B]"
                    )}>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>

                  {selectedSiren === c.siren && (
                    <div className="absolute -top-2.5 -right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#D89B16] text-[#1E293B] shadow-md ring-4 ring-[#FFFFFF] animate-in zoom-in-50 duration-200">
                      <svg className="h-4 w-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </label>
              ))}
              
              <label
                className={cn(
                  "group relative flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-5 transition-all duration-200 hover:bg-[#F8FAFC]",
                  manualMode ? "border-[#D89B16] bg-[#FEF3C7]/20 shadow-md" : "border-[#CBD5E1] bg-[#FFFFFF]"
                )}
              >
                <input
                  type="radio"
                  name="candidateSiren"
                  checked={manualMode}
                  onChange={() => {
                    setManualMode(true)
                    setSelectedSiren(null)
                  }}
                  className="absolute opacity-0"
                />
                <span className={cn("text-xs font-extrabold uppercase tracking-wider transition-colors", manualMode ? "text-[#D89B16]" : "text-[#64748B] group-hover:text-[#1E3150]")}>
                  Autre entreprise / Saisie manuelle
                </span>
              </label>
            </div>
          ) : (
            <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-[#CBD5E1] bg-[#FFFFFF] p-6 shadow-md">
              <div>
                <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-[#64748B]">
                  Saisir le numéro SIREN (9 chiffres)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={manualSiren}
                  onChange={(e) => setManualSiren(e.target.value.replace(/\D/g, "").slice(0, 9))}
                  placeholder="Ex: 843192012"
                  className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 text-sm text-[#1E293B] shadow-inner focus:border-[#D89B16] focus:outline-none focus:ring-2 focus:ring-[#D89B16]/20 font-mono"
                  autoFocus
                />
              </div>
              {candidates.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setManualMode(false)
                    setSelectedSiren(candidates[0]?.siren || null)
                  }}
                  className="w-full text-center text-xs font-extrabold text-[#1E3150] hover:underline"
                >
                  ← Retour à la liste des suggestions
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-[#CBD5E1] bg-[#FFFFFF] px-5 py-3 text-sm font-bold text-[#526074] hover:bg-[#F8FAFC] hover:text-[#1E3150] transition-colors"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!isValid || loading}
          className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#1E3150] px-7 py-3.5 text-sm font-extrabold text-white shadow-lg transition-all hover:bg-[#243B63] hover:shadow-xl hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Valider et continuer le scan
          <svg className="h-4 w-4 text-[#FBBF24]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>
  )

  const mobileContent = (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-heading/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-[85vh] w-full flex-col overflow-hidden rounded-t-[24px] bg-canvas shadow-xl animate-in slide-in-from-bottom-full duration-300">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-5 py-4">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-heading">Confirmer l&apos;identité</h3>
            <p className="text-[11px] text-muted">Sélectionnez la bonne entité légale</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas/50 text-muted transition-colors hover:bg-canvas"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex h-32 flex-col items-center justify-center gap-3 text-sm text-muted">
              <span className="h-5 w-5 rounded-full border-2 border-muted border-t-transparent animate-spin" />
              Recherche en cours...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">
              {error}
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {!manualMode ? (
                <>
                  {candidates.map((c) => (
                    <label
                      key={c.siren}
                      className={cn(
                        "flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors",
                        selectedSiren === c.siren
                          ? "border-brand-brass bg-surface-raised ring-1 ring-brand-brass/20"
                          : "border-border bg-surface active:bg-canvas/40"
                      )}
                    >
                      <input
                        type="radio"
                        name="candidateSirenMobile"
                        value={c.siren}
                        checked={selectedSiren === c.siren}
                        onChange={() => setSelectedSiren(c.siren)}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-brand-brass"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-bold", selectedSiren === c.siren ? "text-heading" : "text-body")}>{c.name}</p>
                        <p className="mt-1 text-xs text-muted">SIREN: {c.siren}</p>
                        <p className="text-xs text-muted">{c.location}</p>
                      </div>
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setManualMode(true)
                      setSelectedSiren(null)
                    }}
                    className="w-full rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs font-bold uppercase tracking-wider text-muted active:bg-canvas/50"
                  >
                    Aucune de ces entreprises
                  </button>
                </>
              ) : (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">
                      SIREN manuel
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={manualSiren}
                      onChange={(e) => setManualSiren(e.target.value.replace(/\D/g, "").slice(0, 9))}
                      placeholder="9 chiffres"
                      className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-body shadow-inner focus:border-brand-brass focus:outline-none focus:ring-1 focus:ring-brand-brass/50"
                    />
                  </div>
                  {candidates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setManualMode(false)
                        setSelectedSiren(candidates[0]?.siren || null)
                      }}
                      className="w-full py-2 text-center text-xs font-bold text-primary"
                    >
                      Retour aux suggestions
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border bg-surface p-4 pb-safe">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-heading py-4 text-sm font-bold text-surface shadow-sm transition-all hover:bg-heading/90 disabled:opacity-50"
          >
            Valider et continuer
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )

  return isMobile ? mobileContent : desktopContent
}

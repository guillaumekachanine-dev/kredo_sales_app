"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { AccountScanInformationMode } from "@/lib/n8n/types"
import type { AccountScanSetupValues } from "./account-scan-utils"

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
  const [autoApplyOfficialMissing, setAutoApplyOfficialMissing] = useState(true)
  const [websiteHint, setWebsiteHint] = useState(company.website ?? "")
  const [locationHint, setLocationHint] = useState(company.hqLocation ?? "")
  const [sirenHint, setSirenHint] = useState(company.siren ?? "")

  const handleLaunch = () => {
    if (launching) return
    onLaunch({
      informationMode,
      autoApplyOfficialMissing,
      websiteHint: websiteHint.trim() || null,
      locationHint: locationHint.trim() || null,
      selectedSiren: sirenHint.trim() || null,
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-base font-bold text-heading">Scan rapide — {company.name}</h2>
        <p className="mt-0.5 text-[11px] text-body leading-relaxed">
          Recherche ou vérifie les informations principales du compte à partir du registre officiel et du
          site de l&apos;entreprise, puis propose des mises à jour à valider.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">
          Scan des informations
        </legend>
        {(
          [
            { value: "find" as const, label: "Trouver les informations manquantes", hint: "Ne cherche que les champs vides du compte." },
            { value: "verify" as const, label: "Vérifier les informations existantes", hint: "Recontrôle aussi les champs déjà renseignés." },
          ]
        ).map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
              informationMode === option.value
                ? "border-primary bg-primary/[0.06]"
                : "border-border bg-surface hover:bg-canvas/40"
            )}
          >
            <input
              type="radio"
              name="informationMode"
              value={option.value}
              checked={informationMode === option.value}
              onChange={() => setInformationMode(option.value)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="min-w-0">
              <span className="block text-xs font-bold text-heading">{option.label}</span>
              <span className="mt-0.5 block text-[11px] text-muted leading-relaxed">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">
          Scan des contacts
        </legend>
        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-canvas/30 px-3 py-2.5 opacity-70">
          <input type="checkbox" disabled className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0">
            <span className="block text-xs font-bold text-heading">Rechercher ou confirmer des contacts publics</span>
            <span className="mt-0.5 block text-[11px] font-semibold text-muted">Disponible au prochain lot</span>
          </span>
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5 hover:bg-canvas/40">
        <input
          type="checkbox"
          checked={autoApplyOfficialMissing}
          onChange={(e) => setAutoApplyOfficialMissing(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <span className="min-w-0 text-xs font-bold text-heading">
          Remplir automatiquement les champs vides issus de sources officielles
        </span>
      </label>

      <details className="group rounded-lg border border-border bg-surface">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted">
          Paramètres avancés
          <svg className="h-3 w-3 text-muted transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="space-y-3 border-t border-border/40 px-3 py-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">
              Site web connu
            </label>
            <input
              type="url"
              value={websiteHint}
              onChange={(e) => setWebsiteHint(e.target.value)}
              placeholder="https://…"
              className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-body focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">
              Localisation
            </label>
            <input
              type="text"
              value={locationHint}
              onChange={(e) => setLocationHint(e.target.value)}
              placeholder="Ville, département…"
              className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-body focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">
              SIREN
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={sirenHint}
              onChange={(e) => setSirenHint(e.target.value.replace(/\D/g, "").slice(0, 9))}
              placeholder="9 chiffres"
              className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-body focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>
      </details>

      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={handleLaunch}
          disabled={launching}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded border px-3 text-xs font-bold transition-colors",
            isMobile ? "min-h-[44px]" : "min-h-[36px]",
            launching
              ? "border-primary/20 bg-primary/5 text-primary/50 cursor-wait"
              : "border-primary bg-primary text-primary-fg hover:bg-primary/90"
          )}
        >
          {launching ? (
            <>
              <span className="h-3 w-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              Lancement…
            </>
          ) : (
            "Lancer le scan"
          )}
        </button>
      </div>
    </div>
  )
}

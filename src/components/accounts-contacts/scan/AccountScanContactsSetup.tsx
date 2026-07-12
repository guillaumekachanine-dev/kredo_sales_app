"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { AccountScanContactMode } from "@/lib/n8n/types"
import { clampMaxContacts, type AccountScanContactsSetupValues } from "./account-scan-utils"

const ROLE_OPTIONS = [
  "Direction générale",
  "DSI / Direction IT",
  "Data / IA",
  "Infrastructure / Cloud",
  "Cybersécurité",
  "Achats",
  "Ressources humaines",
  "Transformation",
  "Direction métier",
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
  const [requestedRoles, setRequestedRoles] = useState<string[]>(["Direction générale", "DSI / Direction IT"])
  const [maxContacts, setMaxContacts] = useState(5)

  function toggleRole(role: string) {
    setRequestedRoles((prev) => (
      prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]
    ))
  }

  function handleLaunch() {
    if (launching) return
    onLaunch({
      contactMode,
      requestedRoles,
      maxContacts: clampMaxContacts(maxContacts),
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-base font-bold text-heading">Recherche contacts — {companyName}</h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-body">
          Identifie des contacts publics ou vérifie les contacts déjà rattachés au compte. Les résultats restent en revue avant import CRM.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">
          Mode contacts
        </legend>
        {[
          { value: "identify" as const, label: "Identifier de nouveaux contacts", hint: "Recherche des interlocuteurs publics non encore rattachés." },
          { value: "confirm" as const, label: "Vérifier les contacts existants", hint: "Contrôle les contacts connus et propose des compléments sourcés." },
        ].map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
              contactMode === option.value
                ? "border-primary bg-primary/[0.06]"
                : "border-border bg-surface hover:bg-canvas/40"
            )}
          >
            <input
              type="radio"
              name="contactMode"
              value={option.value}
              checked={contactMode === option.value}
              onChange={() => setContactMode(option.value)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="min-w-0">
              <span className="block text-xs font-bold text-heading">{option.label}</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
          Rôles recherchés
        </legend>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((role) => {
            const selected = requestedRoles.includes(role)
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className={cn(
                  "inline-flex min-h-[32px] items-center rounded-full border px-3 text-[11px] font-semibold transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-muted hover:text-heading"
                )}
              >
                {role}
              </button>
            )
          })}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">
          Nombre maximal de contacts
        </span>
        <input
          type="number"
          min={1}
          max={10}
          value={maxContacts}
          onChange={(event) => setMaxContacts(clampMaxContacts(Number(event.target.value)))}
          className="w-24 rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-body focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </label>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBackToInformation}
          className={cn(
            "inline-flex items-center justify-center rounded border border-border bg-surface px-3 text-xs font-bold text-body transition-colors hover:bg-canvas/40",
            isMobile ? "min-h-[44px]" : "min-h-[36px]"
          )}
        >
          Retour aux informations
        </button>
        <button
          type="button"
          onClick={handleLaunch}
          disabled={launching}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded border px-4 text-xs font-bold transition-colors",
            isMobile ? "min-h-[44px]" : "min-h-[36px]",
            launching
              ? "cursor-wait border-primary/20 bg-primary/5 text-primary/50"
              : "border-primary bg-primary text-primary-fg hover:bg-primary/90"
          )}
        >
          {launching ? "Lancement…" : "Lancer la recherche contacts"}
        </button>
      </div>
    </div>
  )
}

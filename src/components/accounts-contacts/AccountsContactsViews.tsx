"use client"

import { useState } from "react"
import { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import {
  AccountRow,
  AccountsContactsData,
  ContactRow,
  StudyRow,
} from "@/lib/accounts-contacts/accounts-contacts-data"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"

function formatScore(score: number | null) {
  return score === null ? "—" : `${score}/5`
}

function PriorityBadge({ priority }: { priority: string }) {
  const label = priority === "haute" ? "Haute" : priority === "basse" ? "Basse" : "Normale"
  return (
    <span className={cn(
      "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
      priority === "haute" ? "border-warning/30 bg-warning/10 text-warning" : "border-border bg-canvas text-body"
    )}>
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Study Details Modal
// ─────────────────────────────────────────────────────────────────────────────

function StudyDetailsModal({ study, onClose }: { study: StudyRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <SurfaceCard className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-border animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/60 px-6 py-5 bg-canvas/30">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold font-heading text-heading">{study.companyName}</h2>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">Score IA: {formatScore(study.score)}</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {study.sector} · {study.segment}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-canvas/80 text-muted hover:text-heading transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Summary */}
          <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 font-heading">Synthèse de l&apos;Étude</h3>
            <p className="text-sm leading-relaxed text-body bg-canvas/30 rounded border border-border/40 p-4 font-normal">
              {study.summary}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Growth Trend */}
            <div className="rounded border border-border/40 p-4 bg-canvas/10">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 font-heading">Indicateurs de Croissance</h4>
              <p className="text-xs leading-relaxed text-body font-medium">{study.growthTrend}</p>
            </div>

            {/* Digital Maturity */}
            <div className="rounded border border-border/40 p-4 bg-canvas/10">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 font-heading">Maturité Digitale</h4>
              <p className="text-xs leading-relaxed text-body font-medium">{study.digitalMaturity}</p>
            </div>
          </div>

          {/* Sector Trends */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 font-heading">Contexte & Tendances Sectorielles</h3>
            <p className="text-xs leading-relaxed text-body bg-canvas/10 rounded border border-border/40 p-3">
              {study.sectorTrends}
            </p>
          </div>

          {/* Competitors */}
          {study.competitors && study.competitors.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 font-heading">Concurrents Identifiés</h3>
              <div className="flex flex-wrap gap-1.5">
                {study.competitors.map((comp, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded border border-border bg-canvas px-2.5 py-1 text-xs text-body font-medium"
                  >
                    {comp}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border/60 px-6 py-4 bg-canvas/30">
          <button
            onClick={onClose}
            className="rounded bg-primary px-4 py-2 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary/95"
          >
            Fermer l&apos;étude
          </button>
        </div>

      </SurfaceCard>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Accounts Sub-views
// ─────────────────────────────────────────────────────────────────────────────

function AccountsDesktop({
  accounts,
  onOpenStudy,
  studies,
}: {
  accounts: AccountRow[]
  onOpenStudy: (id: string) => void
  studies: StudyRow[]
}) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-heading">Comptes prioritaires</h2>
        <p className="mt-1 text-xs text-muted">Tri par score IA, nombre de contacts et nom d&apos;entreprise.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-canvas/50 text-[10px] font-bold uppercase tracking-wider text-muted">
              <th className="px-5 py-3">Compte</th>
              <th className="px-3 py-3">Secteur</th>
              <th className="px-3 py-3">Segment</th>
              <th className="px-3 py-3">Localisation</th>
              <th className="px-3 py-3 text-right">Contacts</th>
              <th className="px-3 py-3 text-right">Score</th>
              <th className="px-3 py-3 text-center">Priorité</th>
              <th className="px-5 py-3 text-right">Études</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {accounts.map((account) => {
              const hasStudy = studies.some((s) => s.id === account.id)
              return (
                <tr key={account.id} className="transition-colors hover:bg-canvas/40">
                  <td className="max-w-[220px] px-5 py-3">
                    <div className="font-semibold text-heading">{account.name}</div>
                    <div className="truncate text-[11px] text-muted">{account.website ?? "Site non renseigné"}</div>
                  </td>
                  <td className="px-3 py-3 text-body">{account.sector}</td>
                  <td className="px-3 py-3 text-body">{account.segment}</td>
                  <td className="px-3 py-3 text-body">{account.location}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-heading">{account.contactCount}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-heading">{formatScore(account.score)}</td>
                  <td className="px-3 py-3 text-center"><PriorityBadge priority={account.priority} /></td>
                  <td className="px-5 py-3 text-right">
                    {hasStudy ? (
                      <button
                        onClick={() => onOpenStudy(account.id)}
                        className="rounded bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20 active:scale-[.98]"
                      >
                        Consulter les études
                      </button>
                    ) : (
                      <span className="text-muted text-[11px] italic">Aucune étude</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  )
}

function AccountsMobile({
  accounts,
  onOpenStudy,
  studies,
}: {
  accounts: AccountRow[]
  onOpenStudy: (id: string) => void
  studies: StudyRow[]
}) {
  return (
    <div className="flex flex-col gap-3">
      {accounts.map((account) => {
        const hasStudy = studies.some((s) => s.id === account.id)
        return (
          <SurfaceCard key={account.id} className="p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-heading">{account.name}</h2>
                <p className="mt-1 text-xs text-body">{account.sector} · {account.location}</p>
              </div>
              <PriorityBadge priority={account.priority} />
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded border border-border bg-canvas px-2 py-2">
                <p className="text-[10px] text-muted">Score</p>
                <p className="text-sm font-bold text-heading">{formatScore(account.score)}</p>
              </div>
              <div className="rounded border border-border bg-canvas px-2 py-2">
                <p className="text-[10px] text-muted">Contacts</p>
                <p className="text-sm font-bold text-heading">{account.contactCount}</p>
              </div>
              <div className="rounded border border-border bg-canvas px-2 py-2">
                <p className="text-[10px] text-muted">Emails</p>
                <p className="text-sm font-bold text-heading">{account.emailCount}</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border/40 pt-2 mt-1">
              <span className="text-[11px] text-muted">Études stratégiques</span>
              {hasStudy ? (
                <button
                  onClick={() => onOpenStudy(account.id)}
                  className="rounded bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  Consulter les études
                </button>
              ) : (
                <span className="text-xs text-muted italic">Aucune étude</span>
              )}
            </div>
          </SurfaceCard>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Contacts Sub-views
// ─────────────────────────────────────────────────────────────────────────────

function ContactsDesktop({ contacts }: { contacts: ContactRow[] }) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-heading">Répertoire contacts</h2>
        <p className="mt-1 text-xs text-muted">Contacts rattachés aux entreprises importées.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-canvas/50 text-[10px] font-bold uppercase tracking-wider text-muted">
              <th className="px-5 py-3">Contact</th>
              <th className="px-3 py-3">Entreprise</th>
              <th className="px-3 py-3">Secteur</th>
              <th className="px-3 py-3">Fonction</th>
              <th className="px-5 py-3">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {contacts.map((contact) => (
              <tr key={contact.id} className="transition-colors hover:bg-canvas/40">
                <td className="px-5 py-3 font-semibold text-heading">{contact.fullName}</td>
                <td className="px-3 py-3 text-body">{contact.companyName}</td>
                <td className="px-3 py-3 text-body">{contact.companySector}</td>
                <td className="max-w-[320px] truncate px-3 py-3 text-body">{contact.jobTitle}</td>
                <td className="px-5 py-3 text-body">{contact.email ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  )
}

function ContactsMobile({ contacts }: { contacts: ContactRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      {contacts.map((contact) => (
        <SurfaceCard key={contact.id} className="p-4">
          <h2 className="text-sm font-bold text-heading">{contact.fullName}</h2>
          <p className="mt-1 text-xs text-body">{contact.jobTitle}</p>
          <p className="mt-2 text-xs font-semibold text-primary">{contact.companyName}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
            <span className="rounded border border-border bg-canvas px-2 py-1">{contact.companySector}</span>
            {contact.email && <span className="rounded border border-border bg-canvas px-2 py-1">Email OK</span>}
            {contact.phone && <span className="rounded border border-border bg-canvas px-2 py-1">Téléphone OK</span>}
          </div>
        </SurfaceCard>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Exported Client Component for Prospection Accounts Tab
// ─────────────────────────────────────────────────────────────────────────────

export function ProspectionAccountsView({
  data,
  device,
}: {
  data: AccountsContactsData
  device: DashboardDevice
}) {
  const [subTab, setSubTab] = useState<"accounts" | "contacts">("accounts")
  const [selectedStudy, setSelectedStudy] = useState<StudyRow | null>(null)

  const handleOpenStudy = (companyId: string) => {
    const study = data.studies.find((s) => s.id === companyId)
    if (study) {
      setSelectedStudy(study)
    }
  }

  return (
    <div className={cn("mx-auto flex w-full max-w-7xl flex-col bg-canvas", device === "mobile" ? "gap-4 px-4 py-5" : "gap-6 px-6 py-8")}>
      
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Prospection Intelligence</p>
          <h1 className={cn("font-heading font-bold tracking-tight text-heading", device === "mobile" ? "text-2xl" : "text-3xl")}>
            Comptes & Contacts
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-body">
            Vue consolidée des entreprises ciblées, des contacts clés et des analyses sectorielles stratégiques.
          </p>
        </div>
      </div>

      {/* Sub-tab selection */}
      <div className="flex gap-2 border-b border-border pb-3">
        <button
          onClick={() => setSubTab("accounts")}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
            subTab === "accounts"
              ? "bg-primary text-primary-fg shadow-sm"
              : "text-muted hover:text-heading hover:bg-canvas/50"
          )}
        >
          Comptes ({data.stats.companies})
        </button>
        <button
          onClick={() => setSubTab("contacts")}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
            subTab === "contacts"
              ? "bg-primary text-primary-fg shadow-sm"
              : "text-muted hover:text-heading hover:bg-canvas/50"
          )}
        >
          Contacts ({data.stats.contacts})
        </button>
      </div>

      {/* Dynamic Views */}
      {subTab === "accounts" && (
        device === "mobile" ? (
          <AccountsMobile accounts={data.accounts} onOpenStudy={handleOpenStudy} studies={data.studies} />
        ) : (
          <AccountsDesktop accounts={data.accounts} onOpenStudy={handleOpenStudy} studies={data.studies} />
        )
      )}

      {subTab === "contacts" && (
        device === "mobile" ? <ContactsMobile contacts={data.contacts} /> : <ContactsDesktop contacts={data.contacts} />
      )}

      {/* Study Modal */}
      {selectedStudy && (
        <StudyDetailsModal study={selectedStudy} onClose={() => setSelectedStudy(null)} />
      )}

      {/* Footer Info */}
      {device === "desktop" && (
        <div className="flex items-center justify-between rounded border border-border bg-surface px-5 py-4 text-xs text-muted mt-2">
          <span>Données issues de la Prospection Intelligence · Analyse et RAG actifs.</span>
        </div>
      )}
    </div>
  )
}

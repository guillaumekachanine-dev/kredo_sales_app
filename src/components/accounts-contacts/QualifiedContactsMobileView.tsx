"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { ContactIdentityDrawer } from "@/components/accounts-contacts/ContactIdentityDrawer"
import {
  filterQualifiedContacts,
  groupContactsByDepartment,
  sortQualifiedContacts,
  type DerivedContact,
  type QualifiedContactsFilterState,
  type QualifiedContactsSortMode,
} from "@/lib/accounts-contacts/qualified-contacts-helpers"
import { relationshipRoleLabel } from "@/lib/accounts-contacts/contact-constants"
import { cn } from "@/lib/utils"

type CompanyProp = {
  id: string
  name: string
  logoPath?: string | null
  website?: string | null
}

interface QualifiedContactsMobileViewProps {
  company: CompanyProp
  contacts: DerivedContact[]
}

export function QualifiedContactsMobileView({
  company,
  contacts,
}: QualifiedContactsMobileViewProps) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [filters, setFilters] = useState<QualifiedContactsFilterState>({
    decideurOnly: false,
    phoneOnly: false,
    activityOnly: false,
  })

  const [sortMode, setSortMode] = useState<QualifiedContactsSortMode>("decideurs")

  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [sortModalOpen, setSortModalOpen] = useState(false)

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.decideurOnly) count++
    if (filters.phoneOnly) count++
    if (filters.activityOnly) count++
    return count
  }, [filters])

  const filteredContacts = useMemo(
    () => filterQualifiedContacts(contacts, filters),
    [contacts, filters]
  )

  const sortedContacts = useMemo(
    () => sortQualifiedContacts(filteredContacts, sortMode),
    [filteredContacts, sortMode]
  )

  const metierGroups = useMemo(() => {
    if (sortMode !== "metier") return []
    return groupContactsByDepartment(sortedContacts)
  }, [sortedContacts, sortMode])

  const handleOpenContact = (contactId: string) => {
    setSelectedContactId(contactId)
    setDrawerOpen(true)
  }

  return (
    <main className="min-h-dvh bg-canvas pb-24 text-body select-none">
      {/* Header compact & identitaire (bleu cobalt franc) */}
      <header data-theme="cockpit" className="flex min-h-[76px] items-center gap-3 border-b-2 border-secondary bg-cockpit-cobalt px-4 py-3 text-white">
        <Link
          href={`/prospection/accounts/${company.id}`}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Retour au Cockpit Intelligence"
        >
          <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <polygon points="16,5 7,12 16,19" />
          </svg>
        </Link>

        <CompanyLogo
          name={company.name}
          logoPath={company.logoPath}
          website={company.website}
          size="lg"
          className="shrink-0 border-white/20 bg-white p-0.5"
        />

        <div className="flex min-w-0 flex-col justify-center gap-0.5">
          <p className="truncate text-[10px] font-bold uppercase leading-3 tracking-[0.14em] text-white/70">
            {company.name}
          </p>
          <h1 className="truncate text-lg font-extrabold leading-6 tracking-tight text-white">
            Contacts qualifiés
          </h1>
        </div>
      </header>

      {/* Ligne Filtres / Tri (une seule ligne horizontale) */}
      <div className="sticky top-0 z-20 border-b border-border/80 bg-canvas/95 px-4 py-2.5 backdrop-blur-md">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setFilterModalOpen(true)}
            className={cn(
              "flex min-h-[44px] items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold transition-all active:scale-98",
              activeFilterCount > 0
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-heading hover:bg-surface-hover"
            )}
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filtres</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-extrabold text-primary-fg">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSortModalOpen(true)}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-bold text-heading transition-all hover:bg-surface-hover active:scale-98"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            <span>Tri</span>
            <span className="text-[10px] font-medium text-muted">
              ({sortMode === "decideurs" ? "Décideurs" : sortMode === "metier" ? "Métier" : sortMode === "activite" ? "Activité" : "Cibles"})
            </span>
          </button>
        </div>
      </div>

      {/* Liste des contacts qualifiés */}
      <div className="px-4 py-3">
        {sortedContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center my-6">
            <svg className="h-8 w-8 text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm font-bold text-heading">Aucun contact qualifié pour ce compte</p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => setFilters({ decideurOnly: false, phoneOnly: false, activityOnly: false })}
                className="mt-2 text-xs font-semibold text-primary underline"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : sortMode === "metier" ? (
          <div className="space-y-4">
            {metierGroups.map((group) => (
              <div key={group.departmentKey} className="space-y-1.5">
                <div className="flex items-center gap-2 px-1 pt-2">
                  <span className="h-0.5 w-4 bg-brand-brass" aria-hidden="true" />
                  <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-muted">
                    {group.departmentLabel} ({group.contacts.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  {group.contacts.map((contact) => (
                    <ContactCardItem key={contact.id} contact={contact} onClick={() => handleOpenContact(contact.id)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedContacts.map((contact) => (
              <ContactCardItem key={contact.id} contact={contact} onClick={() => handleOpenContact(contact.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Sheet / Modale de Filtres */}
      {filterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setFilterModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-2xl border-t border-border bg-surface p-5 animate-in slide-in-from-bottom duration-250 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h2 className="text-sm font-bold text-heading">Filtres</h2>
              <button
                type="button"
                onClick={() => setFilterModalOpen(false)}
                className="rounded p-1 text-muted hover:text-heading"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex min-h-[48px] items-center justify-between rounded-lg border border-border/60 bg-canvas px-4 cursor-pointer">
                <span className="text-xs font-semibold text-heading">Décideur uniquement</span>
                <input
                  type="checkbox"
                  checked={filters.decideurOnly}
                  onChange={(e) => setFilters((f) => ({ ...f, decideurOnly: e.target.checked }))}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary/30"
                />
              </label>

              <label className="flex min-h-[48px] items-center justify-between rounded-lg border border-border/60 bg-canvas px-4 cursor-pointer">
                <span className="text-xs font-semibold text-heading">Téléphone renseigné</span>
                <input
                  type="checkbox"
                  checked={filters.phoneOnly}
                  onChange={(e) => setFilters((f) => ({ ...f, phoneOnly: e.target.checked }))}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary/30"
                />
              </label>

              <label className="flex min-h-[48px] items-center justify-between rounded-lg border border-border/60 bg-canvas px-4 cursor-pointer">
                <span className="text-xs font-semibold text-heading">Avec activité (Événements / Interactions)</span>
                <input
                  type="checkbox"
                  checked={filters.activityOnly}
                  onChange={(e) => setFilters((f) => ({ ...f, activityOnly: e.target.checked }))}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary/30"
                />
              </label>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-1">
              <button
                type="button"
                onClick={() => setFilters({ decideurOnly: false, phoneOnly: false, activityOnly: false })}
                className="text-xs font-semibold text-muted hover:text-heading min-h-[44px] px-2"
              >
                Réinitialiser
              </button>
              <button
                type="button"
                onClick={() => setFilterModalOpen(false)}
                className="rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-primary-fg min-h-[44px]"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sheet / Modale de Tri */}
      {sortModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSortModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-2xl border-t border-border bg-surface p-5 animate-in slide-in-from-bottom duration-250 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h2 className="text-sm font-bold text-heading">Ordre d&apos;affichage</h2>
              <button
                type="button"
                onClick={() => setSortModalOpen(false)}
                className="rounded p-1 text-muted hover:text-heading"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { key: "decideurs", label: "Décideurs", desc: "Priorité aux décideurs puis pouvoir décisionnel fort > moyen > faible" },
                { key: "metier", label: "Métier", desc: "Groupé par famille métier (Direction générale, IT, Data, Cloud...)" },
                { key: "activite", label: "Activité", desc: "Contacts avec activité récente en premier" },
                { key: "cibles", label: "Cibles prioritaires", desc: "Cibles prioritaires en premier" },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className={cn(
                    "flex min-h-[52px] items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors",
                    sortMode === opt.key ? "border-primary bg-primary/5" : "border-border/60 bg-canvas"
                  )}
                >
                  <div className="flex flex-col pr-2">
                    <span className="text-xs font-bold text-heading">{opt.label}</span>
                    <span className="text-[10px] text-muted">{opt.desc}</span>
                  </div>
                  <input
                    type="radio"
                    name="sortOption"
                    value={opt.key}
                    checked={sortMode === opt.key}
                    onChange={() => {
                      setSortMode(opt.key as QualifiedContactsSortMode)
                      setSortModalOpen(false)
                    }}
                    className="h-4 w-4 text-primary focus:ring-primary/30 shrink-0"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Drawer Contact */}
      <ContactIdentityDrawer
        contactId={selectedContactId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        device="mobile"
      />
    </main>
  )
}

function ContactCardItem({
  contact,
  onClick,
}: {
  contact: DerivedContact
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex min-h-[64px] items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 transition-all hover:bg-surface-hover active:scale-[0.99] cursor-pointer",
        contact.isDecisionMaker && "border-l-4 border-l-[#FFB812]"
      )}
    >
      {/* Gauche : Nom, Poste, Rôle */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate text-xs font-bold text-heading leading-tight">
            {contact.fullName}
          </span>
          {contact.isDecisionMaker && (
            <span className="shrink-0 rounded bg-[#FFB812]/15 px-1.5 py-0.5 text-[9px] font-extrabold text-[#B88000]">
              Décideur
            </span>
          )}
        </div>

        <span className="truncate text-[11px] font-medium text-body leading-tight">
          {contact.jobTitle || "Fonction non renseignée"}
        </span>

        {contact.relationshipRole && !contact.isDecisionMaker && (
          <span className="truncate text-[10px] font-medium text-muted capitalize leading-tight">
            {relationshipRoleLabel(contact.relationshipRole)}
          </span>
        )}
      </div>

      {/* Droite : Zone fixe de 3 pictogrammes (Téléphone, Activité, Cible) */}
      <div className="flex shrink-0 items-center gap-1.5" aria-label="Attributs du contact">
        {/* 1. Téléphone */}
        {contact.hasPhone ? (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary"
            aria-label="Téléphone renseigné"
            title="Téléphone renseigné"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
        ) : (
          <div className="h-7 w-7" aria-hidden="true" />
        )}

        {/* 2. Activité */}
        {contact.hasActivity ? (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md bg-info/10 text-info"
            aria-label="Activité récente"
            title="Activité récente"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        ) : (
          <div className="h-7 w-7" aria-hidden="true" />
        )}

        {/* 3. Cible */}
        {contact.isPriority ? (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md bg-warning/15 text-[#FFB812]"
            aria-label="Cible prioritaire"
            title="Cible prioritaire"
          >
            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        ) : (
          <div className="h-7 w-7" aria-hidden="true" />
        )}
      </div>
    </div>
  )
}

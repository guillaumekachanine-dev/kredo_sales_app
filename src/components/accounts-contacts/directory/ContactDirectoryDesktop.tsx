import { useMemo, useState } from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { getContactDisplayDecisionPower, relationshipRoleAccentColor } from "@/lib/accounts-contacts/contact-constants"
import { cn } from "@/lib/utils"
import type { ContactDirectoryAccountItem, ContactDirectoryItem } from "@/app/(app)/prospection/accounts/actions"
import { ContactDirectoryDetailPane, type ContactDetailData } from "./ContactDirectoryDetailPane"
import { ContactOverviewTab } from "../overview/ContactOverviewTab"
import type { AccountRow, ContactRow } from "@/lib/accounts-contacts/accounts-contacts-data"

interface ContactDirectoryDesktopProps {
  accounts: ContactDirectoryAccountItem[]
  contacts: ContactDirectoryItem[]
  selectedCompanyId: string | null
  onSelectCompanyId: (companyId: string | null) => void
  selectedContactId: string | null
  onSelectContactId: (contactId: string | null) => void
  contactDetailData: ContactDetailData | null
  isLoadingDetail: boolean
  onEditContact: (contactId: string) => void
  onScheduleContact: (contactId: string, company: { id: string; name: string } | null) => void
}

export function ContactDirectoryDesktop({
  accounts,
  contacts,
  selectedCompanyId,
  onSelectCompanyId,
  selectedContactId,
  onSelectContactId,
  contactDetailData,
  isLoadingDetail,
  onEditContact,
  onScheduleContact,
}: ContactDirectoryDesktopProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [accountSearchQuery, setAccountSearchQuery] = useState("")

  const totalContactsCount = contacts.length

  // Filter accounts based on account search query
  const filteredAccounts = useMemo(() => {
    const query = accountSearchQuery.trim().toLowerCase()
    if (!query) return accounts
    return accounts.filter((acc) => acc.name.toLowerCase().includes(query))
  }, [accounts, accountSearchQuery])

  // Filter contacts based on selected account and search query
  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return contacts.filter((c) => {
      if (selectedCompanyId && selectedCompanyId !== "overview" && c.companyId !== selectedCompanyId) {
        return false
      }
      if (!query) return true
      return (
        c.firstName.toLowerCase().includes(query) ||
        c.lastName.toLowerCase().includes(query) ||
        c.fullName.toLowerCase().includes(query) ||
        c.jobTitle.toLowerCase().includes(query) ||
        (c.department && c.department.toLowerCase().includes(query)) ||
        c.companyName.toLowerCase().includes(query)
      )
    })
  }, [contacts, selectedCompanyId, searchQuery])

  // Adapt data for ContactOverviewTab when requested
  const overviewAccounts = useMemo<AccountRow[]>(() => {
    return accounts.map((a) => ({
      id: a.id,
      name: a.name,
      sector: "",
      sectorId: null,
      sectorAttachment: null,
      segment: "",
      segmentId: null,
      tier: null,
      regimeAchat: null,
      revenue: "",
      location: "",
      sizeBand: null,
      priority: "normale",
      status: "client_actif",
      analysisStep: null,
      hasDedicatedWatch: false,
      website: a.website,
      contactCount: a.contactCount,
      emailCount: 0,
      summary: "",
      description: null,
      logoPath: a.logoPath,
      taskCount: 0,
      employeeCount: null,
      depthLevel: "noted",
      origin: "manual",
      hasStudy: false,
    }))
  }, [accounts])

  const overviewContacts = useMemo<ContactRow[]>(() => {
    return contacts.map((c) => ({
      id: c.id,
      personId: c.personId,
      companyId: c.companyId,
      companyName: c.companyName,
      companySector: "",
      fullName: c.fullName,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      linkedinUrl: c.linkedinUrl,
      jobTitle: c.jobTitle,
      relationshipRole: c.relationshipRole,
      relationshipLevel: c.relationshipLevel,
      department: c.department,
      managerContactId: null,
      status: "actif",
      isPriority: c.isPriority,
      campaignId: null,
      logoPath: c.companyLogoPath,
      website: c.companyWebsite,
    }))
  }, [contacts])

  const isDetailOpen = selectedContactId !== null

  return (
    <div className="flex h-full w-full items-stretch overflow-hidden relative">
      {/* ── Panneau 1 : Rail Gauche — Comptes (260px fixe) ────────────────────── */}
      <aside className="h-full w-[260px] shrink-0 border-r border-white/5 bg-[#0f122c]/90 transition-all duration-300 ease-out flex flex-col overflow-hidden">
        <div className="flex h-full flex-col overflow-hidden">
          {/* Header & Compact Account Search Bar */}
          <div className="px-3.5 py-3 border-b border-white/5 space-y-2 shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 px-0.5">Comptes CRM</h3>
            <div className="relative">
              <input
                type="text"
                value={accountSearchQuery}
                onChange={(e) => setAccountSearchQuery(e.target.value)}
                placeholder="Filtrer les comptes…"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-8 py-1.5 text-xs text-white placeholder-white/40 focus:border-brand-brass focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-brand-brass"
              />
              <svg
                className="absolute left-2.5 top-2 size-3.5 text-white/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              {accountSearchQuery ? (
                <button
                  type="button"
                  onClick={() => setAccountSearchQuery("")}
                  className="absolute right-2.5 top-2 text-white/40 hover:text-white"
                >
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* Button 1: Vue d'ensemble (Placé au-dessus de Tous les comptes) */}
            <button
              type="button"
              onClick={() => {
                onSelectCompanyId("overview")
                onSelectContactId(null)
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer border mb-1",
                selectedCompanyId === "overview"
                  ? "bg-brand-brass text-slate-950 border-brand-brass shadow-sm font-black"
                  : "bg-white/5 text-white/80 border-white/10 hover:bg-white/10 hover:text-white"
              )}
            >
              <div className="flex items-center gap-2">
                <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25v2.25a2.25 2.25 0 01-2.25 2.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
                </svg>
                <span className="truncate">Vue d&apos;ensemble</span>
              </div>
            </button>

            {/* Button 2: Tous les comptes */}
            <button
              type="button"
              onClick={() => onSelectCompanyId(null)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer",
                selectedCompanyId === null
                  ? "bg-white/10 text-white font-bold"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <span className="truncate">Tous les comptes</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/60">
                {totalContactsCount}
              </span>
            </button>

            <div className="my-1.5 border-t border-white/5" />

            {filteredAccounts.length > 0 ? (
              filteredAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => onSelectCompanyId(acc.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer",
                    selectedCompanyId === acc.id
                      ? "bg-white/15 text-white font-bold border border-white/10"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="size-6 shrink-0 rounded bg-white/5 p-0.5">
                      <CompanyLogo name={acc.name} logoPath={acc.logoPath} website={acc.website} fill className="size-full rounded" />
                    </div>
                    <span className="truncate font-medium">{acc.name}</span>
                  </div>
                  <span className="ml-2 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/50">
                    {acc.contactCount}
                  </span>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-white/40">
                Aucun compte trouvé
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Workspace Area: Vue d'ensemble OR Contact List + Expanded Contact Detail */}
      {selectedCompanyId === "overview" ? (
        <div className="h-full flex-1 min-w-0 overflow-y-auto bg-[#0c0e24]/90 p-6">
          <ContactOverviewTab
            accounts={overviewAccounts}
            contacts={overviewContacts}
            device="desktop"
            darkTheme
          />
        </div>
      ) : (
        <>
          {/* ── Panneau 2 : Zone centrale — Liste des contacts ───────────────────── */}
          <div
            className={cn(
              "h-full flex flex-col transition-all duration-300 ease-out min-w-0 bg-[#0c0e24]/60 border-r border-white/5",
              isDetailOpen ? "w-[320px] shrink-0" : "flex-1"
            )}
          >
            {/* Contact List Header / Search */}
            <div className="p-4 border-b border-white/5 space-y-3 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher prénom, nom, fonction, compte…"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-9 py-2 text-xs text-white placeholder-white/40 focus:border-brand-brass focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-brand-brass"
                />
                <svg
                  className="absolute left-3 top-2.5 size-4 text-white/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2.5 text-white/40 hover:text-white"
                  >
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ) : null}
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold text-white/50 px-1">
                <span>{filteredContacts.length} {filteredContacts.length > 1 ? "contacts trouvés" : "contact trouvé"}</span>
                {selectedCompanyId ? (
                  <button
                    type="button"
                    onClick={() => onSelectCompanyId(null)}
                    className="text-brand-brass hover:underline cursor-pointer"
                  >
                    Réinitialiser le filtre
                  </button>
                ) : null}
              </div>
            </div>

            {/* Contact List Items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => {
                  const isSelected = selectedContactId === contact.id
                  const displayDecision = getContactDisplayDecisionPower(contact.decisionPower, contact.relationshipRole)
                  const accentColor = relationshipRoleAccentColor(contact.relationshipRole)

                  return (
                    <div
                      key={contact.id}
                      onClick={() => onSelectContactId(contact.id)}
                      className={cn(
                        "relative flex items-center justify-between overflow-hidden rounded-xl px-3 py-2.5 transition-all cursor-pointer border",
                        accentColor && "pl-4",
                        isSelected
                          ? "border-brand-brass/40 bg-white/10 text-white shadow-sm"
                          : "border-transparent text-white/80 hover:border-white/5 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {accentColor ? (
                        <span
                          className="absolute bottom-0 left-0 top-0 w-1 rounded-l-xl"
                          style={{ backgroundColor: accentColor }}
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs truncate text-white">{contact.fullName}</span>
                          {contact.isPriority ? (
                            <span className="size-1.5 shrink-0 rounded-full bg-brand-brass" title="Contact prioritaire" />
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-white/55 truncate">
                          <span className="truncate">{contact.jobTitle}</span>
                          <span className="text-white/20">•</span>
                          <span className="shrink-0 font-medium text-white/70">{displayDecision}</span>
                        </div>

                        {!selectedCompanyId ? (
                          <p className="mt-0.5 text-[10px] text-white/40 truncate">{contact.companyName}</p>
                        ) : null}
                      </div>

                      {/* Right side contact pictograms */}
                      <div className="flex shrink-0 items-center gap-1.5 text-white/60">
                        {contact.phone ? (
                          <a
                            href={`tel:${contact.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded p-1 transition-colors hover:bg-white/10 hover:text-white"
                            title={`Appeler ${contact.phone}`}
                          >
                            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.826-1.01-5.09-3.274-6.1-6.1l1.292-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                            </svg>
                          </a>
                        ) : null}

                        {contact.email ? (
                          <a
                            href={`mailto:${contact.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded p-1 transition-colors hover:bg-white/10 hover:text-white"
                            title={`Écrire à ${contact.email}`}
                          >
                            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                          </a>
                        ) : null}

                        {contact.linkedinUrl ? (
                          <a
                            href={contact.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="rounded p-1 text-brand-brass transition-colors hover:bg-white/10 hover:text-brand-brass/80"
                            title="Profil LinkedIn"
                          >
                            <svg className="size-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.64a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24Z" />
                            </svg>
                          </a>
                        ) : null}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="flex h-40 flex-col items-center justify-center text-center text-white/40 text-xs">
                  <p>Aucun contact ne correspond à votre recherche.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Panneau 3 : Panneau de détail contact (Agrandit tout le reste de la largeur flex-1) ─ */}
          {isDetailOpen ? (
            <div className="h-full flex-1 min-w-0 transition-all duration-300 ease-out">
              <ContactDirectoryDetailPane
                data={contactDetailData}
                isLoading={isLoadingDetail}
                onCloseDetail={() => onSelectContactId(null)}
                onEditContact={onEditContact}
                onScheduleContact={onScheduleContact}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}


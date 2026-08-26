import { useMemo, useState } from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { getContactDisplayDecisionPower } from "@/lib/accounts-contacts/contact-constants"
import { cn } from "@/lib/utils"
import type { ContactDirectoryAccountItem, ContactDirectoryItem } from "@/app/(app)/prospection/accounts/actions"
import { ContactDirectoryDetailPane, type ContactDetailData } from "./ContactDirectoryDetailPane"
import { ContactOverviewTab } from "../overview/ContactOverviewTab"
import type { AccountRow, ContactRow } from "@/lib/accounts-contacts/accounts-contacts-data"

interface ContactDirectoryMobileProps {
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

export function ContactDirectoryMobile({
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
}: ContactDirectoryMobileProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter contacts
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

  // Adapt data for ContactOverviewTab
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

  // Screen 2: Detail view if contact selected
  if (selectedContactId !== null) {
    return (
      <div className="flex h-full w-full flex-col bg-[#0f122c] text-white">
        <ContactDirectoryDetailPane
          data={contactDetailData}
          isLoading={isLoadingDetail}
          onCloseDetail={() => onSelectContactId(null)}
          onEditContact={onEditContact}
          onScheduleContact={onScheduleContact}
        />
      </div>
    )
  }

  // Screen 1: Mobile Directory List
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#0c0e24] text-white">
      {/* Account Selector Pill Rail */}
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto p-4 border-b border-white/5 no-scrollbar">
        {/* Pill 1: Vue d'ensemble */}
        <button
          type="button"
          onClick={() => onSelectCompanyId("overview")}
          className={cn(
            "min-h-11 shrink-0 rounded-full px-4 text-xs font-bold transition-colors cursor-pointer border",
            selectedCompanyId === "overview"
              ? "bg-brand-brass text-slate-950 border-brand-brass font-black"
              : "bg-white/10 text-white/80 border-white/10 hover:bg-white/15 hover:text-white"
          )}
        >
          Vue d&apos;ensemble
        </button>

        {/* Pill 2: Tous les comptes */}
        <button
          type="button"
          onClick={() => onSelectCompanyId(null)}
          className={cn(
            "min-h-11 shrink-0 rounded-full px-4 text-xs font-bold transition-colors cursor-pointer border",
            selectedCompanyId === null
              ? "bg-brand-brass text-slate-950 border-brand-brass"
              : "bg-white/10 text-white/70 border-white/5 hover:bg-white/15 hover:text-white"
          )}
        >
          Tous les comptes ({contacts.length})
        </button>

        {accounts.map((acc) => (
          <button
            key={acc.id}
            type="button"
            onClick={() => onSelectCompanyId(acc.id)}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-xs font-semibold transition-colors cursor-pointer border",
              selectedCompanyId === acc.id
                ? "border-brand-brass bg-white/15 text-white font-bold"
                : "border-white/5 bg-white/5 text-white/70 hover:bg-white/10"
            )}
          >
            <div className="size-5 shrink-0 rounded p-0.5 bg-white/10">
              <CompanyLogo name={acc.name} logoPath={acc.logoPath} website={acc.website} fill className="size-full rounded" />
            </div>
            <span className="truncate max-w-[120px]">{acc.name}</span>
            <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px]">{acc.contactCount}</span>
          </button>
        ))}
      </div>

      {selectedCompanyId === "overview" ? (
        <div className="flex-1 overflow-y-auto p-4">
          <ContactOverviewTab
            accounts={overviewAccounts}
            contacts={overviewContacts}
            device="mobile"
            darkTheme
          />
        </div>
      ) : (
        <>

      {/* Search Input */}
      <div className="p-4 pb-2 shrink-0">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un contact, une fonction…"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-10 py-3 text-sm text-white placeholder-white/40 focus:border-brand-brass focus:bg-white/10 focus:outline-none"
          />
          <svg className="absolute left-3.5 top-3.5 size-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-3.5 text-white/40 hover:text-white min-h-11 min-w-11 flex items-center justify-center -mr-3 -mt-2"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-[11px] font-semibold text-white/50 px-1">
          {filteredContacts.length} {filteredContacts.length > 1 ? "contacts disponibles" : "contact disponible"}
        </p>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-2">
        {filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => {
            const displayDecision = getContactDisplayDecisionPower(contact.decisionPower, contact.relationshipRole)

            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => onSelectContactId(contact.id)}
                className="flex w-full min-h-[64px] items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] p-3.5 text-left transition-all active:bg-white/10 cursor-pointer"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white truncate">{contact.fullName}</span>
                    {contact.isPriority ? <span className="size-2 rounded-full bg-brand-brass shrink-0" /> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-white/70 truncate">{contact.jobTitle}</p>
                  <p className="mt-0.5 text-[11px] text-white/45 truncate">
                    {contact.companyName} · <span className="text-white/65 font-medium">{displayDecision}</span>
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2 text-white/40">
                  {contact.phone || contact.email || contact.linkedinUrl ? (
                    <div className="flex items-center gap-1">
                      {contact.phone ? <span className="size-1.5 rounded-full bg-emerald-400" /> : null}
                      {contact.email ? <span className="size-1.5 rounded-full bg-sky-400" /> : null}
                      {contact.linkedinUrl ? <span className="size-1.5 rounded-full bg-blue-500" /> : null}
                    </div>
                  ) : null}
                  <svg className="size-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </button>
            )
          })
        ) : (
          <div className="flex h-48 flex-col items-center justify-center text-center text-white/40 text-xs">
            <p>Aucun contact trouvé.</p>
          </div>
        )}
      </div>
    </>
  )}
</div>
  )
}

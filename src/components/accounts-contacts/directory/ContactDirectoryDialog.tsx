"use client"

import { useEffect, useState, useTransition } from "react"
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
import {
  getContactDirectoryData,
  getContactIdentity,
  type ContactDirectoryAccountItem,
  type ContactDirectoryItem,
} from "@/app/(app)/prospection/accounts/actions"
import { ContactDirectoryDesktop } from "./ContactDirectoryDesktop"
import { ContactDirectoryMobile } from "./ContactDirectoryMobile"
import type { ContactDetailData } from "./ContactDirectoryDetailPane"
import { ContactFormModal } from "@/components/accounts-contacts/AccountsContactsViews"
import { AgendaEventDrawer, type AgendaEventDrawerInitialValues } from "@/components/agenda/AgendaEventDrawer"
import { CockpitReturnButton } from "@/components/intelligence/CockpitReturnButton"
import type { AccountRow, ContactRow } from "@/lib/accounts-contacts/accounts-contacts-data"

export interface ContactDirectoryDialogProps {
  open: boolean
  onClose: () => void
  initialCompanyId?: string | null
  isMobile?: boolean
  onReturnToCockpit?: () => void
}

export function ContactDirectoryDialog({
  open,
  onClose,
  initialCompanyId,
  isMobile = false,
  onReturnToCockpit,
}: ContactDirectoryDialogProps) {
  const [accounts, setAccounts] = useState<ContactDirectoryAccountItem[]>([])
  const [contacts, setContacts] = useState<ContactDirectoryItem[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(initialCompanyId ?? null)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [contactDetailData, setContactDetailData] = useState<ContactDetailData | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  // Edit contact state
  const [editingContactId, setEditingContactId] = useState<string | null>(null)

  // Agenda event drawer state
  const [agendaDrawerOpen, setAgendaDrawerOpen] = useState(false)
  const [agendaInitialValues, setAgendaInitialValues] = useState<AgendaEventDrawerInitialValues | undefined>(undefined)

  const [, startTransition] = useTransition()

  const handleSelectContactId = (contactId: string | null) => {
    setSelectedContactId(contactId)
    if (contactId) {
      setIsLoadingDetail(true)
    } else {
      setContactDetailData(null)
    }
  }

  // Fetch directory data when modal opens
  useEffect(() => {
    if (!open) return

    let active = true

    getContactDirectoryData().then((res) => {
      if (!active) return
      if (res.data) {
        setAccounts(res.data.accounts)
        setContacts(res.data.contacts)
      }
      setIsLoadingData(false)
    })

    return () => {
      active = false
    }
  }, [open])

  // Lazy load contact identity when a contact is selected
  useEffect(() => {
    if (!open || !selectedContactId) return

    let active = true

    getContactIdentity(selectedContactId).then((res) => {
      if (!active) return
      setIsLoadingDetail(false)
      if (res.data && res.data.contact) {
        setContactDetailData(res.data as unknown as ContactDetailData)
      } else {
        setContactDetailData(null)
      }
    })

    return () => {
      active = false
    }
  }, [open, selectedContactId])

  const refreshDirectoryAndDetail = async (contactIdToRefresh?: string | null) => {
    const res = await getContactDirectoryData()
    if (res.data) {
      setAccounts(res.data.accounts)
      setContacts(res.data.contacts)
    }
    const targetId = contactIdToRefresh || selectedContactId
    if (targetId) {
      const detailRes = await getContactIdentity(targetId)
      if (detailRes.data && detailRes.data.contact) {
        setContactDetailData(detailRes.data as unknown as ContactDetailData)
      }
    }
  }

  const handleEditContact = (contactId: string) => {
    setEditingContactId(contactId)
  }

  const handleScheduleContact = (contactId: string, company: { id: string; name: string } | null) => {
    setAgendaInitialValues({
      company: company ? { id: company.id, name: company.name, isNew: false } : null,
      contact_id: contactId,
    })
    setAgendaDrawerOpen(true)
  }

  // Build props for ContactFormModal
  const editingContactItem = contacts.find((c) => c.id === editingContactId)
  const initialContactRowForModal: ContactRow | undefined = editingContactItem
    ? {
        id: editingContactItem.id,
        personId: editingContactItem.personId,
        companyId: editingContactItem.companyId,
        companyName: editingContactItem.companyName,
        companySector: "",
        fullName: editingContactItem.fullName,
        firstName: editingContactItem.firstName,
        lastName: editingContactItem.lastName,
        email: editingContactItem.email,
        phone: editingContactItem.phone,
        linkedinUrl: editingContactItem.linkedinUrl,
        jobTitle: editingContactItem.jobTitle,
        relationshipRole: editingContactItem.relationshipRole,
        relationshipLevel: editingContactItem.relationshipLevel,
        department: editingContactItem.department,
        managerContactId: null,
        status: "actif",
        isPriority: editingContactItem.isPriority,
        campaignId: null,
        logoPath: editingContactItem.companyLogoPath,
        website: editingContactItem.companyWebsite,
      }
    : undefined

  const modalAccountsAdapter: AccountRow[] = accounts.map((a) => ({
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

  const modalContactsAdapter: ContactRow[] = contacts.map((c) => ({
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

  return (
    <>
      <IntelligenceSplitModalShell
        open={open}
        onClose={onClose}
        title="Répertoire contacts"
        subtitle={
          isMobile
            ? undefined
            : selectedCompanyId
              ? `Contacts du compte « ${accounts.find((a) => a.id === selectedCompanyId)?.name ?? ""} »`
              : "Tous les contacts du workspace"
        }
        leftPane={null}
        rightPane={null}
        isMobile={isMobile}
        headerActions={onReturnToCockpit ? <CockpitReturnButton onClick={onReturnToCockpit} hideLabelOnMobile={isMobile} /> : null}
        content={
          <div className="flex flex-1 items-stretch overflow-hidden relative">
            {isLoadingData ? (
              <div className="flex h-full w-full items-center justify-center p-6 text-center">
                <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-brand-brass" />
                <p className="mt-3 text-xs font-semibold text-white/60">Chargement des contacts…</p>
              </div>
            ) : isMobile ? (
              <ContactDirectoryMobile
                accounts={accounts}
                contacts={contacts}
                selectedCompanyId={selectedCompanyId}
                onSelectCompanyId={setSelectedCompanyId}
                selectedContactId={selectedContactId}
                onSelectContactId={handleSelectContactId}
                contactDetailData={contactDetailData}
                isLoadingDetail={isLoadingDetail}
                onEditContact={handleEditContact}
                onScheduleContact={handleScheduleContact}
              />
            ) : (
              <ContactDirectoryDesktop
                accounts={accounts}
                contacts={contacts}
                selectedCompanyId={selectedCompanyId}
                onSelectCompanyId={setSelectedCompanyId}
                selectedContactId={selectedContactId}
                onSelectContactId={handleSelectContactId}
                contactDetailData={contactDetailData}
                isLoadingDetail={isLoadingDetail}
                onEditContact={handleEditContact}
                onScheduleContact={handleScheduleContact}
              />
            )}
          </div>
        }
      />

      {/* CRM Contact Form Modal for Editing */}
      {editingContactId && editingContactItem ? (
        <ContactFormModal
          initial={initialContactRowForModal}
          accounts={modalAccountsAdapter}
          contacts={modalContactsAdapter}
          onClose={() => setEditingContactId(null)}
          onSuccess={() => {
            startTransition(async () => {
              await refreshDirectoryAndDetail(editingContactId)
              setEditingContactId(null)
            })
          }}
        />
      ) : null}

      {/* Agenda Event Drawer for Planning */}
      <AgendaEventDrawer
        open={agendaDrawerOpen}
        onOpenChange={setAgendaDrawerOpen}
        event={null}
        initialValues={agendaInitialValues}
        onSaved={() => {
          setAgendaDrawerOpen(false)
          if (selectedContactId) {
            refreshDirectoryAndDetail(selectedContactId)
          }
        }}
      />
    </>
  )
}

"use client"

import { useState, useEffect, useTransition, useRef } from "react"
import { Select } from "@/components/ui/Select"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import type { Contact, ContactRole } from "@/types/database-domain"
import {
  linkOpportunityContact,
  updateOpportunityContactRole,
  unlinkOpportunityContact,
} from "@/app/(app)/missions/_actions/opportunity-contacts"
import {
  searchContacts,
  getCompanyContacts,
  type SearchContactResult,
} from "@/app/(app)/missions/_actions/search-contacts"
import { cn } from "@/lib/utils"

interface OpportunityContactsPanelProps {
  opportunityId: string
  companyId: string | null
  contacts: Array<{
    contact: Contact
    role: string | null
  }>
  onRefresh: () => void
  className?: string
  embedded?: boolean
}

const ROLE_OPTIONS: Array<{ value: ContactRole; label: string }> = [
  { value: "decideur", label: "Décisionnaire" },
  { value: "acheteur", label: "Acheteur" },
  { value: "sponsor", label: "Sponsor" },
  { value: "manager_operationnel", label: "Manager opérationnel" },
  { value: "rh", label: "RH" },
  { value: "contact_technique", label: "Contact technique" },
  { value: "validateur_final", label: "Validateur final" },
]

export function OpportunityContactsPanel({
  opportunityId,
  companyId,
  contacts,
  onRefresh,
  className,
  embedded = false,
}: OpportunityContactsPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [isLinking, setIsLinking] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchContactResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedRole, setSelectedRole] = useState<ContactRole | "">("")

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Existing linked contact IDs (to filter them out from results)
  const linkedIds = new Set(contacts.map((c) => c.contact.id))

  const openLinking = () => {
    setIsLinking(true)
    setSearchQuery("")
    setSearchResults([])
    // Pre-load contacts from the company if available
    if (companyId) {
      setIsSearching(true)
      getCompanyContacts(companyId).then((results) => {
        setSearchResults(results.filter((r) => !linkedIds.has(r.id)))
        setIsSearching(false)
      })
    }
  }

  const handleSearchQueryChange = (val: string) => {
    setSearchQuery(val)

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if (val.trim().length < 1) {
      // Restore company contacts when query cleared
      if (companyId) {
        setIsSearching(true)
        getCompanyContacts(companyId).then((results) => {
          setSearchResults(results.filter((r) => !linkedIds.has(r.id)))
          setIsSearching(false)
        })
      } else {
        setSearchResults([])
        setIsSearching(false)
      }
      return
    }

    setIsSearching(true)
    debounceTimeoutRef.current = setTimeout(async () => {
      const results = await searchContacts(val)
      setSearchResults(results.filter((r) => !linkedIds.has(r.id)))
      setIsSearching(false)
    }, 300)
  }

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const handleLink = (contactId: string) => {
    setErrorMsg(null)
    startTransition(async () => {
      const role = selectedRole === "" ? null : selectedRole
      const result = await linkOpportunityContact({
        opportunity_id: opportunityId,
        contact_id: contactId,
        role,
      })

      if (result.error) {
        setErrorMsg(result.error)
      } else {
        setSearchQuery("")
        setSearchResults([])
        setIsLinking(false)
        onRefresh()
      }
    })
  }

  const handleRoleChange = (contactId: string, roleVal: string) => {
    setErrorMsg(null)
    const role = roleVal === "" ? null : (roleVal as ContactRole)

    startTransition(async () => {
      const result = await updateOpportunityContactRole({
        opportunity_id: opportunityId,
        contact_id: contactId,
        role,
      })

      if (result.error) {
        setErrorMsg(result.error)
      } else {
        onRefresh()
      }
    })
  }

  const handleUnlink = (contactId: string) => {
    if (!confirm("Voulez-vous détacher ce contact de cette opportunité ?")) return
    setErrorMsg(null)

    startTransition(async () => {
      const result = await unlinkOpportunityContact({
        opportunity_id: opportunityId,
        contact_id: contactId,
      })

      if (result.error) {
        setErrorMsg(result.error)
      } else {
        onRefresh()
      }
    })
  }

  const inputClass =
    "rounded-md border border-border bg-canvas px-2.5 py-1 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-50"

  const content = (
    <>
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <img src="/icons_set/contacts_client.png" alt="" className="w-5 h-5 object-contain shrink-0" />
          <h3 className="text-sm font-bold text-heading">Contacts liés</h3>
        </div>
        {!isLinking && (
          <button
            onClick={openLinking}
            className="text-[10px] font-bold text-primary hover:underline"
            disabled={isPending}
          >
            + Lier
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="text-[10px] text-danger bg-danger/10 border border-danger/20 rounded px-2.5 py-1.5">
          {errorMsg}
        </div>
      )}

      {/* Interface de liaison */}
      {isLinking && (
        <div className="p-3 bg-canvas/30 rounded border border-border/60 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider text-muted font-bold">
              {companyId ? "Contacts du compte (ou rechercher)" : "Lier un contact existant"}
            </span>
            <button
              onClick={() => {
                setIsLinking(false)
                setSearchQuery("")
                setSearchResults([])
              }}
              className="text-[10px] text-muted hover:text-heading"
            >
              Fermer
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Rechercher par nom, email..."
              value={searchQuery}
              onChange={(e) => handleSearchQueryChange(e.target.value)}
              className={cn(inputClass, "w-full")}
              disabled={isPending}
            />

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted shrink-0">Rôle :</span>
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as ContactRole | "")}
                className={cn(inputClass, "flex-1")}
                disabled={isPending}
              >
                <option value="">Sans rôle spécifique</option>
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Résultats */}
          <div className="flex flex-col gap-1 max-h-52 overflow-y-auto border-t border-border/40 pt-2">
            {isSearching ? (
              <span className="text-[10px] text-muted italic">Chargement...</span>
            ) : searchResults.length === 0 ? (
              <span className="text-[10px] text-muted italic">
                {searchQuery.trim().length > 0 ? "Aucun contact trouvé." : "Aucun contact disponible."}
              </span>
            ) : (
              searchResults.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => handleLink(contact.id)}
                  className="flex items-center justify-between p-2 rounded hover:bg-canvas/60 cursor-pointer border border-transparent hover:border-border/30 transition-all text-xs"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-heading">{contact.full_name}</span>
                    <span className="text-[10px] text-muted">
                      {contact.job_title || "—"}
                      {contact.account_name ? ` (${contact.account_name})` : ""}
                    </span>
                  </div>
                  <button
                    className="text-[10px] font-bold text-primary hover:underline"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLink(contact.id)
                    }}
                    disabled={isPending}
                  >
                    Lier
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Liste des contacts liés */}
      {contacts.length === 0 && !isLinking ? (
        <p className="text-xs text-muted italic py-2">Aucun contact lié à cette opportunité.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {contacts.map(({ contact, role }) => (
            <div
              key={contact.id}
              className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-heading">{contact.full_name}</span>
                  {contact.job_title && (
                    <span className="text-[10px] text-muted font-medium">{contact.job_title}</span>
                  )}
                  {contact.email && (
                    <span className="text-[10px] text-muted select-all mt-0.5">{contact.email}</span>
                  )}
                </div>
                <button
                  onClick={() => handleUnlink(contact.id)}
                  className="text-[10px] font-semibold text-danger hover:underline"
                  disabled={isPending}
                >
                  Détacher
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border/30 pt-2">
                <span className="text-[9px] uppercase tracking-wider text-muted font-bold">
                  Rôle dans l&apos;opp :
                </span>
                <Select
                  value={role || ""}
                  onChange={(e) => handleRoleChange(contact.id, e.target.value)}
                  className={cn(inputClass, "py-0.5 px-2 text-[10px]")}
                  disabled={isPending}
                >
                  <option value="">Aucun rôle</option>
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )

  if (embedded) {
    return <div className={cn("flex flex-col gap-4", className)}>{content}</div>
  }

  return (
    <SurfaceCard className={cn("p-5 flex flex-col gap-4", className)}>{content}</SurfaceCard>
  )
}

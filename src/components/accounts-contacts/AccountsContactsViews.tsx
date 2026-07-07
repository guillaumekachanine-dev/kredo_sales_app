"use client"

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { useCrmTabStore } from "@/lib/tabs/crm-tab-store"
import { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import {
  AccountRow,
  AccountsContactsData,
  ContactRow,
  StudyRow,
} from "@/lib/accounts-contacts/accounts-contacts-data"
import {
  parseFilters,
  filterAccounts,
  filterContacts,
} from "@/lib/accounts-contacts/accounts-contacts-filters"
import { useUrlFilters } from "@/lib/search/use-url-filters"
import { SearchToolbar } from "@/components/search/SearchToolbar"
import { PageViewSelector } from "@/components/ui/PageViewSelector"
import { FilterChip } from "@/components/search/FilterChip"
import { FilterDropdown, type FilterOption } from "@/components/search/FilterDropdown"
import {
  createCompany,
  updateCompany,
  deleteCompany,
  createContact,
  updateContact,
  deleteContact,
  type CompanyFormData,
  type ContactFormData,
} from "@/app/(app)/prospection/accounts/actions"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Select } from "@/components/ui/Select"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { ContextualCommunicationButton } from "@/components/communication/ContextualCommunicationButton"
import { cockpitActionIcons } from "@/components/intelligence/cockpit-action-icons"
import { useCrmDrawer } from "@/hooks/use-crm-drawer"
import { cn } from "@/lib/utils"
import { CONTACT_DEPARTMENTS } from "@/lib/accounts-contacts/contact-constants"
import {
  getMobilePriorityAccountsChangeEvent,
  readMobilePriorityAccountIds,
  sortIdsByPriority,
} from "@/lib/accounts-contacts/mobile-account-custom-list"

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────

const REVENUE_OPTIONS = [
  { value: "0-100M€", label: "0-100M€" },
  { value: "100-300M€", label: "100-300M€" },
  { value: "300-500M€", label: "300-500M€" },
  { value: "500-999M€", label: "500-999M€" },
  { value: "+1Mds", label: "+1Mds" },
]

const SIZE_OPTIONS = [
  { value: "1-50", label: "1-50" },
  { value: "50-200", label: "50-200" },
  { value: "201-500", label: "201-500" },
  { value: "501-1000", label: "501-1000" },
  { value: "1000-2000", label: "1000-2000" },
  { value: "2000-5000", label: "2000-5000" },
  { value: "+5k", label: "+5k" },
]

const LIFECYCLE_OPTIONS = [
  { value: "cible", label: "Cible" },
  { value: "prospect", label: "Prospect" },
  { value: "client_actif", label: "Client actif" },
  { value: "client_dormant", label: "Client dormant" },
  { value: "ancien_client", label: "Ancien client" },
  { value: "partenaire", label: "Partenaire" },
  { value: "non_prioritaire", label: "Non prioritaire" },
  { value: "exclu", label: "Exclu" },
]

const PRIORITY_OPTIONS = [
  { value: "haute", label: "Haute" },
  { value: "normale", label: "Normale" },
  { value: "basse", label: "Basse" },
]

const SCORE_OPTIONS: FilterOption[] = [
  { value: "4", label: "≥ 4" },
  { value: "3", label: "≥ 3" },
  { value: "2", label: "≥ 2" },
]

const SORT_OPTIONS: FilterOption[] = [
  { value: "score", label: "Score" },
  { value: "alphabetique", label: "Alphabétique" },
  { value: "activite", label: "Activité" },
]

const ROLE_OPTIONS = [
  { value: "decideur", label: "Décideur" },
  { value: "prescripteur", label: "Prescripteur" },
  { value: "acheteur", label: "Acheteur" },
  { value: "operationnel", label: "Opérationnel" },
  { value: "sponsor", label: "Sponsor" },
  { value: "utilisateur_final", label: "Utilisateur final" },
  { value: "rh", label: "RH" },
  { value: "manager_technique", label: "Manager technique" },
  { value: "dsi", label: "DSI" },
  { value: "direction_metier", label: "Direction métier" },
]

const RELATIONSHIP_LEVEL_OPTIONS = [
  { value: "inexistant", label: "Inexistant" },
  { value: "faible", label: "Faible" },
  { value: "moyen", label: "Moyen" },
  { value: "fort", label: "Fort" },
]

const CONTACT_FILTER_PANEL_WIDTH_CH = Math.max(
  12,
  ROLE_OPTIONS.reduce((longest, option) => Math.max(longest, option.label.length), 0) + 3
)

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

function displayRevenue(revenue: string | null | undefined) {
  if (!revenue || revenue === "Non renseigné" || revenue === "-") return "-"
  return revenue
}

function PriorityBadge({ priority }: { priority: string }) {
  const label = priority === "haute" ? "Haute" : priority === "basse" ? "Basse" : "Normale"
  return (
    <span className={cn(
      "font-semibold text-[11px]",
      priority === "haute" ? "text-warning" : "text-body"
    )}>
      {label}
    </span>
  )
}

function IconEdit() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared form primitives
// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full rounded border border-border bg-canvas px-3 py-2 text-sm text-heading placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
const selectCls = "w-full rounded border border-border bg-canvas px-3 py-2 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"

function ContactCompanyCombobox({
  accounts,
  value,
  onChange,
}: {
  accounts: AccountRow[]
  value: string
  onChange: (value: string) => void
}) {
  const selectedAccount = accounts.find((account) => account.id === value)
  const [query, setQuery] = useState(selectedAccount?.name ?? "")
  const [isOpen, setIsOpen] = useState(false)

  const filteredAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return accounts.slice(0, 6)

    return accounts
      .filter((account) => account.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 6)
  }, [accounts, query])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value
    const exactMatch = accounts.find((account) => account.name.toLowerCase() === nextQuery.trim().toLowerCase())

    setQuery(nextQuery)
    onChange(exactMatch?.id ?? "")
    setIsOpen(true)
  }

  const handleSelect = (account: AccountRow) => {
    setQuery(account.name)
    onChange(account.id)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <input
        className={inputCls}
        value={query}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        placeholder="Rechercher une entreprise…"
        autoComplete="off"
      />
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded border border-border bg-surface">
          {filteredAccounts.length > 0 ? (
            filteredAccounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(account)}
                className="w-full px-3 py-2 text-left text-xs font-medium text-heading transition-colors hover:bg-canvas"
              >
                {account.name}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-muted">Aucune entreprise trouvée</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Company Form Modal
// ─────────────────────────────────────────────────────────────────────────────

function CompanyFormModal({
  initial,
  createKind,
  onCreateKindChange,
  onClose,
  onSuccess,
}: {
  initial?: AccountRow
  createKind?: CreateEntityKind
  onCreateKindChange?: (kind: CreateEntityKind) => void
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState<CompanyFormData>({
    name: initial?.name ?? "",
    sector: initial?.sector === "Non renseigné" ? "" : (initial?.sector ?? ""),
    hq_location: initial?.location === "Non renseigné" ? "" : (initial?.location ?? ""),
    priority: initial?.priority ?? "normale",
    lifecycle_status: initial?.status ?? "cible",
    website: initial?.website ?? "",
    description: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const set = (key: keyof CompanyFormData, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError("Le nom est requis."); return }
    setError(null)
    startTransition(async () => {
      const result = initial
        ? await updateCompany(initial.id, form)
        : await createCompany(form)
      if (result.error) { setError(result.error); return }
      onSuccess()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <SurfaceCard className="relative w-full max-w-lg flex flex-col overflow-hidden border border-border animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 bg-canvas/30">
          {initial || !createKind || !onCreateKindChange ? (
            <h2 className="text-base font-bold text-heading font-heading">
              {initial ? "Modifier le compte" : "Nouveau compte"}
            </h2>
          ) : (
            <NewEntityTitle kind={createKind} onKindChange={onCreateKindChange} />
          )}
          <button onClick={onClose} className="rounded p-1 hover:bg-canvas/80 text-muted hover:text-heading transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5 overflow-y-auto max-h-[70vh]">
          <Field label="Nom *">
            <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="BNP Paribas" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Secteur">
              <input className={inputCls} value={form.sector} onChange={(e) => set("sector", e.target.value)} placeholder="Finance" />
            </Field>
            <Field label="Localisation">
              <input className={inputCls} value={form.hq_location} onChange={(e) => set("hq_location", e.target.value)} placeholder="Paris" />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Priorité">
              <Select className={selectCls} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <Field label="Statut">
              <Select className={selectCls} value={form.lifecycle_status} onChange={(e) => set("lifecycle_status", e.target.value)}>
                {LIFECYCLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Site web">
            <input className={inputCls} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://bnpparibas.com" />
          </Field>
          <Field label="Description">
            <textarea className={cn(inputCls, "resize-none")} rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Notes sur ce compte…" />
          </Field>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-6 py-3 bg-canvas/30">
          <button onClick={onClose} className="rounded border border-border px-4 py-2 text-xs font-semibold text-body hover:bg-canvas/60 transition-colors">Annuler</button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={pending} className="rounded bg-primary px-4 py-2 text-xs font-semibold text-primary-fg hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {pending ? "Enregistrement…" : initial ? "Mettre à jour" : "Créer le compte"}
          </button>
        </div>
      </SurfaceCard>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Contact Form Modal
// ─────────────────────────────────────────────────────────────────────────────

function ContactFormModal({
  initial,
  accounts,
  contacts,
  createKind,
  onCreateKindChange,
  onClose,
  onSuccess,
}: {
  initial?: ContactRow
  accounts: AccountRow[]
  contacts: ContactRow[]
  createKind?: CreateEntityKind
  onCreateKindChange?: (kind: CreateEntityKind) => void
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState<ContactFormData>({
    first_name: initial?.firstName ?? "",
    last_name: initial?.lastName ?? "",
    primary_email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    phone_2: "",
    linkedin_url: initial?.linkedinUrl ?? "",
    company_id: initial?.companyId ?? "",
    job_title: initial?.jobTitle === "Fonction non renseignée" ? "" : (initial?.jobTitle ?? ""),
    relationship_role: initial?.relationshipRole ?? "",
    relationship_level: initial?.relationshipLevel ?? "",
    department: initial?.department ?? "",
    manager_contact_id: initial?.managerContactId ?? "",
    is_priority: initial?.isPriority ?? false,
    campaign_id: initial?.campaignId ?? "",
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [deletePending, startDeleteTransition] = useTransition()

  const set = <K extends keyof ContactFormData>(key: K, value: ContactFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const selectedCompany = useMemo(() => {
    if (!form.company_id) return null
    return accounts.find((a) => a.id === form.company_id)
  }, [accounts, form.company_id])

  const isProspect = selectedCompany?.status === "prospect"

  const companyContacts = useMemo(() => {
    if (!form.company_id) return []
    return contacts.filter((c) => c.companyId === form.company_id && c.id !== initial?.id)
  }, [contacts, form.company_id, initial?.id])

  const isMobileCreateContact = createKind === "contact" && !initial

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name.trim() && !form.last_name.trim()) {
      setError("Au moins le prénom ou le nom est requis.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result =
        initial && initial.personId
          ? await updateContact(initial.id, initial.personId, form)
          : await createContact(form)
      if (result.error) { setError(result.error); return }
      onSuccess()
      onClose()
    })
  }

  const handleDelete = () => {
    if (!initial) return
    startDeleteTransition(async () => {
      const result = await deleteContact(initial.id)
      if (result.error) {
        setError(result.error)
      } else {
        onSuccess()
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <SurfaceCard className="relative w-full max-w-lg flex flex-col overflow-hidden border border-border animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 bg-canvas/30">
          {initial || !createKind || !onCreateKindChange ? (
            <h2 className="text-base font-bold text-heading font-heading">
              {initial ? "Modifier le contact" : "Nouveau contact"}
            </h2>
          ) : (
            <NewEntityTitle kind={createKind} onKindChange={onCreateKindChange} />
          )}
          <button onClick={onClose} className="rounded p-1 hover:bg-canvas/80 text-muted hover:text-heading transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className={cn(
            "flex flex-col px-6 overflow-y-auto max-h-[70vh]",
            isMobileCreateContact ? "gap-3 py-4" : "gap-4 py-5"
          )}
        >
          {isMobileCreateContact ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Prénom">
                  <input className={inputCls} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="Marie" />
                </Field>
                <Field label="Nom *">
                  <input className={inputCls} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Dupont" />
                </Field>
              </div>

              <Field label="Entreprise">
                <ContactCompanyCombobox
                  accounts={accounts}
                  value={form.company_id ?? ""}
                  onChange={(value) => set("company_id", value)}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Poste">
                  <input className={inputCls} value={form.job_title} onChange={(e) => set("job_title", e.target.value)} placeholder="Directeur IT" />
                </Field>
                <Field label="Rôle relationnel">
                  <Select className={selectCls} value={form.relationship_role} onChange={(e) => set("relationship_role", e.target.value)}>
                    <option value="">— Aucun —</option>
                    {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="N+1 (Manager)">
                  <Select className={selectCls} value={form.manager_contact_id} onChange={(e) => set("manager_contact_id", e.target.value)}>
                    <option value="">— Aucun —</option>
                    {companyContacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.fullName} ({c.jobTitle || "Sans fonction"})</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Intimité">
                  <Select className={selectCls} value={form.relationship_level} onChange={(e) => set("relationship_level", e.target.value)}>
                    <option value="">— Aucun —</option>
                    {RELATIONSHIP_LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </Field>
              </div>

              <Field label="Email">
                <input className={inputCls} type="email" value={form.primary_email} onChange={(e) => set("primary_email", e.target.value)} placeholder="marie.dupont@entreprise.com" />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Téléphone">
                  <input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+33 6 …" />
                </Field>
                <Field label="LinkedIn">
                  <input className={inputCls} value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="linkedin.com/in/…" />
                </Field>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Prénom">
                  <input className={inputCls} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="Marie" />
                </Field>
                <Field label="Nom *">
                  <input className={inputCls} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Dupont" />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Entreprise">
                  <Select className={selectCls} value={form.company_id} onChange={(e) => set("company_id", e.target.value)}>
                    <option value="">— Aucune entreprise —</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Select>
                </Field>
                <Field label="Département">
                  <Select className={selectCls} value={form.department} onChange={(e) => set("department", e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {CONTACT_DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Fonction">
                  <input className={inputCls} value={form.job_title} onChange={(e) => set("job_title", e.target.value)} placeholder="Directeur IT" />
                </Field>
                <Field label="Rôle relationnel">
                  <Select className={selectCls} value={form.relationship_role} onChange={(e) => set("relationship_role", e.target.value)}>
                    <option value="">— Aucun —</option>
                    {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email">
                  <input className={inputCls} type="email" value={form.primary_email} onChange={(e) => set("primary_email", e.target.value)} placeholder="marie.dupont@entreprise.com" />
                </Field>
                <Field label="LinkedIn">
                  <input className={inputCls} value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="linkedin.com/in/…" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Téléphone">
                  <input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+33 6 …" />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="N+1 (Manager)">
                  <Select className={selectCls} value={form.manager_contact_id} onChange={(e) => set("manager_contact_id", e.target.value)}>
                    <option value="">— Aucun —</option>
                    {companyContacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.fullName} ({c.jobTitle || "Sans fonction"})</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Intimité">
                  <Select className={selectCls} value={form.relationship_level} onChange={(e) => set("relationship_level", e.target.value)}>
                    <option value="">— Aucun —</option>
                    {RELATIONSHIP_LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </Field>
              </div>
            </>
          )}
          {isProspect && (
            <div className="mt-2 grid grid-cols-1 gap-3 shrink-0 sm:grid-cols-2">
              <Field label="Prioritaire">
                <Select
                  className={selectCls}
                  value={form.is_priority ? "oui" : "non"}
                  onChange={(e) => set("is_priority", e.target.value === "oui")}
                >
                  <option value="non">Non</option>
                  <option value="oui">Oui</option>
                </Select>
              </Field>
              <Field label="Campagne">
                <Select
                  className={selectCls}
                  value={form.campaign_id ?? ""}
                  onChange={(e) => set("campaign_id", e.target.value)}
                >
                  <option value="">— Aucune campagne —</option>
                </Select>
              </Field>
            </div>
          )}
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </form>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-6 py-3 bg-canvas/30">
          {initial ? (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              disabled={pending || deletePending}
              className="rounded border border-danger text-danger px-4 py-2 text-xs font-semibold hover:bg-danger/5 transition-colors disabled:opacity-50"
            >
              {deletePending ? "Suppression…" : "Supprimer"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-border px-4 py-2 text-xs font-semibold text-body hover:bg-canvas/60 transition-colors"
            >
              Annuler
            </button>
          )}
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={pending || deletePending} className="rounded bg-primary px-4 py-2 text-xs font-semibold text-primary-fg hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {pending ? "Enregistrement…" : initial ? "Mettre à jour" : "Créer le contact"}
          </button>
        </div>
      </SurfaceCard>

      {showConfirmDelete && (
        <ConfirmDialog
          open={showConfirmDelete}
          onOpenChange={setShowConfirmDelete}
          title="Supprimer le contact"
          description={`Êtes-vous sûr de vouloir supprimer définitivement le contact ${form.first_name} ${form.last_name} ?`}
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          variant="danger"
          onConfirm={handleDelete}
          isLoading={deletePending}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Delete Confirm Modal
// ─────────────────────────────────────────────────────────────────────────────

function DeleteConfirmModal({
  label,
  onConfirm,
  onCancel,
  pending,
}: {
  label: string
  onConfirm: () => void
  onCancel: () => void
  pending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <SurfaceCard className="w-full max-w-sm p-6 border border-border animate-in zoom-in-95 duration-200 flex flex-col gap-4">
        <h2 className="text-base font-bold text-heading font-heading">Confirmer la suppression</h2>
        <p className="text-sm text-body">
          Supprimer <span className="font-semibold text-heading">{label}</span> ? Cette action est irréversible.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="rounded border border-border px-4 py-2 text-xs font-semibold text-body hover:bg-canvas/60 transition-colors">Annuler</button>
          <button onClick={onConfirm} disabled={pending} className="rounded bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors">
            {pending ? "Suppression…" : "Supprimer"}
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
  studies,
  onOpenIdentity,
  onOpenIntelligence,
}: {
  accounts: AccountRow[]
  studies: StudyRow[]
  onOpenIdentity: (id: string) => void
  onOpenIntelligence: (account: AccountRow) => void
}) {
  return (
    <SurfaceCard className="overflow-hidden">

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs table-fixed">
          <thead>
            <tr className="border-b border-border bg-canvas/50 text-[10px] font-bold uppercase tracking-wider text-muted">
              <th className="px-5 py-3 w-[18%]">Compte</th>
              <th className="px-3 py-3 w-[9%]">Secteur</th>
              <th className="px-3 py-3 w-[9%]">Statut</th>
              <th className="px-3 py-3 text-center w-[8%]">CA</th>
              <th className="px-3 py-3 text-center w-[7%]">Taille</th>
              <th className="px-3 py-3 text-center w-[7%]">Contacts</th>
              <th className="px-3 py-3 text-center w-[9%]">Priorité</th>
              <th className="px-3 py-3 text-center w-[13%]">Business Intelligence</th>
              <th className="px-3 py-3 text-center w-[10%]">Rédaction</th>
              <th className="px-5 py-3 text-center w-[10%]">Pitch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {accounts.map((account) => {
              const hasStudy = studies.some((s) => s.id === account.id)
              return (
                <tr key={account.id} id={`account-row-${account.id}`} className="kredo-hover-reference">
                  <td className="px-5 py-3 truncate">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="cursor-pointer hover:opacity-80 transition-opacity shrink-0" onClick={() => onOpenIdentity(account.id)}>
                        <CompanyLogo name={account.name} logoPath={account.logoPath} website={account.website} size="sm" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div 
                          onClick={() => onOpenIdentity(account.id)} 
                          className="font-semibold text-heading truncate cursor-pointer hover:text-primary transition-colors"
                          title="Voir la fiche d'identité"
                        >
                          {account.name}
                        </div>
                        <div className="truncate text-[11px] text-muted" title={account.segment}>{account.segment}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-body truncate" title={account.sector}>{account.sector}</td>
                  <td className="px-3 py-3 text-body truncate capitalize" title={account.status.replace("_", " ")}>{account.status.replace("_", " ")}</td>
                  <td className="px-3 py-3 text-center font-semibold text-heading">{displayRevenue(account.revenue)}</td>
                  <td className="px-3 py-3 text-center font-semibold text-heading">{account.employeeCount !== null ? account.employeeCount.toLocaleString('fr-FR') : "-"}</td>
                  <td className="px-3 py-3 text-center font-semibold text-heading">{account.contactCount}</td>
                  <td className="px-3 py-3 text-center"><PriorityBadge priority={account.priority} /></td>
                  <td className="px-3 py-3 text-center">
                    {hasStudy ? (
                      <button
                        onClick={() => onOpenIntelligence(account)}
                        style={{ height: "26px" }}
                        className="relative inline-flex items-center gap-1.5 rounded bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-fg transition-colors hover:bg-primary/95 whitespace-nowrap cursor-pointer"
                      >
                        <span>Cockpit client</span>
                        <span
                          className="kredo-ready-action-circle"
                          style={{ width: "14px", height: "14px", minWidth: "14px", minHeight: "14px" }}
                        >
                          <svg className="w-2 h-2 relative z-10 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                          </svg>
                        </span>
                      </button>
                    ) : (
                      <span className="text-muted text-[11px] italic">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <ContextualCommunicationButton
                      entryPoint={account.status === "ancien_client" ? "former_client" : "account_row"}
                      companyId={account.id}
                      companyName={account.name}
                      primaryEntity={{ type: "company", id: account.id }}
                      label={account.status === "ancien_client" ? "Réactiver la relation" : "Rédiger message"}
                      variant="primary"
                      style={{ height: "26px" }}
                      className="h-auto sm:h-auto min-w-0 border-0 py-1 px-2 text-[11px]"
                      aria-label={`${account.status === "ancien_client" ? "Réactiver la relation" : "Rédiger un message"} pour ${account.name}`}
                      rightIcon={
                        <Image
                          src={cockpitActionIcons.message}
                          alt=""
                          width={14}
                          height={14}
                          className="object-contain"
                        />
                      }
                      refs={{
                        angle: [
                          account.sector ? `Secteur: ${account.sector}` : null,
                          account.segment ? `Segment: ${account.segment}` : null,
                        ].filter(Boolean).join(" · ") || undefined,
                      }}
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <ContextualCommunicationButton
                      entryPoint="account_pitch"
                      companyId={account.id}
                      companyName={account.name}
                      primaryEntity={{ type: "company", id: account.id }}
                      label="Générer pitch"
                      variant="primary"
                      style={{ height: "26px" }}
                      className="h-auto sm:h-auto min-w-0 border-0 py-1 px-2 text-[11px]"
                      aria-label={`Générer un pitch pour ${account.name}`}
                      rightIcon={
                        <Image
                          src={cockpitActionIcons.pitch}
                          alt=""
                          width={14}
                          height={14}
                          className="object-contain"
                        />
                      }
                    />
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
  onOpenIdentity,
}: {
  accounts: AccountRow[]
  onOpenIdentity: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {accounts.map((account) => (
        <div
          key={account.id}
          id={`account-row-${account.id}`}
          className="overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
        >
          <button
            type="button"
            onClick={() => onOpenIdentity(account.id)}
            className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors active:opacity-75"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-canvas/80 p-2">
              <CompanyLogo
                name={account.name}
                logoPath={account.logoPath}
                website={account.website}
                size="sm"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold leading-tight text-heading">
                  {account.name}
                </span>
                {account.score !== null ? (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {account.score}/5
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                {account.sector ? (
                  <span className="max-w-[11rem] truncate">{account.sector}</span>
                ) : null}
                {account.status ? (
                  <span className="capitalize">{account.status.replaceAll("_", " ")}</span>
                ) : null}
                <span>{account.contactCount} contact{account.contactCount > 1 ? "s" : ""}</span>
                {account.taskCount > 0 ? (
                  <span>{account.taskCount} tâche{account.taskCount > 1 ? "s" : ""}</span>
                ) : null}
                {account.segment ? (
                  <span className="max-w-[10rem] truncate">{account.segment}</span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 pl-1">
              {account.priority === "haute" ? (
                <span className="rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-warning">
                  Priorité
                </span>
              ) : null}
              <svg className="size-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      ))}
    </div>
  )
}

function useMobilePriorityAccounts(device: DashboardDevice) {
  const [priorityIds, setPriorityIds] = useState<string[]>([])

  useEffect(() => {
    if (device !== "mobile") return

    const syncPriorityIds = () => {
      setPriorityIds(readMobilePriorityAccountIds())
    }

    syncPriorityIds()

    const customEventName = getMobilePriorityAccountsChangeEvent()
    window.addEventListener("storage", syncPriorityIds)
    window.addEventListener(customEventName, syncPriorityIds)

    return () => {
      window.removeEventListener("storage", syncPriorityIds)
      window.removeEventListener(customEventName, syncPriorityIds)
    }
  }, [device])

  return priorityIds
}

// ─────────────────────────────────────────────────────────────────────────────
//  Contacts Sub-views
// ─────────────────────────────────────────────────────────────────────────────

function ContactsDesktop({
  contacts,
  onOpenIdentity,
  onOpenCompanyIdentity,
  onEdit,
}: {
  contacts: ContactRow[]
  onOpenIdentity: (contactId: string) => void
  onOpenCompanyIdentity: (companyId: string) => void
  onEdit: (contact: ContactRow) => void
}) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-canvas/50 text-[10px] font-bold uppercase tracking-wider text-muted">
              <th className="px-5 py-3">Contact</th>
              <th className="px-3 py-3">Fonction</th>
              <th className="px-3 py-3 w-[12%] max-w-[140px]">Compte</th>
              <th className="px-3 py-3">Rôle</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-3 py-3 min-w-[130px]">Téléphone</th>
              <th className="px-3 py-3 text-right w-[60px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {contacts.map((contact) => (
              <tr key={contact.id} className="kredo-hover-reference">
                <td className="px-5 py-3 font-semibold text-heading">
                  <div className="flex items-center gap-2">
                    <CompanyLogo
                      name={contact.companyName}
                      logoPath={contact.logoPath}
                      website={contact.website}
                      size="sm"
                    />
                    <span
                      onClick={() => onOpenIdentity(contact.id)}
                      className="cursor-pointer hover:text-primary transition-colors"
                      title="Voir la fiche contact"
                    >
                      {contact.fullName}
                    </span>
                  </div>
                </td>
                <td className="max-w-[200px] truncate px-3 py-3 text-body">{contact.jobTitle || "—"}</td>
                <td className="max-w-[140px] truncate px-3 py-3 text-body">
                  {contact.companyId ? (
                    <span
                      onClick={() => onOpenCompanyIdentity(contact.companyId!)}
                      className="cursor-pointer hover:text-primary transition-colors font-semibold"
                      title="Voir la fiche entreprise"
                    >
                      {contact.companyName}
                    </span>
                  ) : (
                    contact.companyName
                  )}
                </td>
                <td className="px-3 py-3 text-body capitalize">{contact.relationshipRole?.replace("_", " ") ?? "—"}</td>
                <td className="px-5 py-3 text-body">{contact.email ?? "—"}</td>
                <td className="px-3 py-3 text-body whitespace-nowrap">{contact.phone ?? "—"}</td>
                <td className="px-3 py-3 w-[60px]">
                  <div className="flex items-center justify-end">
                    <button onClick={() => onEdit(contact)} className="rounded p-1.5 text-muted hover:bg-canvas/80 hover:text-heading transition-colors" title="Modifier">
                      <IconEdit />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  )
}

function ContactsMobile({
  contacts,
  onOpenIdentity,
  onOpenCompanyIdentity,
  onEdit,
}: {
  contacts: ContactRow[]
  onOpenIdentity: (contactId: string) => void
  onOpenCompanyIdentity: (companyId: string) => void
  onEdit: (contact: ContactRow) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {contacts.map((contact) => (
        <SurfaceCard key={contact.id} className="p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2
                onClick={() => onOpenIdentity(contact.id)}
                className="text-sm font-bold text-heading cursor-pointer hover:text-primary transition-colors"
                title="Voir la fiche contact"
              >
                {contact.fullName}
              </h2>
              <p className="mt-1 text-xs text-body">{contact.jobTitle || "Fonction non renseignée"}</p>
              {contact.companyId ? (
                <span
                  onClick={() => onOpenCompanyIdentity(contact.companyId!)}
                  className="mt-1 text-xs font-semibold text-primary cursor-pointer hover:underline block"
                  title="Voir la fiche entreprise"
                >
                  {contact.companyName}
                </span>
              ) : (
                <p className="mt-1 text-xs font-semibold text-primary">{contact.companyName}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onEdit(contact)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border text-muted transition-colors hover:bg-canvas/60 hover:text-heading"
              aria-label={`Modifier ${contact.fullName}`}
              title="Modifier"
            >
              <IconEdit />
            </button>
          </div>
          <div className="mt-2.5 flex items-end justify-between gap-2">
            <div className="flex min-w-0 flex-wrap gap-2 text-[11px] text-muted">
              <span className="rounded border border-border bg-canvas px-2 py-1">{contact.companySector}</span>
              {contact.email && <span className="rounded border border-border bg-canvas px-2 py-1">Email OK</span>}
              {contact.phone && <span className="rounded border border-border bg-canvas px-2 py-1">Tel OK</span>}
              {contact.relationshipRole && (
                <span className="rounded border border-border bg-canvas px-2 py-1 capitalize">{contact.relationshipRole.replace("_", " ")}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenIdentity(contact.id)}
              className="shrink-0 rounded bg-primary px-2.5 py-1 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary/90"
            >
              Fiche
            </button>
          </div>
        </SurfaceCard>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Exported Client Component
// ─────────────────────────────────────────────────────────────────────────────

type DeleteTarget =
  | { kind: "company"; item: AccountRow }
  | { kind: "contact"; item: ContactRow }

type CreateEntityKind = "company" | "contact"

function NewEntityTitle({
  kind,
  onKindChange,
}: {
  kind: CreateEntityKind
  onKindChange: (kind: CreateEntityKind) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-base font-bold text-heading font-heading">Nouveau</span>
      <div className="ml-2 flex items-center gap-2">
        {([
          { value: "company", label: "Compte" },
          { value: "contact", label: "Contact" },
        ] as const).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onKindChange(option.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
              kind === option.value ? "bg-primary text-primary-fg" : "text-muted hover:text-heading hover:bg-canvas/50"
            )}
            aria-pressed={kind === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ProspectionAccountsView({
  data,
  device,
}: {
  data: AccountsContactsData
  device: DashboardDevice
}) {
  const router = useRouter()
  const { searchParams, setParam, toggleListValue, clearAll } = useUrlFilters()
  const { openTab: openCrmTab } = useCrmTabStore()
  const { openCompany: openCompanyDrawer, openContact: openContactDrawer } = useCrmDrawer()

  const processedDrawerRef = useRef<string | null>(null)
  const mobilePriorityAccountIds = useMobilePriorityAccounts(device)

  useEffect(() => {
    const drawerId = searchParams.get("drawer")
    if (drawerId && processedDrawerRef.current !== drawerId) {
      processedDrawerRef.current = drawerId
      openCompanyDrawer(drawerId)
      setParam("drawer", null)
      
      setTimeout(() => {
        const row = document.getElementById(`account-row-${drawerId}`)
        if (row) {
          row.scrollIntoView({ behavior: "smooth", block: "center" })
          row.classList.add("bg-primary/5")
          setTimeout(() => {
            row.classList.remove("bg-primary/5")
          }, 2000)
        }
      }, 100)
    }
  }, [searchParams, setParam, openCompanyDrawer])

  // URL is the source of truth for tab + filters.
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams]
  )
  const subTab = filters.tab
  const deferredQuery = useDeferredValue(filters.q)

  const studyIds = useMemo(() => new Set(data.studies.map((study) => study.id)), [data.studies])

  const sectorOptions = useMemo<FilterOption[]>(
    () =>
      [...new Set(data.accounts.map((account) => account.sector))]
        .filter((sector) => sector.length > 0)
        .sort((a, b) => a.localeCompare(b))
        .map((sector) => ({ value: sector, label: sector })),
    [data.accounts]
  )

  const accountFilterPanelWidthCh = useMemo(() => {
    const accountFilterOptions = [
      ...sectorOptions,
      ...LIFECYCLE_OPTIONS,
      ...REVENUE_OPTIONS,
      ...SIZE_OPTIONS,
      ...SCORE_OPTIONS,
    ]
    const longestLabelLength = accountFilterOptions.reduce(
      (longest, option) => Math.max(longest, option.label.length),
      0
    )

    return Math.max(12, longestLabelLength + 3)
  }, [sectorOptions])

  const filteredAccounts = useMemo(
    () => filterAccounts(data.accounts, { ...filters, q: deferredQuery }, studyIds),
    [data.accounts, filters, deferredQuery, studyIds]
  )
  const filteredContacts = useMemo(
    () => filterContacts(data.contacts, { ...filters, q: deferredQuery }),
    [data.contacts, filters, deferredQuery]
  )

  // Mobile-only client-side sort applied after filtering.
  const sortedAccounts = useMemo(() => {
    if (device !== "mobile") return filteredAccounts
    return [...filteredAccounts].sort((a, b) => {
      if (filters.sortAccounts === "alphabetique") return a.name.localeCompare(b.name)
      if (filters.sortAccounts === "activite") {
        const actA = a.taskCount + a.contactCount
        const actB = b.taskCount + b.contactCount
        return actB - actA || a.name.localeCompare(b.name)
      }
      // "score" — highest first, nulls last
      return (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name)
    })
  }, [filteredAccounts, filters.sortAccounts, device])

  // Device-aware display limits applied AFTER filtering — never before.
  const limitedAccounts = useMemo(
    () => sortedAccounts.slice(0, device === "mobile" ? 300 : 160),
    [sortedAccounts, device]
  )
  const displayAccounts = useMemo(
    () => (
      device === "mobile"
        ? sortIdsByPriority(limitedAccounts, mobilePriorityAccountIds)
        : limitedAccounts
    ),
    [device, limitedAccounts, mobilePriorityAccountIds]
  )
  const displayContacts = useMemo(
    () => filteredContacts.slice(0, device === "mobile" ? 60 : 200),
    [filteredContacts, device]
  )

  const totalFiltered = subTab === "accounts" ? filteredAccounts.length : filteredContacts.length
  const totalAll = subTab === "accounts" ? data.accounts.length : data.contacts.length
  const isMobileAccounts = device === "mobile" && subTab === "accounts"
  const isMobileContacts = device === "mobile" && subTab === "contacts"
  const isMobileSearch = isMobileAccounts || isMobileContacts

  // Company modal
  const [companyModal, setCompanyModal] = useState<{ open: boolean; editing?: AccountRow }>({ open: false })
  const [editCompanyReturnToIdentityId, setEditCompanyReturnToIdentityId] = useState<string | null>(null)
  // Contact modal
  const [contactModal, setContactModal] = useState<{ open: boolean; editing?: ContactRow }>({ open: false })
  const [editContactReturnToIdentityId, setEditContactReturnToIdentityId] = useState<string | null>(null)

  useEffect(() => {
    const editCompanyId = searchParams.get("editCompanyId")
    if (!editCompanyId) return

    const timeoutId = window.setTimeout(() => {
      const foundCompany = data.accounts.find((account) => account.id === editCompanyId)
      if (foundCompany) {
        setEditCompanyReturnToIdentityId(editCompanyId)
        setCompanyModal({ open: true, editing: foundCompany })
      }
      setParam("editCompanyId", null)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchParams, data.accounts, setParam])

  useEffect(() => {
    const editContactId = searchParams.get("editContactId")
    if (!editContactId) return

    const timeoutId = window.setTimeout(() => {
      const foundContact = data.contacts.find((c) => c.id === editContactId)
      if (foundContact) {
        setEditContactReturnToIdentityId(editContactId)
        setContactModal({ open: true, editing: foundContact })
      }
      setParam("editContactId", null)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchParams, data.contacts, setParam])

  useEffect(() => {
    const handleEditCompany = (e: Event) => {
      const customEvent = e as CustomEvent<{ companyId: string }>
      const targetCompanyId = customEvent.detail.companyId
      const foundCompany = data.accounts.find((account) => account.id === targetCompanyId)
      if (foundCompany) {
        setEditCompanyReturnToIdentityId(targetCompanyId)
        setCompanyModal({ open: true, editing: foundCompany })
        useCrmDrawer.getState().close()
      }
    }

    window.addEventListener("crm-edit-company", handleEditCompany)
    return () => {
      window.removeEventListener("crm-edit-company", handleEditCompany)
    }
  }, [data.accounts])

  useEffect(() => {
    const handleEditContact = (e: Event) => {
      const customEvent = e as CustomEvent<{ contactId: string }>
      const contactId = customEvent.detail.contactId
      const foundContact = data.contacts.find((c) => c.id === contactId)
      if (foundContact) {
        setEditContactReturnToIdentityId(contactId)
        setContactModal({ open: true, editing: foundContact })
        useCrmDrawer.getState().close()
      }
    }
    window.addEventListener("crm-edit-contact", handleEditContact)
    return () => {
      window.removeEventListener("crm-edit-contact", handleEditContact)
    }
  }, [data.contacts])

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()



  const refreshData = () => router.refresh()

  const openCreateModal = (kind: CreateEntityKind = subTab === "contacts" ? "contact" : "company") => {
    setCompanyModal({ open: kind === "company" })
    setContactModal({ open: kind === "contact" })
  }

  const handleCreateKindChange = (kind: CreateEntityKind) => {
    openCreateModal(kind)
  }

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return
    startDeleteTransition(async () => {
      if (deleteTarget.kind === "company") {
        await deleteCompany(deleteTarget.item.id)
      } else {
        await deleteContact(deleteTarget.item.id)
      }
      setDeleteTarget(null)
      refreshData()
    })
  }

  return (
    <div className={cn("mx-auto flex w-full max-w-7xl flex-col bg-canvas", device === "mobile" ? "gap-3 px-4 py-4" : "gap-5 px-6 py-6")}>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className={cn("font-heading font-bold tracking-tight text-heading", device === "mobile" ? "text-2xl" : "text-3xl")}>
            Comptes & Contacts
          </h1>
        </div>
        <div className={cn("flex items-center gap-2 shrink-0", device === "mobile" && "mt-5")}>
          {device === "mobile" ? (
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="flex h-9 w-9 items-center justify-center rounded bg-primary text-lg font-semibold leading-none text-primary-fg hover:bg-primary/90 transition-colors"
              aria-label="Créer un compte ou un contact"
            >
              +
            </button>
          ) : (
            <>
              <button
                onClick={() => setContactModal({ open: true })}
                className="rounded border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                + Contact
              </button>
              <button
                onClick={() => setCompanyModal({ open: true })}
                className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg hover:bg-primary/90 transition-colors"
              >
                + Compte
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub-tab selection */}
      <div>
        <PageViewSelector
          items={[
            { value: "accounts", label: `Comptes (${filteredAccounts.length})` },
            { value: "contacts", label: `Contacts (${filteredContacts.length})` },
          ]}
          value={subTab}
          onChange={(value) => setParam("tab", value)}
          ariaLabel="Sélection de la vue Comptes ou Contacts"
        />
      </div>

      {/* Search & quick filters */}
      <SearchToolbar
        device={device}
        query={filters.q}
        totalFiltered={totalFiltered}
        totalAll={totalAll}
        mobileCompact={isMobileSearch}
        resultLabel={isMobileAccounts ? "comptes" : isMobileContacts ? "contacts" : undefined}
        placeholder={subTab === "accounts" ? "Rechercher un compte, secteur…" : "Rechercher un contact, email…"}
        onQueryChange={(value) => setParam("q", value)}
        onReset={() => clearAll(["tab"])}
      >
        {subTab === "accounts" ? (
          <>
            <FilterDropdown
              label="Secteur"
              options={sectorOptions}
              selected={filters.includeSector}
              onToggle={(value) => toggleListValue("incSector", value)}
              onClear={() => setParam("incSector", null)}
              compact={isMobileAccounts}
              panelWidthCh={isMobileAccounts ? accountFilterPanelWidthCh : undefined}
              fullWidthPanel
            />
            <FilterDropdown
              label="Statut"
              options={LIFECYCLE_OPTIONS}
              selected={filters.includeStatus}
              onToggle={(value) => toggleListValue("incStatus", value)}
              onClear={() => setParam("incStatus", null)}
              compact={isMobileAccounts}
              panelWidthCh={isMobileAccounts ? accountFilterPanelWidthCh : undefined}
              fullWidthPanel
            />
            <FilterDropdown
              label={device === "mobile" ? "CA" : "Chiffre affaire"}
              options={REVENUE_OPTIONS}
              selected={filters.includeRevenue}
              onToggle={(value) => toggleListValue("incRevenue", value)}
              onClear={() => setParam("incRevenue", null)}
              compact={isMobileAccounts}
              panelWidthCh={isMobileAccounts ? accountFilterPanelWidthCh : undefined}
              fullWidthPanel
            />
            <FilterDropdown
              label="Taille"
              options={SIZE_OPTIONS}
              selected={filters.includeSize}
              onToggle={(value) => toggleListValue("incSize", value)}
              onClear={() => setParam("incSize", null)}
              compact={isMobileAccounts}
              panelWidthCh={isMobileAccounts ? accountFilterPanelWidthCh : undefined}
              fullWidthPanel
            />
            {isMobileAccounts ? (
              <FilterDropdown
                label="Tri"
                mode="single"
                options={SORT_OPTIONS}
                selected={[filters.sortAccounts]}
                onToggle={(value) => setParam("sortAcc", value === filters.sortAccounts ? null : value)}
                onClear={() => setParam("sortAcc", null)}
                compact
                panelWidthCh={14}
              />
            ) : (
              <FilterDropdown
                label="Score"
                mode="single"
                options={SCORE_OPTIONS}
                selected={filters.minScore === null ? [] : [String(filters.minScore)]}
                onToggle={(value) => setParam("minScore", filters.minScore === Number(value) ? null : value)}
                onClear={() => setParam("minScore", null)}
                panelWidthCh={11}
              />
            )}
          </>
        ) : (
          <>
            <FilterDropdown
              label="Rôle"
              options={ROLE_OPTIONS}
              selected={filters.includeRole}
              onToggle={(value) => toggleListValue("incRole", value)}
              onClear={() => setParam("incRole", null)}
              compact={isMobileContacts}
              panelWidthCh={isMobileContacts ? CONTACT_FILTER_PANEL_WIDTH_CH : undefined}
              fullWidthPanel
            />
            <FilterChip
              label="Avec email"
              active={filters.hasEmail}
              compact={isMobileContacts}
              onToggle={() => setParam("hasEmail", filters.hasEmail ? null : "1")}
            />
            <FilterChip
              label="Avec téléphone"
              active={filters.hasPhone}
              compact={isMobileContacts}
              onToggle={() => setParam("hasPhone", filters.hasPhone ? null : "1")}
            />
          </>
        )}
      </SearchToolbar>

      {/* Dynamic Views */}
      {subTab === "accounts" && (
        device === "mobile" ? (
          <AccountsMobile
            accounts={displayAccounts}
            onOpenIdentity={openCompanyDrawer}
          />
        ) : (
          <AccountsDesktop
            accounts={displayAccounts}
            studies={data.studies}
            onOpenIdentity={openCompanyDrawer}
            onOpenIntelligence={(account) =>
              openCrmTab({ entityType: "company-intelligence", entityId: account.id, title: account.name })
            }
          />
        )
      )}

      {subTab === "contacts" && (
        device === "mobile" ? (
          <ContactsMobile
            contacts={displayContacts}
            onOpenIdentity={openContactDrawer}
            onOpenCompanyIdentity={(companyId) => {
              openCompanyDrawer(companyId)
            }}
            onEdit={(c) => setContactModal({ open: true, editing: c })}
          />
        ) : (
          <ContactsDesktop
            contacts={displayContacts}
            onOpenIdentity={openContactDrawer}
            onOpenCompanyIdentity={(companyId) => {
              openCompanyDrawer(companyId)
            }}
            onEdit={(c) => setContactModal({ open: true, editing: c })}
          />
        )
      )}

      {/* Modals */}
      {companyModal.open && (
        <CompanyFormModal
          initial={companyModal.editing}
          createKind={device === "mobile" && !companyModal.editing ? "company" : undefined}
          onCreateKindChange={device === "mobile" && !companyModal.editing ? handleCreateKindChange : undefined}
          onClose={() => {
            setCompanyModal({ open: false })
            if (editCompanyReturnToIdentityId) {
              openCompanyDrawer(editCompanyReturnToIdentityId)
              setEditCompanyReturnToIdentityId(null)
            }
          }}
          onSuccess={() => {
            refreshData()
            if (editCompanyReturnToIdentityId) {
              openCompanyDrawer(editCompanyReturnToIdentityId)
              setEditCompanyReturnToIdentityId(null)
            }
          }}
        />
      )}

      {contactModal.open && (
        <ContactFormModal
          initial={contactModal.editing}
          accounts={data.accounts}
          contacts={data.contacts}
          createKind={device === "mobile" && !contactModal.editing ? "contact" : undefined}
          onCreateKindChange={device === "mobile" && !contactModal.editing ? handleCreateKindChange : undefined}
          onClose={() => {
            setContactModal({ open: false })
            if (editContactReturnToIdentityId) {
              openContactDrawer(editContactReturnToIdentityId)
              setEditContactReturnToIdentityId(null)
            }
          }}
          onSuccess={() => {
            refreshData()
            if (editContactReturnToIdentityId) {
              openContactDrawer(editContactReturnToIdentityId)
              setEditContactReturnToIdentityId(null)
            }
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          label={deleteTarget.kind === "company" ? deleteTarget.item.name : deleteTarget.item.fullName}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          pending={deletePending}
        />
      )}



      {/* CRM drawers moved to global CrmIdentityDrawerHost in AppLayout */}

      {device === "desktop" && (
        <div className="flex items-center justify-between rounded border border-border bg-surface px-5 py-4 text-xs text-muted mt-2">
          <span>Données issues de la Prospection Intelligence · Analyse et RAG actifs.</span>
        </div>
      )}
    </div>
  )
}

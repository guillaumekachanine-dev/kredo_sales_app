"use client"

import Image from "next/image"
import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react"

import { useRouter } from "next/navigation"
import { useCrmTabStore } from "@/lib/tabs/crm-tab-store"
import { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import {
  AccountRow,
  AccountsContactsData,
  ContactRow,
  TaxonomySegmentOption,
} from "@/lib/accounts-contacts/accounts-contacts-data"
import {
  parseFilters,
  filterAccounts,
  filterContacts,
} from "@/lib/accounts-contacts/accounts-contacts-filters"
import { relationshipRoleAccentColor, relationshipRoleLabel } from "@/lib/accounts-contacts/contact-constants"
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
  updateContactRelationshipRole,
  deleteContact,
  type CompanyFormData,
  type ContactFormData,
} from "@/app/(app)/prospection/accounts/actions"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Select } from "@/components/ui/Select"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { useCrmDrawer } from "@/hooks/use-crm-drawer"
import { AgendaEventDrawer, type AgendaEventDrawerInitialValues } from "@/components/agenda/AgendaEventDrawer"
import { cn } from "@/lib/utils"
import {
  CompetitiveMapImportDialog,
  type CompetitiveMapSegmentOption,
} from "@/features/competitive-map/components/CompetitiveMapImportWizard"
import {
  CONTACT_DEPARTMENTS,
  CONTACT_RELATIONSHIP_ROLE_OPTIONS,
} from "@/lib/accounts-contacts/contact-constants"
import {
  fetchPersistedMobilePriorityAccountIds,
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

// Domaine réel de `companies.tier` (CHECK companies_tier_check). Le select doit
// exposer exactement ces trois valeurs, sinon il n'effectue pas d'aller-retour :
// la valeur choisie serait normalisée côté serveur puis réaffichée différemment.
const COMPANY_CATEGORY_OPTIONS = [
  { value: "grand_compte", label: "Grand compte" },
  { value: "eti", label: "ETI" },
  { value: "pme", label: "PME" },
]

const DEFAULT_SECTOR_OPTIONS = [
  "Aéronautique & Défense",
  "Assurance",
  "Banque & Services financiers",
  "BTP, Construction & Immobilier",
  "Énergie & Utilities",
  "EHPAD & Résidences Seniors",
  "Industrie & Manufacturing",
  "Luxe, Beauté & Cosmétique",
  "Parfumerie & Arômes",
  "Retail & Distribution",
  "Santé & Pharmaceutique",
  "Services numériques & Conseil",
  "Télécoms & Médias",
  "Transport & Mobilité régionale",
]

// Domaine réel de `companies.relation_type` (migration 066 §5.8), dont
// `lifecycle_status` n'est plus qu'une projection.
const LIFECYCLE_OPTIONS = [
  { value: "prospect", label: "Prospect" },
  { value: "client", label: "Client" },
  { value: "ancien_client", label: "Ancien client" },
  { value: "pair_partenaire", label: "Partenaire" },
]

const COMPANY_MODAL_ACCENT = "#348A98"
const CONTACT_MODAL_ACCENT = "#2554B8"

function normalizeLifecycleStatus(value: string | undefined) {
  switch (value) {
    case "client":
    case "client_actif":
    case "client_dormant":
      return "client"
    case "ancien_client":
      return "ancien_client"
    // Sans le cas `pair_partenaire`, rouvrir la modale sur un compte partenaire
    // le réaffichait en « Prospect » et l'enregistrement le déclassait.
    case "partenaire":
    case "pair_partenaire":
      return "pair_partenaire"
    case "prospect":
    default:
      return "prospect"
  }
}

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

const ROLE_OPTIONS = CONTACT_RELATIONSHIP_ROLE_OPTIONS

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

function displayTier(tier: string | null | undefined) {
  if (!tier) return "-"
  switch (tier) {
    case "grand_compte": return "Grand compte"
    case "eti": return "ETI"
    case "pme": return "PME"
    case "tpe": return "TPE"
    case "cac40": return "CAC40"
    case "etablissement_public": return "Établissement public"
    default: return tier
  }
}

function displayRegimeAchat(regime: string | null | undefined) {
  if (!regime) return "-"
  switch (regime) {
    case "commande_publique": return "Commande publique"
    case "regule": return "Régulé"
    case "monaco": return "Monaco"
    case "prive": return "Privé"
    default: return regime
  }
}

function displayRelationType(relationType: string | null | undefined) {
  if (!relationType) return "Prospect"
  switch (relationType) {
    case "prospect": return "Prospect"
    case "client":
    case "client_actif": return "Client"
    case "client_dormant": return "Client dormant"
    case "ancien_client": return "Ancien client"
    case "pair_partenaire":
    case "partenaire": return "Partenaire"
    default: return relationType.replaceAll("_", " ")
  }
}

function displaySizeBand(sizeBand: string | null | undefined, employeeCount: number | null | undefined) {
  const displayStr = sizeBand?.trim() || employeeCount?.toString()
  if (!displayStr) return "-"

  if (displayStr.includes("1001-5000") || displayStr.includes("1000") || (employeeCount && employeeCount > 1000 && employeeCount <= 5000)) return "1-5k"
  if (displayStr.includes("501-1000") || (employeeCount && employeeCount > 500 && employeeCount <= 1000)) return "501-1k"
  if (displayStr.includes(">5000") || displayStr.includes("+5000") || (employeeCount && employeeCount > 5000)) return "+5k"

  if (sizeBand && sizeBand.trim().length > 0) {
    if (sizeBand === "501-1000") return "501-1k"
    if (sizeBand === "1001-5000") return "1-5k"
    if (sizeBand === ">5000" || sizeBand === "+5000") return "+5k"
    return sizeBand.trim()
  }
  if (employeeCount !== null && employeeCount !== undefined) return employeeCount.toLocaleString("fr-FR")
  return "-"
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
  sectorOptions,
  taxonomySegments,
  createKind,
  onCreateKindChange,
  onClose,
  onSuccess,
}: {
  initial?: AccountRow
  sectorOptions: string[]
  taxonomySegments?: TaxonomySegmentOption[]
  createKind?: CreateEntityKind
  onCreateKindChange?: (kind: CreateEntityKind) => void
  onClose: () => void
  /** En édition, appelé sans argument. En création, `qualify` reflète le bouton utilisé. */
  onSuccess: (created?: { id: string; qualify: boolean }) => void
}) {
  const [form, setForm] = useState<CompanyFormData>({
    name: initial?.name ?? "",
    sector: initial?.sector === "Non renseigné" ? "" : (initial?.sector ?? ""),
    sector_id: initial?.sectorId ?? null,
    segment: initial?.segment === "Segment non renseigné" ? "" : (initial?.segment ?? ""),
    segment_id: initial?.segmentId ?? null,
    tier: initial?.tier ?? null,
    regime_achat: initial?.regimeAchat ?? null,
    relation_type: initial?.status ? normalizeLifecycleStatus(initial.status) : "prospect",
    hq_location: initial?.location === "Non renseigné" ? "" : (initial?.location ?? ""),
    revenue: initial?.revenue === "Non renseigné" ? "" : (initial?.revenue ?? ""),
    employee_count: initial?.employeeCount !== null && initial?.employeeCount !== undefined ? String(initial.employeeCount) : "",
    priority: initial?.priority ?? "normale",
    lifecycle_status: normalizeLifecycleStatus(initial?.status),
    website: initial?.website ?? "",
    description: initial?.description ?? "",
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const set = (key: keyof CompanyFormData, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const sectorsList = taxonomySegments?.filter((t) => !t.parentId) || []
  const segmentsList = taxonomySegments?.filter((t) => t.parentId === form.sector_id) || []

  const handleSectorChange = (selectedId: string) => {
    const matched = sectorsList.find((s) => s.id === selectedId)
    setForm((f) => ({
      ...f,
      sector_id: selectedId || null,
      sector: matched ? matched.name : f.sector,
      segment_id: null,
      segment: "",
    }))
  }

  const handleSegmentChange = (selectedId: string) => {
    const matched = taxonomySegments?.find((seg) => seg.id === selectedId)
    setForm((f) => ({
      ...f,
      segment_id: selectedId || null,
      segment: matched ? matched.name : f.segment,
    }))
  }

  // `qualify` distingue les deux boutons de création : « Créer » (P1 simple)
  // vs « Créer et qualifier » (P1 puis ouverture immédiate du scan côté appelant).
  const submit = (qualify: boolean) => {
    if (!form.name.trim()) { setError("Le nom est requis."); return }
    setError(null)
    startTransition(async () => {
      if (initial) {
        const result = await updateCompany(initial.id, form)
        if (result.error) { setError(result.error); return }
        onSuccess()
        onClose()
        return
      }
      const result = await createCompany(form)
      if (result.error || !result.id) { setError(result.error ?? "La création du compte a échoué."); return }
      onSuccess({ id: result.id, qualify })
      onClose()
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submit(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <SurfaceCard className="relative flex w-full max-w-2xl flex-col overflow-hidden border border-border animate-in zoom-in-95 duration-200">
        <div
          className="flex items-center justify-between border-b border-white/20 px-5 py-3.5 text-white"
          style={{ backgroundColor: COMPANY_MODAL_ACCENT }}
        >
          {initial || !createKind || !onCreateKindChange ? (
            <h2 className="text-base font-bold text-white font-heading">
              {initial ? "Modifier le compte" : "Nouveau compte"}
            </h2>
          ) : (
            <NewEntityTitle kind={createKind} onKindChange={onCreateKindChange} />
          )}
          <button onClick={onClose} className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex max-h-[72vh] flex-col gap-3.5 overflow-y-auto px-5 py-4">
          <Field label="Nom *">
            <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="BNP Paribas" />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Siège social">
              <input className={inputCls} value={form.hq_location} onChange={(e) => set("hq_location", e.target.value)} placeholder="Paris" />
            </Field>
            <Field label="Site web">
              <input className={inputCls} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://bnpparibas.com" />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Chiffre d'affaires">
              <input className={inputCls} value={form.revenue} onChange={(e) => set("revenue", e.target.value)} placeholder="100-300M€" />
            </Field>
            <Field label="Effectifs">
              <input className={inputCls} inputMode="numeric" value={form.employee_count} onChange={(e) => set("employee_count", e.target.value)} placeholder="250" />
            </Field>
            <Field label="Catégorie">
              <Select className={selectCls} value={form.tier || ""} onChange={(e) => set("tier", e.target.value)}>
                <option value="">Non renseigné</option>
                {COMPANY_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Secteur d'activité">
              {sectorsList.length > 0 ? (
                <Select
                  className={selectCls}
                  value={form.sector_id || ""}
                  onChange={(e) => handleSectorChange(e.target.value)}
                >
                  <option value="">Non renseigné</option>
                  {sectorsList.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <Select className={selectCls} value={form.sector} onChange={(e) => set("sector", e.target.value)}>
                  <option value="">Non renseigné</option>
                  {sectorOptions.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Segment métier">
              <Select
                className={selectCls}
                value={form.segment_id || ""}
                onChange={(e) => handleSegmentChange(e.target.value)}
                disabled={!form.sector_id && sectorsList.length > 0}
              >
                <option value="">Non renseigné</option>
                {segmentsList.map((seg) => (
                  <option key={seg.id} value={seg.id}>
                    {seg.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Priorité">
              <Select className={selectCls} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <Field label="Statut">
              <Select className={selectCls} value={form.relation_type || form.lifecycle_status} onChange={(e) => { set("relation_type", e.target.value); set("lifecycle_status", e.target.value); }}>
                {LIFECYCLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <textarea className={cn(inputCls, "resize-none")} rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Décrire le métier, les offres ou le contexte du compte…" />
          </Field>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-canvas/30 px-5 py-3">
          <button onClick={onClose} className="rounded border border-border px-4 py-2 text-xs font-semibold text-body hover:bg-canvas/60 transition-colors">Annuler</button>
          <div className="flex items-center gap-2">
            {!initial && (
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={pending}
                className="rounded border px-4 py-2 text-xs font-semibold shadow-sm transition-colors hover:brightness-95 disabled:opacity-50"
                style={{ borderColor: COMPANY_MODAL_ACCENT, color: COMPANY_MODAL_ACCENT }}
                title="Créer le compte puis lancer immédiatement le scan d'informations"
              >
                {pending ? "Enregistrement…" : "Créer et qualifier"}
              </button>
            )}
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={pending}
              className="rounded px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:brightness-95 disabled:opacity-50"
              style={{ backgroundColor: COMPANY_MODAL_ACCENT }}
            >
              {pending ? "Enregistrement…" : initial ? "Mettre à jour" : "Créer le compte"}
            </button>
          </div>
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
        <div
          className="flex items-center justify-between border-b border-white/20 px-6 py-4 text-white"
          style={{ backgroundColor: CONTACT_MODAL_ACCENT }}
        >
          {initial || !createKind || !onCreateKindChange ? (
            <h2 className="text-base font-bold text-white font-heading">
              {initial ? "Modifier le contact" : "Nouveau contact"}
            </h2>
          ) : (
            <NewEntityTitle kind={createKind} onKindChange={onCreateKindChange} />
          )}
          <button onClick={onClose} className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white transition-colors">
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
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={pending || deletePending}
            className="rounded px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:brightness-95 disabled:opacity-50"
            style={{ backgroundColor: CONTACT_MODAL_ACCENT }}
          >
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
//  Comptes cartographiés — ADR-0019 Lot 6 (D-3)
//
//  Sous-section volontairement séparée et repliable, un seul composant
//  responsive plutôt qu'un couple Desktop/Mobile : c'est une liste simple
//  (ADR-0006 amende la règle d'adaptive plein pour ce cas), pas un tableau
//  dense. Clique = même drawer que les comptes réels (`onOpenIdentity`) ;
//  celui-ci bascule automatiquement en variante minimale sur `depth_level`.
// ─────────────────────────────────────────────────────────────────────────────

function MappedAccountsSection({
  accounts,
  onOpenIdentity,
}: {
  accounts: AccountRow[]
  onOpenIdentity: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(true)

  if (accounts.length === 0) return null

  return (
    <SurfaceCard className="mt-4 overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <h3 className="font-heading text-sm font-bold text-heading">Comptes cartographiés</h3>
          <p className="mt-0.5 text-[11px] text-muted">
            Citations issues des cartographies concurrentielles — non qualifiées, exclues des statistiques et des
            sélecteurs commerciaux tant qu’elles ne sont pas converties.
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-bold text-muted">
            {accounts.length}
          </span>
          <svg
            className={cn("h-4 w-4 text-muted transition-transform", expanded && "rotate-180")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {expanded && (
        <div className="divide-y divide-border/60 border-t border-border/60">
          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => onOpenIdentity(account.id)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-hover"
            >
              <CompanyLogo
                name={account.name}
                logoPath={account.logoPath}
                website={account.website}
                size="sm"
                className="h-8 w-8 shrink-0 rounded-full"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-heading">{account.name}</p>
                <p className="truncate text-[11px] text-muted">
                  {[account.sector, account.segment].filter(Boolean).join(" · ") || "Secteur non renseigné"}
                </p>
              </div>
              <svg className="h-4 w-4 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </SurfaceCard>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Accounts Sub-views
// ─────────────────────────────────────────────────────────────────────────────

function AccountsDesktop({
  accounts,
  contacts,
  onOpenIdentity,
  onOpenIntelligence,
  onOpenContactIdentity,
  onEditCompany,
}: {
  accounts: AccountRow[]
  contacts: ContactRow[]
  onOpenIdentity: (id: string) => void
  onOpenIntelligence: (account: AccountRow) => void
  onOpenContactIdentity: (id: string) => void
  onEditCompany?: (account: AccountRow) => void
}) {
  const [collapsedSectors, setCollapsedSectors] = useState<Record<string, boolean>>({})
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({})
  const [actionsMenuOpenAccountId, setActionsMenuOpenAccountId] = useState<string | null>(null)
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false)
  const [eventInitialValues, setEventInitialValues] = useState<AgendaEventDrawerInitialValues | undefined>()

  const router = useRouter()
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [updatingContactId, setUpdatingContactId] = useState<string | null>(null)
  const [, startUpdateTransition] = useTransition()

  useEffect(() => {
    const onClick = () => setActionsMenuOpenAccountId(null)
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [])

  const handleLogActivity = (contact: ContactRow, account: AccountRow) => {
    setEventInitialValues({
      contact_id: contact.id,
      company: {
        id: account.id,
        name: account.name,
        isNew: false,
      },
      title: `Échange avec ${contact.fullName}`,
    })
    setEventDrawerOpen(true)
  }

  const groupedBySector = useMemo(() => {
    const map = new Map<string, AccountRow[]>()
    accounts.forEach((acc) => {
      const sector = acc.sector || "Non renseigné"
      if (!map.has(sector)) {
        map.set(sector, [])
      }
      map.get(sector)!.push(acc)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [accounts])

  return (
    <SurfaceCard className="overflow-visible">

      <div className="overflow-visible">
        <table className="w-full border-collapse text-left text-xs table-fixed">
          <thead>
            <tr className="border-b border-border bg-canvas/50 text-[10px] font-bold uppercase tracking-wider text-muted">
              <th className="px-5 py-3 w-[24%]">Compte</th>
              <th className="px-3 py-3 w-[20%]">Segment</th>
              <th className="px-3 py-3 w-[14%]">Siège</th>
              <th className="px-3 py-3 text-center w-[8%]">CA</th>
              <th className="px-3 py-3 text-center w-[10%]">Catégorie</th>
              <th className="px-3 py-3 text-center w-[10%]">Statut</th>
              <th className="px-3 py-3 text-center w-[8%]">Priorité</th>
              <th className="px-5 py-3 text-center w-[6%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {groupedBySector.map(([sector, sectorAccounts]) => {
              const isSectorCollapsed = collapsedSectors[sector] === true

              return (
                <Fragment key={sector}>
                  {/* Sector Header Row */}
                  <tr className="border-y border-border/80 kredo-sector-header-row" style={{ backgroundColor: "#607D8B" }}>
                    <td colSpan={8} className="px-5 py-2.5 align-middle font-bold text-white text-[11px] uppercase tracking-wider select-none">
                      <button
                        type="button"
                        onClick={() => {
                          setCollapsedSectors(prev => ({ ...prev, [sector]: !prev[sector] }))
                        }}
                        className="flex items-center gap-2 font-bold cursor-pointer text-left w-full focus:outline-none text-white"
                      >
                        <svg
                          className={cn(
                            "size-3.5 shrink-0 text-white/80 transition-transform duration-200",
                            !isSectorCollapsed ? "rotate-90" : ""
                          )}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <span>{sector}</span>
                        <span className="text-[10px] font-semibold text-white/70 ml-1 normal-case font-sans">
                          ({sectorAccounts.length} compte{sectorAccounts.length > 1 ? "s" : ""})
                        </span>
                      </button>
                    </td>
                  </tr>

                  {/* Sector Accounts Rows */}
                  {!isSectorCollapsed && sectorAccounts.map((account) => {
                    const isContactsExpanded = expandedAccounts[account.id] === true
                    const accountContacts = contacts.filter((c) => c.companyId === account.id)

                    return (
                      <Fragment key={account.id}>
                        {/* Account Main Row - Clicking opens Cockpit Intelligence */}
                        <tr
                          id={`account-row-${account.id}`}
                          onClick={() => onOpenIntelligence(account)}
                          className="kredo-hover-reference border-b border-border/40 cursor-pointer hover:bg-canvas/30 transition-colors"
                        >
                          {/* 1. Compte (Name, Logo, Eye icon for Drawer, Collapse toggle) */}
                          <td className="px-5 py-3 truncate">
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedAccounts(prev => ({ ...prev, [account.id]: !prev[account.id] }))
                                }}
                                className="text-muted hover:text-heading p-0.5 transition-transform shrink-0"
                                title={isContactsExpanded ? "Cacher les contacts" : "Afficher les contacts"}
                              >
                                <svg
                                  className={cn(
                                    "size-3.5 shrink-0 transition-transform duration-200",
                                    isContactsExpanded ? "rotate-90" : ""
                                  )}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <div
                                className="shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onOpenIdentity(account.id)
                                }}
                              >
                                <CompanyLogo name={account.name} logoPath={account.logoPath} website={account.website} size="md" denseList />
                              </div>
                              <div className="min-w-0 flex-1 flex items-center gap-1.5">
                                <span className="font-bold text-[13px] text-heading truncate" title={account.name}>
                                  {account.name}
                                </span>
                                {/* Eye pictogram action button opening account drawer */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onOpenIdentity(account.id)
                                  }}
                                  className="p-1 text-muted hover:text-primary transition-colors rounded hover:bg-canvas shrink-0"
                                  title="Ouvrir la fiche d'identité (drawer)"
                                  aria-label={`Ouvrir la fiche d'identité de ${account.name}`}
                                >
                                  <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* 2. Segment */}
                          <td className="px-3 py-3 text-body truncate" title={account.segment}>{account.segment.replace(/^[\d]+[.\s\-]+/, '')}</td>

                          {/* 3. Siège */}
                          <td className="px-3 py-3 text-body truncate" title={account.location || "-"}>{account.location || "-"}</td>

                          {/* 4. CA */}
                          <td className="px-3 py-3 text-center font-semibold text-heading">{displayRevenue(account.revenue)}</td>

                          {/* 5. Catégorie */}
                          <td className="px-3 py-3 text-center text-body truncate" title={displayTier(account.tier)}>{displayTier(account.tier)}</td>

                          {/* 6. Statut */}
                          <td className="px-3 py-3 text-center text-body truncate font-medium">{displayRelationType(account.status)}</td>

                          {/* 10. Priorité */}
                          <td className="px-3 py-3 text-center"><PriorityBadge priority={account.priority} /></td>

                          {/* 11. Actions (Round blue button with 3 vertical dots) */}
                          <td className="px-5 py-3 text-center">
                            <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActionsMenuOpenAccountId(actionsMenuOpenAccountId === account.id ? null : account.id)
                                }}
                                className="inline-flex size-8 items-center justify-center rounded-full bg-[#0047AB] text-white hover:bg-[#003C96] transition-colors focus:outline-none cursor-pointer shadow-sm"
                                aria-label={`Actions pour ${account.name}`}
                                title="Actions"
                              >
                                <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>
                              {actionsMenuOpenAccountId === account.id && (
                                <div
                                  className="absolute right-0 z-50 mt-1 w-48 rounded-md border border-border bg-surface shadow-lg py-1 text-xs text-heading animate-in fade-in zoom-in-95 duration-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionsMenuOpenAccountId(null)
                                      onOpenIntelligence(account)
                                    }}
                                    className="flex w-full items-center px-3 py-2 text-left hover:bg-canvas transition-colors font-medium"
                                  >
                                    Cockpit Intelligence
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionsMenuOpenAccountId(null)
                                      onOpenIdentity(account.id)
                                    }}
                                    className="flex w-full items-center px-3 py-2 text-left hover:bg-canvas transition-colors"
                                  >
                                    Fiche d&apos;identité (Drawer)
                                  </button>
                                  {onEditCompany && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActionsMenuOpenAccountId(null)
                                        onEditCompany(account)
                                      }}
                                      className="flex w-full items-center px-3 py-2 text-left hover:bg-canvas transition-colors"
                                    >
                                      Éditer le compte
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Collapsible Contacts Row */}
                        {isContactsExpanded && (
                          <tr className="bg-canvas/15 border-b border-border/30">
                            <td colSpan={8} className="px-5 py-2.5">
                              <div className="flex flex-col gap-1.5 pl-6 border-l-2 border-primary/25 py-1">
                                {accountContacts.length === 0 ? (
                                  <span className="text-[11px] text-muted italic pl-3">Aucun contact enregistré pour ce compte.</span>
                                ) : (
                                  accountContacts.map((contact) => (
                                    <div
                                      key={contact.id}
                                      onClick={() => onOpenContactIdentity(contact.id)}
                                      className="grid grid-cols-[18px_180px_220px_150px_100px_1fr] gap-6 items-center py-1.5 px-3 rounded hover:bg-canvas/30 transition-colors cursor-pointer text-left w-full"
                                    >
                                      {/* Col 1: Account Logo */}
                                      <Image
                                        src="/icons_set/comptes_liste_contacts.png"
                                        alt=""
                                        width={18}
                                        height={18}
                                        className="h-[18px] w-[18px] shrink-0 object-contain"
                                      />

                                      {/* Col 2: Prénom NOM */}
                                      <span className="font-semibold text-heading truncate text-xs" title={contact.fullName}>
                                        {contact.fullName}
                                      </span>

                                      {/* Col 3: Poste */}
                                      <span className="text-body truncate text-xs" title={contact.jobTitle}>
                                        {contact.jobTitle || "—"}
                                      </span>

                                      {/* Col 4: Rôle décisionnel */}
                                      <div
                                        className="relative flex items-center min-w-0 w-full"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {updatingContactId === contact.id ? (
                                          <div className="flex items-center gap-1.5 text-muted text-[11px]">
                                            <svg className="animate-spin h-3 w-3 text-primary shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span className="italic text-[10px] text-muted">Mise à jour...</span>
                                          </div>
                                        ) : editingContactId === contact.id ? (
                                          <select
                                            autoFocus
                                            value={contact.relationshipRole || ""}
                                            onChange={(e) => {
                                              const newRole = e.target.value || null
                                              setEditingContactId(null)
                                              setUpdatingContactId(contact.id)
                                              startUpdateTransition(async () => {
                                                await updateContactRelationshipRole(contact.id, newRole)
                                                setUpdatingContactId(null)
                                                router.refresh()
                                              })
                                            }}
                                            onBlur={() => setEditingContactId(null)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Escape") {
                                                setEditingContactId(null)
                                              }
                                            }}
                                            className="w-full bg-canvas border border-border/80 text-[11px] rounded px-1.5 py-0.5 text-heading focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                                          >
                                            <option value="">— Non renseigné —</option>
                                            {CONTACT_RELATIONSHIP_ROLE_OPTIONS.map((opt) => (
                                              <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                              </option>
                                            ))}
                                          </select>
                                        ) : (
                                          <div
                                            onClick={() => setEditingContactId(contact.id)}
                                            className="group flex items-center justify-between w-full hover:bg-canvas/40 px-2 py-1 rounded transition-colors border border-transparent hover:border-border/30 cursor-pointer min-w-0"
                                            title="Cliquer pour modifier le rôle décisionnel"
                                          >
                                            <span className="text-muted text-[11px] truncate select-none">
                                              {relationshipRoleLabel(contact.relationshipRole)}
                                            </span>
                                            <svg
                                              className="h-3 w-3 text-muted/40 group-hover:text-muted shrink-0 ml-1 transition-colors opacity-0 group-hover:opacity-100"
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              stroke="currentColor"
                                              strokeWidth={2}
                                            >
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                          </div>
                                        )}
                                      </div>

                                      {/* Col 5: Bouton d'action "activité" (cobalt blue) */}
                                      <div className="flex">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleLogActivity(contact, account)
                                          }}
                                          className="rounded bg-[#0047AB] hover:bg-[#003c96] px-2.5 py-1 text-[10px] font-bold text-white transition-colors cursor-pointer shadow-sm inline-flex items-center justify-center min-w-[76px]"
                                        >
                                          Activité
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {eventDrawerOpen && (
        <AgendaEventDrawer
          open={eventDrawerOpen}
          onOpenChange={setEventDrawerOpen}
          event={null}
          initialValues={eventInitialValues}
          onSaved={() => {
            setEventDrawerOpen(false)
            router.refresh()
          }}
        />
      )}
    </SurfaceCard>
  )
}

function AccountsMobile({
  accounts,
  contacts,
  onOpenIdentity,
  onOpenContactIdentity,
}: {
  accounts: AccountRow[]
  contacts: ContactRow[]
  onOpenIdentity: (id: string) => void
  onOpenContactIdentity: (id: string) => void
}) {
  const [collapsedSectors, setCollapsedSectors] = useState<Record<string, boolean>>({})
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({})

  const groupedBySector = useMemo(() => {
    const map = new Map<string, AccountRow[]>()
    accounts.forEach((account) => {
      const sector = account.sector || "Non renseigné"
      if (!map.has(sector)) {
        map.set(sector, [])
      }
      map.get(sector)!.push(account)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [accounts])

  const contactsByCompanyId = useMemo(() => {
    const map = new Map<string, ContactRow[]>()
    contacts.forEach((contact) => {
      if (!contact.companyId) return
      const bucket = map.get(contact.companyId)
      if (bucket) {
        bucket.push(contact)
      } else {
        map.set(contact.companyId, [contact])
      }
    })
    return map
  }, [contacts])

  return (
    <div className="overflow-hidden rounded-[var(--radius-large)] border border-border/60 bg-surface">
      {groupedBySector.map(([sector, sectorAccounts]) => {
        const isSectorCollapsed = collapsedSectors[sector] === true

        return (
          <Fragment key={sector}>
            <div className="border-y border-border/80 kredo-sector-header-row" style={{ backgroundColor: "#607D8B" }}>
              <button
                type="button"
                onClick={() => {
                  setCollapsedSectors((prev) => ({ ...prev, [sector]: !prev[sector] }))
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-bold text-white"
                aria-expanded={!isSectorCollapsed}
              >
                <svg
                  className={cn(
                    "size-3.5 shrink-0 text-white/80 transition-transform duration-200",
                    !isSectorCollapsed ? "rotate-90" : ""
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-[11px] uppercase tracking-wider">{sector}</span>
                <span className="ml-1 text-[10px] font-semibold normal-case text-white/70">
                  ({sectorAccounts.length} compte{sectorAccounts.length > 1 ? "s" : ""})
                </span>
              </button>
            </div>

            {!isSectorCollapsed && sectorAccounts.map((account) => {
              const roleRank = (role: string | null) =>
                role === "decideur" ? 0 : role === "prescripteur" ? 1 : 2
              const accountContacts = (contactsByCompanyId.get(account.id) ?? []).slice().sort((a, b) => {
                const rankA = roleRank(a.relationshipRole)
                const rankB = roleRank(b.relationshipRole)
                if (rankA !== rankB) return rankA - rankB
                return a.fullName.localeCompare(b.fullName, "fr")
              })
              const isContactsExpanded = expandedAccounts[account.id] === true
              const accountStatus = displayRelationType(account.status)
              const accountSegment = account.segment || "Segment non renseigné"

              return (
                <Fragment key={account.id}>
                  <div id={`account-row-${account.id}`} className="border-b border-border/40">
                    <div className="flex items-center gap-2 px-3 py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setExpandedAccounts((prev) => ({ ...prev, [account.id]: !prev[account.id] }))
                        }}
                        className="flex size-8 shrink-0 items-center justify-center text-muted transition-colors hover:text-heading"
                        aria-expanded={isContactsExpanded}
                        aria-label={isContactsExpanded ? "Masquer les contacts" : "Afficher les contacts"}
                        title={isContactsExpanded ? "Cacher les contacts" : "Afficher les contacts"}
                      >
                        <svg
                          className={cn(
                            "size-3.5 shrink-0 transition-transform duration-200",
                            isContactsExpanded ? "rotate-90" : ""
                          )}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenIdentity(account.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors active:opacity-75"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-bold leading-tight text-heading">
                            {account.name}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] text-muted">
                            {accountSegment} - {accountStatus}
                          </div>
                        </div>
                        <CompanyLogo
                          name={account.name}
                          logoPath={account.logoPath}
                          website={account.website}
                          size="lg"
                          denseList
                          className="rounded-none border-0 bg-transparent shrink-0"
                        />
                      </button>
                    </div>
                  </div>

                  {isContactsExpanded && (
                    <div className="border-b border-border/30 bg-canvas/15">
                      <div className="flex flex-col gap-1 py-1.5">
                        {accountContacts.length === 0 ? (
                          <span className="px-14 py-2 text-[11px] italic text-muted">
                            Aucun contact enregistré pour ce compte.
                          </span>
                        ) : (
                          accountContacts.map((contact) => {
                            const accentColor = relationshipRoleAccentColor(contact.relationshipRole)
                            const lineTitle = `${contact.fullName} - ${contact.jobTitle || "Fonction non renseignée"}`

                            return (
                              <button
                                key={contact.id}
                                type="button"
                                onClick={() => onOpenContactIdentity(contact.id)}
                                className="flex w-full items-center gap-2 pl-9 pr-3 py-2 text-left transition-colors hover:bg-canvas/35"
                              >
                                {accentColor ? (
                                  <span
                                    className="h-5 w-1 shrink-0 rounded-full"
                                    style={{ backgroundColor: accentColor }}
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <span className="w-1 shrink-0" aria-hidden="true" />
                                )}
                                <Image
                                  src="/icons_set/comptes_liste_contacts.png"
                                  alt=""
                                  width={18}
                                  height={18}
                                  className="h-[18px] w-[18px] shrink-0 object-contain"
                                />
                                <span className="min-w-0 flex-1 truncate text-[11px] text-body" title={lineTitle}>
                                  <span className="font-bold text-heading">{contact.fullName}</span>
                                  <span>{` - ${contact.jobTitle || "Fonction non renseignée"}`}</span>
                                </span>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}
                </Fragment>
              )
            })}
          </Fragment>
        )
      })}
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
    void fetchPersistedMobilePriorityAccountIds().then(setPriorityIds).catch(() => {})

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
                      denseList
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

  // studyIds est pré-calculé côté serveur sous forme de tableau simple.
  // On recrée un Set côté client pour un lookup O(1) efficace.
  const studyIds = useMemo(() => new Set(data.studyIds), [data.studyIds])

  const sectorOptions = useMemo<FilterOption[]>(
    () =>
      [...new Set(data.accounts.map((account) => account.sector))]
        .filter((sector) => sector.length > 0)
        .sort((a, b) => a.localeCompare(b))
        .map((sector) => ({ value: sector, label: sector })),
    [data.accounts]
  )
  const companySectorOptions = useMemo(
    () =>
      [
        ...new Set([
          ...DEFAULT_SECTOR_OPTIONS,
          ...data.accounts
            .map((account) => account.sectorAttachment)
            .filter((sector): sector is string => Boolean(sector)),
          ...data.accounts
            .map((account) => account.sector)
            .filter((sector) => sector.length > 0 && sector !== "Non renseigné"),
        ]),
      ].sort((a, b) => a.localeCompare(b, "fr")),
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
    // studyIds est une référence stable (Set créé une fois côté serveur, rerçu en prop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.accounts, filters, deferredQuery]
  )
  // ADR-0019 D-3 — mêmes filtres/recherche que la liste principale, mais un
  // tableau à part : ces comptes ne comptent jamais dans totalFiltered/totalAll.
  const filteredMappedAccounts = useMemo(
    () => filterAccounts(data.mappedAccounts, { ...filters, q: deferredQuery }, studyIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.mappedAccounts, filters, deferredQuery]
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
  const [competitiveMapOpen, setCompetitiveMapOpen] = useState(false)
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const competitiveMapSegments = useMemo<CompetitiveMapSegmentOption[]>(() => {
    const taxonomyById = new Map(data.taxonomySegments.map((item) => [item.id, item]))
    return data.taxonomySegments.flatMap((segment) => {
      if (segment.level !== "segment" || !segment.parentId) return []
      const macro = taxonomyById.get(segment.parentId)
      return macro
        ? [{ slug: segment.slug, name: segment.name, macroSlug: macro.slug, macroName: macro.name }]
        : []
    })
  }, [data.taxonomySegments])



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

  const toolbarFilters = subTab === "accounts" ? (
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
        label="Effectifs"
        options={SIZE_OPTIONS}
        selected={filters.includeSize}
        onToggle={(value) => toggleListValue("incSize", value)}
        onClear={() => setParam("incSize", null)}
        compact={isMobileAccounts}
        panelWidthCh={isMobileAccounts ? accountFilterPanelWidthCh : undefined}
        fullWidthPanel
      />
      {!isMobileAccounts && (
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
  )

  const mobileResultText = isMobileAccounts
    ? `${totalFiltered}/${totalAll} comptes`
    : isMobileContacts
      ? `${totalFiltered}/${totalAll} contacts`
      : null

  return (
    <div className={cn("mx-auto flex w-full max-w-7xl flex-col bg-canvas", device === "mobile" ? "gap-3 px-4 py-4" : "gap-5 px-6 py-6")}>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className={cn("font-heading font-bold tracking-tight text-heading", device === "mobile" ? "text-2xl" : "text-3xl")}>
            Comptes & Contacts
          </h1>
        </div>
        {device !== "mobile" && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCompetitiveMapOpen(true)}
              className="rounded border border-border bg-canvas px-3 py-1.5 text-xs font-semibold text-heading shadow-sm transition-colors hover:bg-border/10 active:scale-[0.98]"
            >
              Importer une cartographie
            </button>
            <button
              onClick={() => setContactModal({ open: true })}
              className="rounded px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
              style={{ backgroundColor: "#2554B8" }}
            >
              + Contact
            </button>
            <button
              onClick={() => setCompanyModal({ open: true })}
              className="rounded px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
              style={{ backgroundColor: "#348A98" }}
            >
              + Compte
            </button>
          </div>
        )}
      </div>

      {/* Sub-tab selection */}
      <div className={cn(device === "mobile" ? "grid grid-cols-[auto_1fr_auto] items-center gap-2" : "flex items-center gap-3")}>
        <PageViewSelector
          items={
            device === "mobile"
              ? [
                  { value: "accounts", label: "Comptes" },
                  { value: "contacts", label: "Contacts" },
                ]
              : [
                  { value: "accounts", label: "Comptes" },
                  { value: "contacts", label: "Contacts" },
                ]
          }
          value={subTab}
          onChange={(value) => setParam("tab", value)}
          ariaLabel="Sélection de la vue Comptes ou Contacts"
        />
        {device !== "mobile" && (
          <span className="text-xs font-bold text-muted ml-1">
            {totalFiltered} {subTab === "accounts" ? "comptes" : "contacts"}
          </span>
        )}
        {device === "mobile" && mobileResultText ? (
          <span className="min-w-0 text-center text-xs font-bold text-heading">
            {mobileResultText}
          </span>
        ) : null}
        {device === "mobile" && (
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-primary text-lg font-semibold leading-none text-primary-fg transition-colors hover:bg-primary/90"
            aria-label="Créer un compte ou un contact"
          >
            +
          </button>
        )}
      </div>

      {/* Search & quick filters */}
      <div className={cn(
        device !== "mobile" && "sticky top-0 z-30 -mx-6 px-6 py-3 bg-canvas border-b border-border/10 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.01),0_2px_4px_-1px_rgba(0,0,0,0.01)]"
      )}>
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
          hideReset={isMobileSearch}
          hideChildrenWhenCompact={isMobileSearch}
          hideCompactResult={isMobileSearch}
          inlineDesktop={device !== "mobile"}
          hideResultsOnDesktop={device !== "mobile"}
          mobileAction={isMobileSearch ? (
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              aria-label="Ouvrir les filtres"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors hover:text-heading"
            >
              <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M10 18h4" />
              </svg>
            </button>
          ) : undefined}
        >
          {toolbarFilters}
        </SearchToolbar>
      </div>

      {isMobileSearch && mobileFiltersOpen && (
        <div className="fixed inset-0 z-[1000] bg-heading/30 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)}>
          <div
            className="absolute inset-x-4 top-[8.25rem] rounded-[var(--radius-large)] border border-border/70 bg-surface p-3 shadow-[0_20px_60px_rgba(15,23,42,0.16)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Paramètres de filtres"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-heading">Filtres</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted transition-colors hover:text-heading"
                aria-label="Fermer les filtres"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div
              className={cn(
                subTab === "accounts"
                  ? "grid grid-cols-4 gap-1.5 [&>div]:min-w-0 [&>div]:w-full [&>div>button]:flex [&>div>button]:w-full [&>div>button]:justify-between"
                  : "flex flex-wrap gap-2"
              )}
            >
              {toolbarFilters}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => clearAll(["tab"])}
                className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted transition-colors hover:text-heading"
              >
                Réinitialiser
              </button>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary/90"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Views */}
      {subTab === "accounts" && (
        device === "mobile" ? (
          <AccountsMobile
            accounts={displayAccounts}
            contacts={data.contacts}
            onOpenIdentity={openCompanyDrawer}
            onOpenContactIdentity={openContactDrawer}
          />
        ) : (
          <AccountsDesktop
            accounts={displayAccounts}
            contacts={data.contacts}
            onOpenIdentity={openCompanyDrawer}
            onOpenIntelligence={(account) =>
              openCrmTab({ entityType: "company-intelligence", entityId: account.id, title: account.name })
            }
            onOpenContactIdentity={openContactDrawer}
            onEditCompany={(account) => setCompanyModal({ open: true, editing: account })}
          />
        )
      )}

      {subTab === "accounts" && (
        <MappedAccountsSection accounts={filteredMappedAccounts} onOpenIdentity={openCompanyDrawer} />
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
      {competitiveMapOpen && (
        <CompetitiveMapImportDialog
          open={competitiveMapOpen}
          onOpenChange={setCompetitiveMapOpen}
          segments={competitiveMapSegments}
          isMobile={device === "mobile"}
        />
      )}

      {companyModal.open && (
        <CompanyFormModal
          initial={companyModal.editing}
          sectorOptions={companySectorOptions}
          taxonomySegments={data.taxonomySegments}
          createKind={device === "mobile" && !companyModal.editing ? "company" : undefined}
          onCreateKindChange={device === "mobile" && !companyModal.editing ? handleCreateKindChange : undefined}
          onClose={() => {
            setCompanyModal({ open: false })
            if (editCompanyReturnToIdentityId) {
              openCompanyDrawer(editCompanyReturnToIdentityId)
              setEditCompanyReturnToIdentityId(null)
            }
          }}
          onSuccess={(created) => {
            refreshData()
            if (editCompanyReturnToIdentityId) {
              openCompanyDrawer(editCompanyReturnToIdentityId)
              setEditCompanyReturnToIdentityId(null)
              return
            }
            // ADR-0019 — « Créer et qualifier » : le compte vient de naître à P1
            // (noted), ouvrir directement son drawer avec le scan armé l'amène
            // à P2 (qualified) sans détour supplémentaire.
            if (created?.qualify) {
              openCompanyDrawer(created.id, { autoOpenScan: true })
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

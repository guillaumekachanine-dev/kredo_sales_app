"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import {
  AccountRow,
  AccountsContactsData,
  ContactRow,
  StudyRow,
} from "@/lib/accounts-contacts/accounts-contacts-data"
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
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

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

function IconEdit() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

// ─────────────────────────────────────────────────────────────────────────────
//  Company Form Modal
// ─────────────────────────────────────────────────────────────────────────────

function CompanyFormModal({
  initial,
  onClose,
  onSuccess,
}: {
  initial?: AccountRow
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
      <SurfaceCard className="relative w-full max-w-lg flex flex-col overflow-hidden shadow-2xl border border-border animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 bg-canvas/30">
          <h2 className="text-base font-bold text-heading font-heading">
            {initial ? "Modifier le compte" : "Nouveau compte"}
          </h2>
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priorité">
              <select className={selectCls} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Statut">
              <select className={selectCls} value={form.lifecycle_status} onChange={(e) => set("lifecycle_status", e.target.value)}>
                {LIFECYCLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
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

        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-6 py-4 bg-canvas/30">
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
  onClose,
  onSuccess,
}: {
  initial?: ContactRow
  accounts: AccountRow[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState<ContactFormData>({
    first_name: initial?.firstName ?? "",
    last_name: initial?.lastName ?? "",
    primary_email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    linkedin_url: initial?.linkedinUrl ?? "",
    company_id: initial?.companyId ?? "",
    job_title: initial?.jobTitle === "Fonction non renseignée" ? "" : (initial?.jobTitle ?? ""),
    relationship_role: initial?.relationshipRole ?? "",
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const set = (key: keyof ContactFormData, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <SurfaceCard className="relative w-full max-w-lg flex flex-col overflow-hidden shadow-2xl border border-border animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 bg-canvas/30">
          <h2 className="text-base font-bold text-heading font-heading">
            {initial ? "Modifier le contact" : "Nouveau contact"}
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-canvas/80 text-muted hover:text-heading transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom">
              <input className={inputCls} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="Marie" />
            </Field>
            <Field label="Nom *">
              <input className={inputCls} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Dupont" />
            </Field>
          </div>
          <Field label="Email">
            <input className={inputCls} type="email" value={form.primary_email} onChange={(e) => set("primary_email", e.target.value)} placeholder="marie.dupont@entreprise.com" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Téléphone">
              <input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+33 6 …" />
            </Field>
            <Field label="LinkedIn">
              <input className={inputCls} value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="linkedin.com/in/…" />
            </Field>
          </div>
          <Field label="Entreprise">
            <select className={selectCls} value={form.company_id} onChange={(e) => set("company_id", e.target.value)}>
              <option value="">— Aucune entreprise —</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fonction">
              <input className={inputCls} value={form.job_title} onChange={(e) => set("job_title", e.target.value)} placeholder="Directeur IT" />
            </Field>
            <Field label="Rôle relationnel">
              <select className={selectCls} value={form.relationship_role} onChange={(e) => set("relationship_role", e.target.value)}>
                <option value="">— Aucun —</option>
                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-6 py-4 bg-canvas/30">
          <button onClick={onClose} className="rounded border border-border px-4 py-2 text-xs font-semibold text-body hover:bg-canvas/60 transition-colors">Annuler</button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={pending} className="rounded bg-primary px-4 py-2 text-xs font-semibold text-primary-fg hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {pending ? "Enregistrement…" : initial ? "Mettre à jour" : "Créer le contact"}
          </button>
        </div>
      </SurfaceCard>
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
      <SurfaceCard className="w-full max-w-sm p-6 shadow-2xl border border-border animate-in zoom-in-95 duration-200 flex flex-col gap-4">
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
//  Study Details Modal
// ─────────────────────────────────────────────────────────────────────────────

function StudyDetailsModal({ study, onClose }: { study: StudyRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <SurfaceCard className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-border animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between border-b border-border/60 px-6 py-5 bg-canvas/30">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold font-heading text-heading">{study.companyName}</h2>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">Score IA: {formatScore(study.score)}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{study.sector} · {study.segment}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-canvas/80 text-muted hover:text-heading transition-colors" aria-label="Fermer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 font-heading">Synthèse de l&apos;Étude</h3>
            <p className="text-sm leading-relaxed text-body bg-canvas/30 rounded border border-border/40 p-4 font-normal">{study.summary}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded border border-border/40 p-4 bg-canvas/10">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 font-heading">Indicateurs de Croissance</h4>
              <p className="text-xs leading-relaxed text-body font-medium">{study.growthTrend}</p>
            </div>
            <div className="rounded border border-border/40 p-4 bg-canvas/10">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 font-heading">Maturité Digitale</h4>
              <p className="text-xs leading-relaxed text-body font-medium">{study.digitalMaturity}</p>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 font-heading">Contexte & Tendances Sectorielles</h3>
            <p className="text-xs leading-relaxed text-body bg-canvas/10 rounded border border-border/40 p-3">{study.sectorTrends}</p>
          </div>
          {study.competitors && study.competitors.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 font-heading">Concurrents Identifiés</h3>
              <div className="flex flex-wrap gap-1.5">
                {study.competitors.map((comp, idx) => (
                  <span key={idx} className="inline-flex items-center rounded border border-border bg-canvas px-2.5 py-1 text-xs text-body font-medium">{comp}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end border-t border-border/60 px-6 py-4 bg-canvas/30">
          <button onClick={onClose} className="rounded bg-primary px-4 py-2 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary/95">Fermer l&apos;étude</button>
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
  onOpenStudy,
  onEdit,
  onDelete,
}: {
  accounts: AccountRow[]
  studies: StudyRow[]
  onOpenStudy: (id: string) => void
  onEdit: (account: AccountRow) => void
  onDelete: (account: AccountRow) => void
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
              <th className="px-3 py-3">Localisation</th>
              <th className="px-3 py-3 text-right">Contacts</th>
              <th className="px-3 py-3 text-right">Score</th>
              <th className="px-3 py-3 text-center">Priorité</th>
              <th className="px-3 py-3 text-center">Statut</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {accounts.map((account) => {
              const hasStudy = studies.some((s) => s.id === account.id)
              return (
                <tr key={account.id} className="transition-colors hover:bg-canvas/40">
                  <td className="max-w-[200px] px-5 py-3">
                    <div className="font-semibold text-heading">{account.name}</div>
                    <div className="truncate text-[11px] text-muted">{account.website ?? "Site non renseigné"}</div>
                  </td>
                  <td className="px-3 py-3 text-body">{account.sector}</td>
                  <td className="px-3 py-3 text-body">{account.location}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-heading">{account.contactCount}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-heading">{formatScore(account.score)}</td>
                  <td className="px-3 py-3 text-center"><PriorityBadge priority={account.priority} /></td>
                  <td className="px-3 py-3 text-center text-[11px] text-body capitalize">{account.status.replace("_", " ")}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {hasStudy && (
                        <button onClick={() => onOpenStudy(account.id)} className="rounded bg-primary/10 border border-primary/20 px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20">
                          Étude
                        </button>
                      )}
                      <button onClick={() => onEdit(account)} className="rounded p-1.5 text-muted hover:bg-canvas/80 hover:text-heading transition-colors" title="Modifier">
                        <IconEdit />
                      </button>
                      <button onClick={() => onDelete(account)} className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-500 transition-colors" title="Supprimer">
                        <IconTrash />
                      </button>
                    </div>
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
  studies,
  onOpenStudy,
  onEdit,
  onDelete,
}: {
  accounts: AccountRow[]
  studies: StudyRow[]
  onOpenStudy: (id: string) => void
  onEdit: (account: AccountRow) => void
  onDelete: (account: AccountRow) => void
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
              <div className="flex gap-2">
                <button onClick={() => onEdit(account)} className="flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs font-semibold text-body hover:bg-canvas/60 transition-colors">
                  <IconEdit /> Modifier
                </button>
                <button onClick={() => onDelete(account)} className="flex items-center gap-1 rounded border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors">
                  <IconTrash /> Supprimer
                </button>
              </div>
              {hasStudy && (
                <button onClick={() => onOpenStudy(account.id)} className="rounded bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
                  Étude
                </button>
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

function ContactsDesktop({
  contacts,
  onEdit,
  onDelete,
}: {
  contacts: ContactRow[]
  onEdit: (contact: ContactRow) => void
  onDelete: (contact: ContactRow) => void
}) {
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
              <th className="px-3 py-3">Fonction</th>
              <th className="px-3 py-3">Rôle</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {contacts.map((contact) => (
              <tr key={contact.id} className="transition-colors hover:bg-canvas/40">
                <td className="px-5 py-3 font-semibold text-heading">{contact.fullName}</td>
                <td className="px-3 py-3 text-body">{contact.companyName}</td>
                <td className="max-w-[240px] truncate px-3 py-3 text-body">{contact.jobTitle || "—"}</td>
                <td className="px-3 py-3 text-body capitalize">{contact.relationshipRole?.replace("_", " ") ?? "—"}</td>
                <td className="px-5 py-3 text-body">{contact.email ?? "—"}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onEdit(contact)} className="rounded p-1.5 text-muted hover:bg-canvas/80 hover:text-heading transition-colors" title="Modifier">
                      <IconEdit />
                    </button>
                    <button onClick={() => onDelete(contact)} className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-500 transition-colors" title="Supprimer">
                      <IconTrash />
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
  onEdit,
  onDelete,
}: {
  contacts: ContactRow[]
  onEdit: (contact: ContactRow) => void
  onDelete: (contact: ContactRow) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {contacts.map((contact) => (
        <SurfaceCard key={contact.id} className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-heading">{contact.fullName}</h2>
              <p className="mt-1 text-xs text-body">{contact.jobTitle || "Fonction non renseignée"}</p>
              <p className="mt-1 text-xs font-semibold text-primary">{contact.companyName}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
            <span className="rounded border border-border bg-canvas px-2 py-1">{contact.companySector}</span>
            {contact.email && <span className="rounded border border-border bg-canvas px-2 py-1">Email OK</span>}
            {contact.phone && <span className="rounded border border-border bg-canvas px-2 py-1">Tel OK</span>}
            {contact.relationshipRole && (
              <span className="rounded border border-border bg-canvas px-2 py-1 capitalize">{contact.relationshipRole.replace("_", " ")}</span>
            )}
          </div>
          <div className="mt-3 flex gap-2 border-t border-border/40 pt-2">
            <button onClick={() => onEdit(contact)} className="flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs font-semibold text-body hover:bg-canvas/60 transition-colors">
              <IconEdit /> Modifier
            </button>
            <button onClick={() => onDelete(contact)} className="flex items-center gap-1 rounded border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors">
              <IconTrash /> Supprimer
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

export function ProspectionAccountsView({
  data,
  device,
}: {
  data: AccountsContactsData
  device: DashboardDevice
}) {
  const router = useRouter()
  const [subTab, setSubTab] = useState<"accounts" | "contacts">("accounts")
  const [selectedStudy, setSelectedStudy] = useState<StudyRow | null>(null)

  // Company modal
  const [companyModal, setCompanyModal] = useState<{ open: boolean; editing?: AccountRow }>({ open: false })
  // Contact modal
  const [contactModal, setContactModal] = useState<{ open: boolean; editing?: ContactRow }>({ open: false })
  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()

  const handleOpenStudy = (companyId: string) => {
    const study = data.studies.find((s) => s.id === companyId)
    if (study) setSelectedStudy(study)
  }

  const refreshData = () => router.refresh()

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
        <div className="flex items-center gap-2 shrink-0">
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
        </div>
      </div>

      {/* Sub-tab selection */}
      <div className="flex gap-2 border-b border-border pb-3">
        <button
          onClick={() => setSubTab("accounts")}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
            subTab === "accounts" ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:text-heading hover:bg-canvas/50"
          )}
        >
          Comptes ({data.stats.companies})
        </button>
        <button
          onClick={() => setSubTab("contacts")}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
            subTab === "contacts" ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:text-heading hover:bg-canvas/50"
          )}
        >
          Contacts ({data.stats.contacts})
        </button>
      </div>

      {/* Dynamic Views */}
      {subTab === "accounts" && (
        device === "mobile" ? (
          <AccountsMobile
            accounts={data.accounts}
            studies={data.studies}
            onOpenStudy={handleOpenStudy}
            onEdit={(a) => setCompanyModal({ open: true, editing: a })}
            onDelete={(a) => setDeleteTarget({ kind: "company", item: a })}
          />
        ) : (
          <AccountsDesktop
            accounts={data.accounts}
            studies={data.studies}
            onOpenStudy={handleOpenStudy}
            onEdit={(a) => setCompanyModal({ open: true, editing: a })}
            onDelete={(a) => setDeleteTarget({ kind: "company", item: a })}
          />
        )
      )}

      {subTab === "contacts" && (
        device === "mobile" ? (
          <ContactsMobile
            contacts={data.contacts}
            onEdit={(c) => setContactModal({ open: true, editing: c })}
            onDelete={(c) => setDeleteTarget({ kind: "contact", item: c })}
          />
        ) : (
          <ContactsDesktop
            contacts={data.contacts}
            onEdit={(c) => setContactModal({ open: true, editing: c })}
            onDelete={(c) => setDeleteTarget({ kind: "contact", item: c })}
          />
        )
      )}

      {/* Modals */}
      {companyModal.open && (
        <CompanyFormModal
          initial={companyModal.editing}
          onClose={() => setCompanyModal({ open: false })}
          onSuccess={refreshData}
        />
      )}

      {contactModal.open && (
        <ContactFormModal
          initial={contactModal.editing}
          accounts={data.accounts}
          onClose={() => setContactModal({ open: false })}
          onSuccess={refreshData}
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

      {selectedStudy && (
        <StudyDetailsModal study={selectedStudy} onClose={() => setSelectedStudy(null)} />
      )}

      {device === "desktop" && (
        <div className="flex items-center justify-between rounded border border-border bg-surface px-5 py-4 text-xs text-muted mt-2">
          <span>Données issues de la Prospection Intelligence · Analyse et RAG actifs.</span>
        </div>
      )}
    </div>
  )
}

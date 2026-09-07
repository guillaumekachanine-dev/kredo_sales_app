"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { formatEuro, formatPct } from "@/lib/formatters"
import type { MissionSummary } from "@/components/missions/mission-detail/mission-detail-types"
import {
  computeAnnualContractValueThroughYearEnd,
  computeEstimatedContractValue,
  computeTheoreticalMarginPct,
} from "@/components/missions/mission-detail/mission-detail-utils"
import type {
  EngagementMissionContact,
  EngagementMissionDetail,
} from "@/app/(app)/missions/_data/get-engagement-mission-detail"
import { ContactRoundIcon, WalletCardsIcon } from "./engagement-icons"
import { ViewProfileButton } from "./ViewProfileButton"
import { Button } from "@/components/ui/Button"
import { AppDialog } from "@/components/ui/AppDialog"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { AgendaEventDrawer, type AgendaEventDrawerInitialValues } from "@/components/agenda/AgendaEventDrawer"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { cn } from "@/lib/utils"
import { addMissionContact, removeMissionContact } from "@/app/(app)/missions/_actions/mission-contacts"
import {
  MISSION_CONTACT_ROLES,
  type MissionContactRole,
} from "./mission-contact-constants"

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

function toMissionSummary(m: EngagementMissionDetail["mission"]): MissionSummary {
  return {
    id: m.id,
    title: m.title,
    status: m.status,
    start_date: m.startDate,
    end_date: m.endDate,
    role_title: m.roleTitle,
    practice: m.practice,
    seniority: m.seniority,
    tjm: m.tjm,
    cjm: m.cjm,
    gross_margin_pct: m.grossMarginPct,
    billing_condition: m.billingCondition,
    description: m.description,
    metadata: {},
    opportunity_id: null,
    collaborator_id: "",
    company_id: "",
    external_ref: m.externalRef,
  }
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-heading">
      <span className="size-3.5 text-primary">{icon}</span>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.08em]">{children}</h3>
    </div>
  )
}

function DataRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[11px] text-muted">{label}</span>
      <span
        className={
          strong
            ? "text-right font-mono text-xs font-semibold tabular-nums text-heading"
            : "text-right font-mono text-xs tabular-nums text-heading"
        }
      >
        {value}
      </span>
    </div>
  )
}

function CoordinateCopyModal({
  title,
  value,
  onClose,
  isUrl = false,
}: {
  title?: string
  value: string
  onClose: () => void
  isUrl?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[320px]">
        <SurfaceCard className="w-full p-4 border border-border/80 animate-in zoom-in-95 duration-200 flex flex-col gap-3 relative bg-surface">
          {title && (
            <p className="text-xs font-bold uppercase tracking-wider text-muted text-center">{title}</p>
          )}
          <div className="bg-canvas/50 border border-border/50 rounded-lg p-3 text-center">
            <span className="text-sm font-bold text-heading break-all select-all">{value}</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "flex-1 min-h-[44px] rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5",
                copied
                  ? "bg-success text-success-fg"
                  : "bg-primary text-primary-fg hover:bg-primary/90"
              )}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copié !
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Copier
                </>
              )}
            </button>

            {isUrl && (
              <a
                href={value.startsWith("http") ? value : `https://${value}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-canvas px-3 text-xs font-semibold text-heading hover:bg-surface-hover"
              >
                Ouvrir
              </a>
            )}
          </div>
        </SurfaceCard>
      </div>
    </div>
  )
}

export function MissionDetailsRail({ detail }: { detail: EngagementMissionDetail }) {
  const router = useRouter()
  const { mission, collaborator } = detail

  // Contacts state
  const [prevDetail, setPrevDetail] = useState(detail)
  const [contactsList, setContactsList] = useState<EngagementMissionContact[]>(() => {
    return detail.contacts?.length
      ? detail.contacts
      : detail.operationalContact
      ? [detail.operationalContact]
      : []
  })

  if (prevDetail !== detail) {
    setPrevDetail(detail)
    setContactsList(
      detail.contacts?.length
        ? detail.contacts
        : detail.operationalContact
        ? [detail.operationalContact]
        : []
    )
  }

  // Mini-modal state
  const [contactsModalOpen, setContactsModalOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState("")
  const [selectedRole, setSelectedRole] = useState<MissionContactRole>("Manager opérationnel")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const availableCompanyContacts = (detail.companyContacts || []).filter(
    (cc) => !contactsList.some((c) => c.id === cc.id)
  )

  const handleAddContact = async () => {
    if (!selectedContactId) return
    setIsSubmitting(true)
    setErrorMessage(null)

    const res = await addMissionContact({
      missionId: mission.id,
      contactId: selectedContactId,
      role: selectedRole,
    })

    if (res.error) {
      setErrorMessage(res.error)
      setIsSubmitting(false)
      return
    }

    const target = detail.companyContacts?.find((c) => c.id === selectedContactId)
    if (target) {
      const newEntry: EngagementMissionContact = {
        id: target.id,
        fullName: target.fullName,
        jobTitle: target.jobTitle,
        missionRole: selectedRole,
        role: selectedRole,
        email: target.email,
        phone: target.phone,
      }
      setContactsList((prev) => [...prev.filter((c) => c.id !== target.id), newEntry])
    }

    setIsAdding(false)
    setSelectedContactId("")
    setSelectedRole("Manager opérationnel")
    setIsSubmitting(false)
    router.refresh()
  }

  const handleRemoveContact = async (contactId: string) => {
    setIsSubmitting(true)
    setErrorMessage(null)

    const res = await removeMissionContact({
      missionId: mission.id,
      contactId,
    })

    if (res.error) {
      setErrorMessage(res.error)
      setIsSubmitting(false)
      return
    }

    setContactsList((prev) => prev.filter((c) => c.id !== contactId))
    setIsSubmitting(false)
    router.refresh()
  }

  const marginPct = mission.cjm > 0 ? computeTheoreticalMarginPct(toMissionSummary(mission)) : null

  const hasEnd = Boolean(mission.endDate)
  const missionSummary = toMissionSummary(mission)
  const contractValue = hasEnd
    ? computeEstimatedContractValue(missionSummary)
    : computeAnnualContractValueThroughYearEnd(missionSummary)
  const contractValueLabel = hasEnd ? "TCV estimé" : "Projection CA à fin d’année"

  // Event Drawer state
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false)
  const [eventInitialValues, setEventInitialValues] = useState<AgendaEventDrawerInitialValues | undefined>()

  // Copy modal state for contact coordinates
  const [copyModalState, setCopyModalState] = useState<{ title: string; value: string; isUrl?: boolean } | null>(null)

  return (
    <>
      <aside
        className="engagements-scrollbar min-h-0 overflow-y-auto border-l border-border bg-surface"
        aria-label="Détails de la mission"
      >
        <div className="divide-y divide-border px-4">
          {/* ── Collaborateur ─────────────────────────────────────── */}
          <section className="py-4">
            {collaborator ? (
              <div>
                <div className="flex flex-col items-center text-center">
                  <span className="flex size-14 items-center justify-center rounded-full bg-primary/[0.09] font-heading text-lg font-bold text-primary">
                    {initials(collaborator.fullName)}
                  </span>
                  <p className="mt-2.5 text-sm font-bold text-heading">{collaborator.fullName}</p>
                  <p className="mt-0.5 text-xs text-body">
                    {collaborator.currentTitle || "Profil non renseigné"}
                  </p>
                  {collaborator.practice ? (
                    <p className="mt-0.5 text-xs text-muted">
                      {collaborator.practice}
                    </p>
                  ) : null}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      openCommunicationComposer({
                        origin: "consultant",
                        scope: "collaborator",
                        collaboratorId: collaborator.id,
                        primaryEntity: { type: "collaborator", id: collaborator.id },
                      })
                    }}
                  >
                    Contacter
                  </Button>
                  <ViewProfileButton collaboratorId={collaborator.id} />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted">Aucun collaborateur affecté</p>
            )}
          </section>

          {/* ── Conditions financières ────────────────────────────── */}
          <section className="py-4">
            <SectionTitle icon={<WalletCardsIcon />}>Conditions financières</SectionTitle>
            <div>
              <DataRow label="Coût journalier (CJM)" value={mission.cjm > 0 ? formatEuro(mission.cjm) : "—"} />
              <DataRow label="Prix de vente (TJM)" value={formatEuro(mission.tjm)} strong />
              <DataRow label="Taux de marge" value={marginPct === null ? "—" : formatPct(marginPct)} />
              <DataRow
                label={contractValueLabel}
                value={contractValue === null ? "—" : formatEuro(contractValue)}
                strong
              />
            </div>
          </section>

          {/* ── Contact client ────────────────────────────────────── */}
          <section className="py-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-heading">
                <span className="size-3.5 text-primary">
                  <ContactRoundIcon />
                </span>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.08em]">Contact client</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setContactsModalOpen(true)
                  setIsAdding(false)
                  setSelectedContactId("")
                  setSelectedRole("Manager opérationnel")
                  setErrorMessage(null)
                }}
                className="inline-flex size-6 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-heading transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Gérer les contacts de la mission"
                aria-label="Gérer les contacts de la mission"
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>

            {contactsList.length > 0 ? (
              <div className="space-y-4">
                {contactsList.map((contact) => (
                  <div key={contact.id} className="space-y-3">
                    {/* Cadre au fond bleu cobalt */}
                    <div className="flex flex-col gap-2 rounded-[var(--radius-medium)] border border-primary/20 bg-primary p-3.5 text-white">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/15 font-heading text-xs font-extrabold text-white">
                          {initials(contact.fullName)}
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* 1. Nom du contact */}
                          <p className="truncate text-sm font-bold text-white">{contact.fullName}</p>
                          {/* 2. Fonction */}
                          {contact.jobTitle ? (
                            <p className="truncate text-[11px] font-medium text-white/90">
                              {contact.jobTitle}
                            </p>
                          ) : null}
                          {/* 3. Rôle sur la mission */}
                          {contact.missionRole ? (
                            <p className="truncate text-[11px] font-medium text-white/80">
                              {contact.missionRole}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* 4. Téléphone (et e-mail) */}
                      {(contact.phone || contact.email) && (
                        <div className="flex items-center gap-4 pt-1.5 border-t border-white/15 text-white/90">
                          {contact.phone && (
                            <button
                              type="button"
                              onClick={() => setCopyModalState({ title: "Téléphone", value: contact.phone! })}
                              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/90 hover:text-white transition-colors focus:outline-none"
                              title="Voir / copier le téléphone"
                            >
                              <svg className="size-3.5 shrink-0 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span className="truncate max-w-[120px]">{contact.phone}</span>
                            </button>
                          )}

                          {contact.email && (
                            <button
                              type="button"
                              onClick={() => setCopyModalState({ title: "E-mail", value: contact.email! })}
                              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/90 hover:text-white transition-colors focus:outline-none min-w-0"
                              title="Voir / copier l'e-mail"
                            >
                              <svg className="size-3.5 shrink-0 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="truncate">{contact.email}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Deux boutons sous le cadre : Contacter (gauche) et Planifier (droite) */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          openCommunicationComposer({
                            origin: "contact",
                            companyId: detail.company?.id ?? null,
                            companyName: detail.company?.name ?? null,
                            contactId: contact.id,
                            primaryEntity: { type: "contact", id: contact.id },
                          })
                        }}
                      >
                        Contacter
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          setEventInitialValues({
                            title: `Échange · ${contact.fullName}`,
                            event_type: "rdv_prospection",
                            company: detail.company ? { id: detail.company.id, name: detail.company.name, isNew: false } : null,
                            contact_id: contact.id,
                          })
                          setEventDrawerOpen(true)
                        }}
                      >
                        Planifier
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">Aucun contact client associé</p>
            )}
          </section>
        </div>
      </aside>

      {/* Mini-modale : Contacts client de la mission */}
      <AppDialog
        open={contactsModalOpen}
        onOpenChange={(open) => {
          setContactsModalOpen(open)
          if (!open) {
            setIsAdding(false)
            setSelectedContactId("")
            setErrorMessage(null)
          }
        }}
        title="Contacts client de la mission"
        className="max-w-lg"
      >
        <div className="space-y-4 py-2">
          {/* Liste des contacts déjà associés */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Contacts associés ({contactsList.length})
            </p>
            {contactsList.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted">
                Aucun contact associé pour le moment.
              </p>
            ) : (
              <div className="space-y-2">
                {contactsList.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface p-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-xs font-bold text-heading">
                          {contact.fullName}
                        </span>
                        {contact.missionRole ? (
                          <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {contact.missionRole}
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-[11px] text-body">
                        {contact.jobTitle || <span className="text-muted italic">Fonction non renseignée</span>}
                      </p>
                      {contact.phone ? (
                        <p className="flex items-center gap-1.5 text-[11px] text-muted">
                          <svg
                            className="size-3 text-muted shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          <span>{contact.phone}</span>
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleRemoveContact(contact.id)}
                      className="shrink-0 rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger transition-colors focus:outline-none"
                      title="Supprimer de la mission"
                      aria-label={`Supprimer ${contact.fullName} de la mission`}
                    >
                      <svg
                        className="size-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulaire ou bouton d'ajout */}
          {!isAdding ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(true)
                  setSelectedContactId("")
                  setSelectedRole("Manager opérationnel")
                  setErrorMessage(null)
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline focus:outline-none"
              >
                <span className="text-sm leading-none">+</span>
                <span>Ajouter un contact</span>
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-canvas/60 p-3.5 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Associer un contact à la mission
              </p>

              {availableCompanyContacts.length === 0 ? (
                <p className="text-xs text-muted">
                  Tous les contacts connus de ce compte sont déjà associés à la mission.
                </p>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="modal-select-contact"
                      className="block text-[11px] font-semibold text-heading mb-1"
                    >
                      Contact client
                    </label>
                    <select
                      id="modal-select-contact"
                      value={selectedContactId}
                      onChange={(e) => setSelectedContactId(e.target.value)}
                      className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-heading focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Sélectionner un contact du compte...</option>
                      {availableCompanyContacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} {c.jobTitle ? `(${c.jobTitle})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedContactId ? (
                    <div>
                      <label
                        htmlFor="modal-select-role"
                        className="block text-[11px] font-semibold text-heading mb-1"
                      >
                        Rôle sur cette mission
                      </label>
                      <select
                        id="modal-select-role"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as MissionContactRole)}
                        className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-heading focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {MISSION_CONTACT_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </>
              )}

              {errorMessage ? <p className="text-xs text-danger">{errorMessage}</p> : null}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAdding(false)
                    setSelectedContactId("")
                    setErrorMessage(null)
                  }}
                >
                  Annuler
                </Button>
                {availableCompanyContacts.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!selectedContactId || isSubmitting}
                    onClick={handleAddContact}
                  >
                    {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </AppDialog>

      <AgendaEventDrawer
        open={eventDrawerOpen}
        onOpenChange={setEventDrawerOpen}
        event={null}
        onSaved={() => {}}
        initialValues={eventInitialValues}
      />

      {copyModalState && (
        <CoordinateCopyModal
          title={copyModalState.title}
          value={copyModalState.value}
          isUrl={copyModalState.isUrl}
          onClose={() => setCopyModalState(null)}
        />
      )}
    </>
  )
}

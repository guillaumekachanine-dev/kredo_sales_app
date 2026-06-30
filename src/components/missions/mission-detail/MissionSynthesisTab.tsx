"use client"

import { useState } from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { AppDialog } from "@/components/ui/AppDialog"
import { ContactIdentityDrawer } from "@/components/accounts-contacts/ContactIdentityDrawer"
import { formatDate, formatEuro, formatDateNumeric } from "@/lib/formatters"
import { updateMission } from "@/app/(app)/missions/_actions/update-mission"
import { cn } from "@/lib/utils"
import type { MissionDetailViewModel } from "./mission-detail-types"
import {
  getMissionDurationMonths,
  getYearsSince,
  computeRealMarginPct,
} from "./mission-detail-utils"

const PRACTICE_OPTIONS = [
  "Data Intelligence & Artificial Intelligence",
  "Digital & Cloud Engineering",
  "Agile & Project Management",
  "Cybersecurity",
  "QA & Testing",
]

const SENIORITY_OPTIONS = ["Junior", "Confirmé", "Senior", "Expert", "Lead", "Architecte"]

interface MissionSynthesisTabProps {
  vm: MissionDetailViewModel
  onRefresh: () => void
}

export function MissionSynthesisTab({ vm, onRefresh }: MissionSynthesisTabProps) {
  const { mission, company, collaborator, contacts, activityReports, interactions } = vm

  const meta = (mission.metadata || {}) as Record<string, unknown>
  const collaboratorName =
    collaborator?.person?.full_name ||
    `${collaborator?.person?.first_name || ""} ${collaborator?.person?.last_name || ""}`.trim() ||
    "Consultant non renseigné"

  const durationMonths = getMissionDurationMonths(mission.start_date, mission.end_date)
  const realMarginPct = computeRealMarginPct(activityReports)

  const lastInteraction = interactions[0] ?? null
  const nextTask = (meta.next_task as string) || null
  const toAnticipate = (meta.to_anticipate as string) || null
  const contratUrl = (meta.contrat_url as string) || null
  const odm = (meta.ordre_de_mission as string) || null
  const paymentTerms = (meta.payment_terms as string) || null

  // ─── Edit synthèse dialog ────────────────────────────────────────────────────
  const [showEditSynthese, setShowEditSynthese] = useState(false)
  const [editTitle, setEditTitle] = useState(mission.title)
  const [editPractice, setEditPractice] = useState(mission.practice || collaborator?.practice || "")
  const [editSeniority, setEditSeniority] = useState(mission.seniority || collaborator?.seniority || "")
  const [editDescription, setEditDescription] = useState((meta.description as string) || "")
  const [editProject, setEditProject] = useState((meta.project as string) || (meta.projet as string) || "")
  const [isSavingSynthese, setIsSavingSynthese] = useState(false)

  const openEditSynthese = () => {
    setEditTitle(mission.title)
    setEditPractice(mission.practice || collaborator?.practice || "")
    setEditSeniority(mission.seniority || collaborator?.seniority || "")
    setEditDescription((meta.description as string) || "")
    setEditProject((meta.project as string) || (meta.projet as string) || "")
    setShowEditSynthese(true)
  }

  const handleSaveSynthese = async () => {
    setIsSavingSynthese(true)
    const res = await updateMission({
      id: mission.id,
      title: editTitle,
      practice: editPractice || null,
      seniority: editSeniority || null,
      metadata: {
        description: editDescription,
        project: editProject,
      },
    })
    setIsSavingSynthese(false)
    if (res.error) {
      alert(res.error)
    } else {
      setShowEditSynthese(false)
      onRefresh()
    }
  }

  // ─── Edit activité dialog ────────────────────────────────────────────────────
  const [showEditActivite, setShowEditActivite] = useState(false)
  const [editNextTask, setEditNextTask] = useState(nextTask || "")
  const [editToAnticipate, setEditToAnticipate] = useState(toAnticipate || "")
  const [isSavingActivite, setIsSavingActivite] = useState(false)

  const openEditActivite = () => {
    setEditNextTask((meta.next_task as string) || "")
    setEditToAnticipate((meta.to_anticipate as string) || "")
    setShowEditActivite(true)
  }

  const handleSaveActivite = async () => {
    setIsSavingActivite(true)
    const res = await updateMission({
      id: mission.id,
      metadata: { next_task: editNextTask, to_anticipate: editToAnticipate },
    })
    setIsSavingActivite(false)
    if (res.error) {
      alert(res.error)
    } else {
      setShowEditActivite(false)
      onRefresh()
    }
  }

  // ─── Contact drawer ──────────────────────────────────────────────────────────
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [showContactDrawer, setShowContactDrawer] = useState(false)

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main column (2/3) */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* KPIs synthétiques */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SurfaceCard className="!p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                Démarrage
              </span>
              <span className="text-base font-bold font-mono text-heading leading-snug">
                {mission.start_date ? formatDateNumeric(mission.start_date) : "—"}
              </span>
            </SurfaceCard>
            <SurfaceCard className="!p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                TJM
              </span>
              <span className="text-2xl font-bold font-mono text-heading">
                {formatEuro(mission.tjm)}
              </span>
            </SurfaceCard>
            <SurfaceCard className="!p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                Marge réelle
              </span>
              <span
                className={cn(
                  "text-2xl font-bold font-mono",
                  realMarginPct !== null && realMarginPct >= 25
                    ? "text-success"
                    : realMarginPct !== null && realMarginPct >= 15
                    ? "text-warning"
                    : realMarginPct !== null
                    ? "text-danger"
                    : "text-muted"
                )}
              >
                {realMarginPct !== null ? `${realMarginPct.toFixed(0)}%` : "—"}
              </span>
            </SurfaceCard>
            <SurfaceCard className="!p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                Durée
              </span>
              <span className="text-2xl font-bold font-mono text-heading">
                {durationMonths !== null ? `${durationMonths} mois` : "Indéterminée"}
              </span>
            </SurfaceCard>
          </div>

          {/* Mission description */}
          <SurfaceCard className="p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-bold text-heading">Description & Périmètre</h3>
              <button
                type="button"
                onClick={openEditSynthese}
                className="text-[10px] font-semibold text-primary hover:underline shrink-0"
              >
                Modifier
              </button>
            </div>

            {/* Company context strip */}
            {company && (company.sector || company.segment || company.hq_location) && (
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {company.sector && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                      Secteur
                    </span>
                    <span className="text-xs font-semibold text-heading">{company.sector}</span>
                  </div>
                )}
                {company.segment && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                      Segment
                    </span>
                    <span className="text-xs font-semibold text-heading">{company.segment}</span>
                  </div>
                )}
                {company.hq_location && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                      Siège
                    </span>
                    <span className="text-xs font-semibold text-heading">{company.hq_location}</span>
                  </div>
                )}
              </div>
            )}

            {/* Skills chips */}
            {collaborator?.skills && collaborator.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {collaborator.skills.slice(0, 12).map((s) => (
                  <span
                    key={s.id}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-canvas border border-border/60 text-body"
                  >
                    {s.skill.name}
                  </span>
                ))}
                {collaborator.skills.length > 12 && (
                  <span className="text-[10px] text-muted px-2 py-0.5">
                    +{collaborator.skills.length - 12}
                  </span>
                )}
              </div>
            )}

            {/* Description text */}
            {mission.description || (meta.description as string) ? (
              <p className="text-sm text-body leading-relaxed">
                {(meta.description as string) || mission.description}
              </p>
            ) : (
              <p className="text-xs text-muted italic">Aucune description renseignée.</p>
            )}

            {/* Mission metadata row */}
            <div className="pt-4 border-t border-border/40 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
              {mission.practice && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                    Practice
                  </span>
                  <span className="text-xs font-semibold text-heading">{mission.practice}</span>
                </div>
              )}
              {mission.role_title && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                    Rôle
                  </span>
                  <span className="text-xs font-semibold text-heading">{mission.role_title}</span>
                </div>
              )}
              {mission.seniority && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                    Séniorité
                  </span>
                  <span className="text-xs font-semibold text-heading">{mission.seniority}</span>
                </div>
              )}
              {(editProject || (meta.project as string)) && (
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                    Projet / Référence interne
                  </span>
                  <span className="text-xs font-semibold text-heading">
                    {(meta.project as string) || (meta.projet as string)}
                  </span>
                </div>
              )}
              {mission.end_date && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                    Fin prévue
                  </span>
                  <span className="text-xs font-semibold text-heading">
                    {formatDateNumeric(mission.end_date)}
                  </span>
                </div>
              )}
            </div>
          </SurfaceCard>

          {/* Contacts client */}
          {contacts.length > 0 && (
            <SurfaceCard className="p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-heading">Interlocuteurs client</h3>
              <div className="flex flex-col gap-2">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 py-1.5"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {contact.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedContactId(contact.id)
                          setShowContactDrawer(true)
                        }}
                        className="text-sm font-semibold text-heading hover:text-primary transition-colors text-left"
                      >
                        {contact.fullName}
                      </button>
                      {contact.role && (
                        <p className="text-[10px] text-muted font-medium">{contact.role}</p>
                      )}
                    </div>
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-[10px] text-muted hover:text-primary transition-colors"
                        title={contact.email}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </SurfaceCard>
          )}

          {/* Activité récente / Prochaine action */}
          <SurfaceCard className="p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-bold text-heading">Suivi & prochaine action</h3>
              <button
                type="button"
                onClick={openEditActivite}
                className="text-[10px] font-semibold text-primary hover:underline shrink-0"
              >
                Modifier
              </button>
            </div>

            {(nextTask || toAnticipate) ? (
              <div className="flex flex-col gap-3">
                {nextTask && (
                  <div className="p-2.5 rounded bg-primary/5 border border-primary/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary block mb-1">
                      Prochaine action
                    </span>
                    <p className="text-xs text-body leading-relaxed">{nextTask}</p>
                  </div>
                )}
                {toAnticipate && (
                  <div className="p-2.5 rounded bg-canvas border border-border/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                      À anticiper
                    </span>
                    <p className="text-xs text-body leading-relaxed">{toAnticipate}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted italic">Aucune action planifiée.</p>
            )}

            {lastInteraction && (
              <div className="pt-4 border-t border-border/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-2">
                  Dernière interaction
                </span>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-muted font-mono shrink-0 mt-0.5">
                    {formatDate(lastInteraction.occurred_at)}
                  </span>
                  <p className="text-xs text-body leading-relaxed">
                    {lastInteraction.summary || lastInteraction.type}
                  </p>
                </div>
              </div>
            )}
          </SurfaceCard>
        </div>

        {/* Side column (1/3) */}
        <div className="flex flex-col gap-5">
          {/* Collaborator quick view */}
          <SurfaceCard className="p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-heading">Consultant affecté</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">
                  {collaboratorName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-heading truncate">{collaboratorName}</p>
                {(collaborator?.current_title || collaborator?.seniority) && (
                  <p className="text-[10px] text-muted">
                    {collaborator.current_title || collaborator.seniority}
                  </p>
                )}
              </div>
            </div>
            {collaborator?.entry_date && (
              <p className="text-[10px] text-muted">
                Intégration :{" "}
                <span className="text-body font-medium">
                  {formatDate(collaborator.entry_date)}{" "}
                  ({getYearsSince(collaborator.entry_date)})
                </span>
              </p>
            )}
            {collaborator?.employee_ref && (
              <p className="text-[10px] text-muted mt-1">
                Matricule :{" "}
                <span className="text-body font-mono font-medium">{collaborator.employee_ref}</span>
              </p>
            )}
          </SurfaceCard>

          {/* Documents */}
          <SurfaceCard className="p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-heading">Documents & accès</h3>
            <div className="flex flex-col gap-2">
              {contratUrl ? (
                <a
                  href={contratUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Contrat client
                </a>
              ) : (
                <span className="flex items-center gap-2 text-xs text-muted">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Contrat — non renseigné
                </span>
              )}
              {odm ? (
                <a
                  href={odm}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                  Ordre de mission
                </a>
              ) : (
                <span className="flex items-center gap-2 text-xs text-muted">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                  Ordre de mission — non renseigné
                </span>
              )}
              {activityReports.length > 0 && (
                <span className="flex items-center gap-2 text-xs text-muted">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {`${activityReports.length} CRA — voir onglet Taux d'activité`}
                </span>
              )}
              {paymentTerms && (
                <div className="pt-2 border-t border-border/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Conditions de paiement
                  </span>
                  <span className="text-xs text-body">{paymentTerms}</span>
                </div>
              )}
            </div>
          </SurfaceCard>

        </div>
      </div>

      {/* Edit Synthèse dialog */}
      <AppDialog
        open={showEditSynthese}
        onOpenChange={setShowEditSynthese}
        title="Modifier la synthèse"
        description="Titre, practice, séniorité et description de la mission."
      >
        <div className="flex flex-col gap-4 mt-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
              Titre
            </label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-2.5 py-2 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
              placeholder="Titre de la mission"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                Practice
              </label>
              <select
                value={editPractice}
                onChange={(e) => setEditPractice(e.target.value)}
                className="w-full px-2.5 py-2 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
              >
                <option value="">— Sélectionner —</option>
                {PRACTICE_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                Séniorité
              </label>
              <select
                value={editSeniority}
                onChange={(e) => setEditSeniority(e.target.value)}
                className="w-full px-2.5 py-2 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
              >
                <option value="">— Sélectionner —</option>
                {SENIORITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
              Projet / Référence interne
            </label>
            <input
              value={editProject}
              onChange={(e) => setEditProject(e.target.value)}
              className="w-full px-2.5 py-2 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
              placeholder="Référence ou code projet"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
              Description
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full min-h-[100px] px-2.5 py-2 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50 leading-relaxed"
              placeholder="Contexte, périmètre et enjeux..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
            <button
              type="button"
              disabled={isSavingSynthese}
              onClick={() => setShowEditSynthese(false)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-canvas/50 text-heading transition-all"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={isSavingSynthese}
              onClick={handleSaveSynthese}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-white border border-primary hover:bg-primary/95 transition-all disabled:opacity-50"
            >
              {isSavingSynthese ? "Sauvegarde…" : "Sauvegarder"}
            </button>
          </div>
        </div>
      </AppDialog>

      {/* Edit Activité dialog */}
      <AppDialog
        open={showEditActivite}
        onOpenChange={setShowEditActivite}
        title="Modifier le suivi"
        description="Prochaine action et points à anticiper."
      >
        <div className="flex flex-col gap-4 mt-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
              Prochaine action
            </label>
            <textarea
              value={editNextTask}
              onChange={(e) => setEditNextTask(e.target.value)}
              className="w-full min-h-[80px] px-2.5 py-2 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50 leading-relaxed"
              placeholder="Action à mener..."
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
              À anticiper
            </label>
            <textarea
              value={editToAnticipate}
              onChange={(e) => setEditToAnticipate(e.target.value)}
              className="w-full min-h-[80px] px-2.5 py-2 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50 leading-relaxed"
              placeholder="Points de vigilance ou risques..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
            <button
              type="button"
              disabled={isSavingActivite}
              onClick={() => setShowEditActivite(false)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-canvas/50 text-heading transition-all"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={isSavingActivite}
              onClick={handleSaveActivite}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-white border border-primary hover:bg-primary/95 transition-all disabled:opacity-50"
            >
              {isSavingActivite ? "Sauvegarde…" : "Sauvegarder"}
            </button>
          </div>
        </div>
      </AppDialog>

      {/* Contact drawer */}
      <ContactIdentityDrawer
        contactId={selectedContactId}
        open={showContactDrawer}
        onOpenChange={(open) => {
          setShowContactDrawer(open)
          if (!open) setSelectedContactId(null)
        }}
      />
    </>
  )
}

"use client"

import { useState, useTransition } from "react"
import { Select } from "@/components/ui/Select"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import type { OpportunityEvent } from "@/types/database"
import {
  addOpportunityEvent,
  updateOpportunityEvent,
  deleteOpportunityEvent,
} from "@/app/(app)/missions/_actions/opportunity-events"
import { cn } from "@/lib/utils"
import { formatDateTime } from "./opportunity-detail-utils"

interface OpportunityTimelinePanelProps {
  opportunityId: string
  events: OpportunityEvent[]
  onRefresh: () => void
}

const EVENT_TYPES = [
  { value: "note", label: "Note" },
  { value: "appel", label: "Appel" },
  { value: "email", label: "Email" },
  { value: "rdv_client", label: "RDV client" },
  { value: "relance", label: "Relance" },
  { value: "envoi_cv", label: "Envoi CV" },
  { value: "entretien_client", label: "Entretien client" },
  { value: "changement_etape", label: "Changement d’étape" },
  { value: "proposition", label: "Proposition" },
  { value: "signature", label: "Signature" },
  { value: "perte", label: "Perte" },
]

const EVENT_BG_BADGES: Record<string, string> = {
  note: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  appel: "bg-sky-500/10 border-sky-500/20 text-sky-400",
  email: "bg-purple-500/10 border-purple-500/20 text-purple-400",
  rdv_client: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  relance: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  envoi_cv: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
  entretien_client: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
  changement_etape: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  proposition: "bg-pink-500/10 border-pink-500/20 text-pink-400",
  signature: "bg-teal-500/10 border-teal-500/20 text-teal-400",
  perte: "bg-rose-500/10 border-rose-500/20 text-rose-400",
}

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case "note":
      return (
        <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    case "appel":
      return (
        <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      )
    case "email":
      return (
        <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    case "rdv_client":
      return (
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    case "relance":
      return (
        <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      )
    case "envoi_cv":
      return (
        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    case "entretien_client":
      return (
        <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    case "changement_etape":
      return (
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      )
    case "proposition":
      return (
        <svg className="w-4 h-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case "signature":
      return (
        <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case "perte":
      return (
        <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    default:
      return (
        <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
  }
}

// Convert absolute ISO date strings into standard YYYY-MM-DDTHH:mm input formats
const formatToLocalDatetimeInput = (dateStr?: string | null) => {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ""
  const pad = (num: number) => String(num).padStart(2, "0")
  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const min = pad(date.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

export function OpportunityTimelinePanel({
  opportunityId,
  events,
  onRefresh,
}: OpportunityTimelinePanelProps) {
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Creation State
  const [isAdding, setIsAdding] = useState(false)
  const [newEvent, setNewEvent] = useState({
    event_type: "note",
    body: "",
    occurred_at: "",
  })

  // Edition State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState({
    event_type: "note",
    body: "",
    occurred_at: "",
  })

  const resetNewForm = () => {
    setNewEvent({
      event_type: "note",
      body: "",
      occurred_at: "",
    })
    setIsAdding(false)
    setErrorMsg(null)
  }

  const handleAdd = () => {
    setErrorMsg(null)
    const type = newEvent.event_type.trim()
    if (!type) {
      setErrorMsg("Le type d'événement est obligatoire.")
      return
    }

    startTransition(async () => {
      const result = await addOpportunityEvent({
        opportunity_id: opportunityId,
        event_type: type,
        body: newEvent.body,
        occurred_at: newEvent.occurred_at || null,
      })

      if (result.error) {
        setErrorMsg(result.error)
      } else {
        resetNewForm()
        onRefresh()
      }
    })
  }

  const startEditing = (event: OpportunityEvent) => {
    setErrorMsg(null)
    setEditingId(event.id)
    setEditingEvent({
      event_type: event.event_type,
      body: event.body || "",
      occurred_at: formatToLocalDatetimeInput(event.occurred_at),
    })
  }

  const handleUpdate = (id: string) => {
    setErrorMsg(null)
    const type = editingEvent.event_type.trim()
    if (!type) {
      setErrorMsg("Le type d'événement est obligatoire.")
      return
    }

    startTransition(async () => {
      const result = await updateOpportunityEvent({
        id,
        event_type: type,
        body: editingEvent.body,
        occurred_at: editingEvent.occurred_at || null,
      })

      if (result.error) {
        setErrorMsg(result.error)
      } else {
        setEditingId(null)
        onRefresh()
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet événement ?")) return
    setErrorMsg(null)

    startTransition(async () => {
      const result = await deleteOpportunityEvent({ id })
      if (result.error) {
        setErrorMsg(result.error)
      } else {
        setEditingId(null)
        onRefresh()
      }
    })
  }

  const inputClass = "rounded-md border border-border bg-canvas px-2.5 py-1 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-50"
  const labelClass = "text-[10px] uppercase tracking-wider text-muted font-bold block mb-1"

  return (
    <SurfaceCard className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <h2 className="text-sm font-bold font-heading text-heading">
          Timeline & Historique
        </h2>
        {!isAdding && (
          <button
            onClick={() => {
              setIsAdding(true)
              // Prefill occurred_at with local time in YYYY-MM-DDTHH:MM
              const now = new Date()
              const pad = (num: number) => String(num).padStart(2, "0")
              const localTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
              setNewEvent(prev => ({ ...prev, occurred_at: localTime }))
            }}
            className="text-[10px] font-bold text-primary hover:underline"
            disabled={isPending}
          >
            + Ajouter un événement
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="text-[10px] text-danger bg-danger/10 border border-danger/20 rounded px-2.5 py-1.5">
          {errorMsg}
        </div>
      )}

      {/* Formulaire d'ajout d'un événement */}
      {isAdding && (
        <div className="p-3.5 bg-canvas/30 rounded border border-border/60 flex flex-col gap-3">
          <span className="text-[9px] uppercase tracking-wider text-muted font-bold">Nouvel événement commercial</span>
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Type</label>
                <Select
                  value={newEvent.event_type}
                  onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                  className={cn(inputClass, "w-full")}
                  disabled={isPending}
                >
                  {EVENT_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className={labelClass}>Date / Heure</label>
                <input
                  type="datetime-local"
                  value={newEvent.occurred_at}
                  onChange={(e) => setNewEvent({ ...newEvent, occurred_at: e.target.value })}
                  className={cn(inputClass, "w-full")}
                  disabled={isPending}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Description / Notes</label>
              <textarea
                placeholder="Détails de l'événement..."
                value={newEvent.body}
                onChange={(e) => setNewEvent({ ...newEvent, body: e.target.value })}
                className={cn(inputClass, "w-full h-16 resize-none")}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              onClick={resetNewForm}
              className="px-2.5 py-1 text-[10px] font-semibold rounded bg-canvas border border-border text-muted hover:text-heading transition-colors"
              disabled={isPending}
            >
              Annuler
            </button>
            <button
              onClick={handleAdd}
              className="px-2.5 py-1 text-[10px] font-semibold rounded bg-primary text-primary-fg hover:bg-primary/90 transition-colors"
              disabled={isPending}
            >
              {isPending ? "Ajout..." : "Ajouter"}
            </button>
          </div>
        </div>
      )}

      {/* Liste des événements sous forme de Timeline */}
      {events.length === 0 && !isAdding ? (
        <p className="text-xs text-muted italic py-2">Aucun événement renseigné.</p>
      ) : (
        <div className="relative pl-4 border-l border-border/60 flex flex-col gap-4 py-2">
          {events.map((event) => {
            const isEditingRow = editingId === event.id
            const label = EVENT_TYPES.find((o) => o.value === event.event_type)?.label || event.event_type
            const colorClass = EVENT_BG_BADGES[event.event_type] || "bg-canvas text-muted border-border"

            if (isEditingRow) {
              return (
                <div key={event.id} className="relative group">
                  {/* Timeline point */}
                  <div className="absolute -left-[23px] top-1.5 w-[14px] h-[14px] rounded-full bg-border border-4 border-canvas flex items-center justify-center" />

                  <div className="p-3 bg-canvas/40 rounded border border-border/80 flex flex-col gap-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelClass}>Type</label>
                        <Select
                          value={editingEvent.event_type}
                          onChange={(e) => setEditingEvent({ ...editingEvent, event_type: e.target.value })}
                          className={cn(inputClass, "w-full")}
                          disabled={isPending}
                        >
                          {EVENT_TYPES.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className={labelClass}>Date / Heure</label>
                        <input
                          type="datetime-local"
                          value={editingEvent.occurred_at}
                          onChange={(e) => setEditingEvent({ ...editingEvent, occurred_at: e.target.value })}
                          className={cn(inputClass, "w-full")}
                          disabled={isPending}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Description / Notes</label>
                      <textarea
                        value={editingEvent.body}
                        onChange={(e) => setEditingEvent({ ...editingEvent, body: e.target.value })}
                        className={cn(inputClass, "w-full h-16 resize-none")}
                        disabled={isPending}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="text-[10px] font-semibold text-danger hover:underline"
                        disabled={isPending}
                      >
                        Supprimer
                      </button>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 text-[10px] font-semibold rounded bg-canvas border border-border text-muted hover:text-heading"
                          disabled={isPending}
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => handleUpdate(event.id)}
                          className="px-2.5 py-1 text-[10px] font-semibold rounded bg-success text-success-fg hover:bg-success/90"
                          disabled={isPending}
                        >
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={event.id}
                onClick={() => startEditing(event)}
                className="relative group flex items-start gap-3 p-2 bg-canvas/20 rounded border border-transparent hover:border-border/40 hover:bg-canvas/40 transition-all cursor-pointer"
              >
                {/* Timeline node */}
                <div className="absolute -left-[24px] top-4 w-[16px] h-[16px] rounded-full bg-canvas border border-border/60 flex items-center justify-center shadow-sm group-hover:border-primary/40 transition-colors">
                  <div className="w-[6px] h-[6px] rounded-full bg-muted group-hover:bg-primary transition-colors" />
                </div>

                {/* Icon Badge */}
                <div className={cn("w-7 h-7 rounded-md border flex items-center justify-center shrink-0 mt-0.5 shadow-sm", colorClass)}>
                  <EventIcon type={event.event_type} />
                </div>

                {/* Content */}
                <div className="flex flex-col gap-0.5 flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-heading group-hover:text-primary transition-colors">
                      {label}
                    </span>
                    <span className="text-[10px] text-muted">
                      {formatDateTime(event.occurred_at)}
                    </span>
                  </div>
                  {event.body ? (
                    <p className="text-xs text-body whitespace-pre-wrap mt-0.5 break-words font-medium leading-relaxed bg-canvas/30 p-2 rounded border border-border/30">
                      {event.body}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted italic mt-0.5">Aucune note additionnelle.</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SurfaceCard>
  )
}

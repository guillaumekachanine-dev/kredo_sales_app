"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { SectionTab } from "@/lib/tabs/tab-types"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { AppDialog } from "@/components/ui/AppDialog"
import { updateMission } from "@/app/(app)/missions/_actions/update-mission"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { cn } from "@/lib/utils"

export type MissionsListRow = {
  entityId: string
  entityType: SectionTab["entityType"]
  title: string
  subtitle?: string
  status: "active" | "pending" | "closed" | "won" | "lost"
  amount?: string
  date?: string
  client?: string
  clientWebsite?: string | null
  clientLogoPath?: string | null
  tag?: string
  tjm?: number
  grossMarginPct?: number | null
  conviction?: number
  acv?: number | null
  estimatedGain?: number | null
  stage?: string
  consultant?: string
  startDate?: string
  endDate?: string
  riskLevel?: "faible" | "modere" | "critique"
}

interface MissionsListViewProps {
  rows: MissionsListRow[]
  emptyMessage?: string
}

function formatEuro(amount: number | null): string {
  if (amount === null || amount === undefined || amount === 0) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// Pastille styles matching: OK (green), vigilance (yellow), danger (red)
function getPastilleStyles(riskLevel?: "faible" | "modere" | "critique") {
  if (riskLevel === "critique") {
    return {
      bg: "bg-danger/10 text-danger border-danger/20",
      dot: "bg-danger",
      label: "danger"
    }
  }
  if (riskLevel === "modere") {
    return {
      bg: "bg-warning/10 text-warning border-warning/20",
      dot: "bg-warning",
      label: "vigilance"
    }
  }
  return {
    bg: "bg-success/10 text-success border-success/20",
    dot: "bg-success",
    label: "OK"
  }
}

export function MissionsListView({ rows, emptyMessage = "Aucun élément." }: MissionsListViewProps) {
  const router = useRouter()
  const { openTab } = useMissionsTabStore()

  // Rapid edition dialog state
  const [editingMission, setEditingMission] = useState<MissionsListRow | null>(null)
  const [formTitle, setFormTitle] = useState("")
  const [formTjm, setFormTjm] = useState<number>(0)
  const [formMargin, setFormMargin] = useState<number | null>(null)
  const [formStartDate, setFormStartDate] = useState("")
  const [formEndDate, setFormEndDate] = useState("")
  const [formRiskLevel, setFormRiskLevel] = useState<"faible" | "modere" | "critique">("faible")
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleEditClick = (row: MissionsListRow) => {
    if (row.entityType === "opportunite") {
      router.push(`/missions/opps/${row.entityId}/edit`)
      return
    }
    setEditingMission(row)
    setFormTitle(row.title)
    setFormTjm(row.tjm || 0)
    setFormMargin(row.grossMarginPct !== undefined ? row.grossMarginPct : null)
    setFormStartDate(row.startDate || "")
    setFormEndDate(row.endDate || "")
    setFormRiskLevel(row.riskLevel || "faible")
    setErrorMsg(null)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingMission) return

    setIsSaving(true)
    setErrorMsg(null)

    try {
      const res = await updateMission({
        id: editingMission.entityId,
        title: formTitle,
        tjm: formTjm,
        gross_margin_pct: formMargin,
        start_date: formStartDate || null,
        end_date: formEndDate || null,
        risk_level: formRiskLevel,
      })

      if (res.error) {
        setErrorMsg(res.error)
      } else {
        // Success
        setEditingMission(null)
      }
    } catch (err) {
      console.error("Error saving mission:", err)
      setErrorMsg("Une erreur est survenue lors de l'enregistrement.")
    } finally {
      setIsSaving(false)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted">
        {emptyMessage}
      </div>
    )
  }

  return (
    <>
      {/* Desktop view (table) */}
      <div className="hidden md:block">
        <SurfaceCard className="overflow-hidden border-0 shadow-sm rounded-xl">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-canvas/30">
                <th className="text-left px-4 py-3 text-muted font-semibold uppercase tracking-wider text-[10px]">
                  Client
                </th>
                <th className="text-left px-4 py-3 text-muted font-semibold uppercase tracking-wider text-[10px]">
                  Intitulé
                </th>
                <th className="text-left px-4 py-3 text-muted font-semibold uppercase tracking-wider text-[10px]">
                  Consultant
                </th>
                <th className="text-right px-4 py-3 text-muted font-semibold uppercase tracking-wider text-[10px]">
                  Tarif
                </th>
                <th className="text-right px-4 py-3 text-muted font-semibold uppercase tracking-wider text-[10px]">
                  Marge
                </th>
                <th className="text-center px-4 py-3 text-muted font-semibold uppercase tracking-wider text-[10px]">
                  Date début
                </th>
                <th className="text-center px-4 py-3 text-muted font-semibold uppercase tracking-wider text-[10px]">
                  Date fin
                </th>
                <th className="text-center px-4 py-3 text-muted font-semibold uppercase tracking-wider text-[10px]">
                  Statut
                </th>
                <th className="text-center px-4 py-3 text-muted font-semibold uppercase tracking-wider text-[10px] w-12">
                  {/* Edit Action Column */}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const style = getPastilleStyles(row.riskLevel)
                return (
                  <tr
                    key={row.entityId}
                    onClick={() =>
                      openTab({
                        entityType: row.entityType,
                        entityId: row.entityId,
                        title: row.title,
                        subtitle: row.subtitle,
                      })
                    }
                    className={cn(
                      "border-b border-border/40 last:border-0",
                      "hover:bg-surface-hover/30 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:translate-x-0.5",
                      "transform transition-all duration-200 cursor-pointer group"
                    )}
                  >
                    {/* Client */}
                    <td className="px-4 py-3.5 text-heading font-bold">
                      <div className="flex items-center gap-2.5">
                        <CompanyLogo
                          name={row.client || "Client"}
                          logoPath={row.clientLogoPath}
                          website={row.clientWebsite}
                          size="sm"
                        />
                        <span>{row.client ?? "—"}</span>
                      </div>
                    </td>

                    {/* Intitulé */}
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-body group-hover:text-primary transition-colors duration-150">
                        {row.title}
                      </span>
                    </td>

                    {/* Consultant */}
                    <td className="px-4 py-3.5 text-body">
                      {row.consultant ?? "—"}
                    </td>

                    {/* Tarif */}
                    <td className="px-4 py-3.5 text-right font-medium text-heading tabular-nums">
                      {row.tjm ? `${formatEuro(row.tjm)}/j` : "—"}
                    </td>

                    {/* Marge */}
                    <td className="px-4 py-3.5 text-right font-medium text-heading tabular-nums">
                      {row.grossMarginPct !== null && row.grossMarginPct !== undefined
                        ? `${row.grossMarginPct} %`
                        : "—"}
                    </td>

                    {/* Date début */}
                    <td className="px-4 py-3.5 text-center text-body tabular-nums">
                      {formatDateShort(row.startDate)}
                    </td>

                    {/* Date fin */}
                    <td className="px-4 py-3.5 text-center text-body tabular-nums">
                      {formatDateShort(row.endDate)}
                    </td>

                    {/* Statut pastille */}
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wider select-none",
                          style.bg
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", style.dot)} />
                        {style.label}
                      </span>
                    </td>

                    {/* Crayon button */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditClick(row)
                        }}
                        className="p-1.5 text-muted hover:text-primary hover:bg-primary/5 rounded transition-all duration-150 active:scale-90"
                        title="Modifier la mission"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </SurfaceCard>
      </div>

      {/* Mobile view (cards) - Mobile-First & Integrally Readable */}
      <div className="md:hidden flex flex-col gap-3">
        {rows.map((row) => {
          const style = getPastilleStyles(row.riskLevel)
          return (
            <div
              key={row.entityId}
              onClick={() =>
                openTab({
                  entityType: row.entityType,
                  entityId: row.entityId,
                  title: row.title,
                  subtitle: row.subtitle,
                })
              }
              className={cn(
                "bg-surface border border-border/50 rounded-xl p-4 shadow-sm flex flex-col gap-3 relative cursor-pointer active:scale-[0.99] transition-all"
              )}
            >
              {/* Row 1: Client logo + name, and risk level */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CompanyLogo
                    name={row.client || "Client"}
                    logoPath={row.clientLogoPath}
                    website={row.clientWebsite}
                    size="sm"
                  />
                  <span className="font-bold text-heading text-xs">{row.client ?? "—"}</span>
                </div>
                
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider select-none shrink-0",
                    style.bg
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", style.dot)} />
                  {style.label}
                </span>
              </div>

              {/* Row 2: Title and Edit pencil button */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col min-w-0">
                  <h4 className="font-semibold text-body text-xs leading-snug group-hover:text-primary transition-colors duration-150">
                    {row.title}
                  </h4>
                  <p className="text-[10px] text-muted mt-0.5">
                    Consultant : <span className="font-medium text-body">{row.consultant ?? "—"}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditClick(row)
                  }}
                  className="p-1.5 text-muted hover:text-primary hover:bg-primary/5 rounded transition-all duration-150 shrink-0 self-start border border-transparent hover:border-border/60"
                  title="Modifier la mission"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>

              {/* Row 3: Grid KPIs (TJM, Marge, Dates) */}
              <div className="flex flex-col gap-2 bg-canvas/30 p-2.5 rounded-lg border border-border/40 text-[10px] text-body">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-muted uppercase tracking-wider mb-0.5">TJM</span>
                    <span className="font-extrabold text-heading">{row.tjm ? `${formatEuro(row.tjm)}/j` : "—"}</span>
                  </div>
                  <div className="flex flex-col border-l border-border/30 pl-2">
                    <span className="text-[8px] font-bold text-muted uppercase tracking-wider mb-0.5">Marge</span>
                    <span className="font-extrabold text-heading">
                      {row.grossMarginPct !== null && row.grossMarginPct !== undefined
                        ? `${row.grossMarginPct} %`
                        : "—"}
                    </span>
                  </div>
                </div>
                <div className="border-t border-border/20 pt-2 flex items-center gap-1.5 text-muted-foreground text-[9px]">
                  <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>
                    Période : <span className="font-semibold text-body">{formatDateShort(row.startDate)} au {formatDateShort(row.endDate)}</span>
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Rapid Edit Dialog */}
      <AppDialog
        open={editingMission !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingMission(null)
        }}
        title="Édition rapide de la mission"
      >
        {editingMission && (
          <form onSubmit={handleSave} className="flex flex-col gap-4 mt-2">
            {errorMsg && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded text-danger text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Title */}
            <div className="flex flex-col">
              <label htmlFor="mission-title" className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block">
                Intitulé de la mission
              </label>
              <input
                id="mission-title"
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-canvas border border-border rounded focus:outline-none focus:border-primary text-heading font-medium"
              />
            </div>

            {/* Client & Consultant (Read-only for context) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block">
                  Client
                </span>
                <span className="px-3 py-2 text-xs bg-canvas/40 border border-border/60 rounded text-muted select-none truncate">
                  {editingMission.client || "—"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block">
                  Consultant
                </span>
                <span className="px-3 py-2 text-xs bg-canvas/40 border border-border/60 rounded text-muted select-none truncate">
                  {editingMission.consultant || "—"}
                </span>
              </div>
            </div>

            {/* TJM & Margin */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label htmlFor="mission-tjm" className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block">
                  Tarif journalier (TJM €)
                </label>
                <input
                  id="mission-tjm"
                  type="number"
                  min="0"
                  required
                  value={formTjm}
                  onChange={(e) => setFormTjm(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-canvas border border-border rounded focus:outline-none focus:border-primary text-heading font-semibold"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="mission-margin" className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block">
                  Marge brute (%)
                </label>
                <input
                  id="mission-margin"
                  type="number"
                  min="0"
                  max="100"
                  value={formMargin !== null ? formMargin : ""}
                  onChange={(e) => setFormMargin(e.target.value !== "" ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 text-xs bg-canvas border border-border rounded focus:outline-none focus:border-primary text-heading font-semibold"
                />
              </div>
            </div>

            {/* Start & End Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label htmlFor="mission-start-date" className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block">
                  Date de début
                </label>
                <input
                  id="mission-start-date"
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-canvas border border-border rounded focus:outline-none focus:border-primary text-heading font-semibold"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="mission-end-date" className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block">
                  Date de fin
                </label>
                <input
                  id="mission-end-date"
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-canvas border border-border rounded focus:outline-none focus:border-primary text-heading font-semibold"
                />
              </div>
            </div>

            {/* Risk Pastille Level */}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 block">
                Statut de la prestation (Santé)
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "faible", label: "OK", color: "border-success bg-success/5 text-success hover:bg-success/10", activeColor: "bg-success text-white border-success" },
                  { value: "modere", label: "vigilance", color: "border-warning bg-warning/5 text-warning hover:bg-warning/10", activeColor: "bg-warning text-white border-warning" },
                  { value: "critique", label: "danger", color: "border-danger bg-danger/5 text-danger hover:bg-danger/10", activeColor: "bg-danger text-white border-danger" }
                ].map((risk) => {
                  const isActive = formRiskLevel === risk.value
                  return (
                    <button
                      key={risk.value}
                      type="button"
                      onClick={() => setFormRiskLevel(risk.value as any)}
                      className={cn(
                        "py-2 text-center text-xs font-bold rounded border uppercase tracking-wider transition-all duration-150",
                        isActive ? risk.activeColor : risk.color
                      )}
                    >
                      {risk.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Form actions */}
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-4">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setEditingMission(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded hover:bg-canvas text-body disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-primary text-primary-fg hover:bg-primary/95 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        )}
      </AppDialog>
    </>
  )
}

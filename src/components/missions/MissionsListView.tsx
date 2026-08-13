"use client"

import { useState, FormEvent } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { SectionTab } from "@/lib/tabs/tab-types"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { AppDialog } from "@/components/ui/AppDialog"
import { StructuredList, type StructuredListColumn } from "@/components/ui/StructuredList"
import { updateMission } from "@/app/(app)/missions/_actions/update-mission"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { getPracticeByName } from "@/lib/config/practices"
import { cn } from "@/lib/utils"
import { MissionsMobileListView } from "@/components/missions/MissionsMobileListView"

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
  priority?: string
  targetDailyRate?: number | null
  practice?: string
  targetCloseDate?: string | null
  nextActionLabel?: string | null
  nextActionAt?: string | null
  updatedAt?: string
  companyId?: string | null
  source?: string | null
  seniority?: string | null
  location?: string | null
  remotePolicy?: string | null
  openedAt?: string | null
  requiredHeadcount?: number
  requiresStaffing?: boolean
}

interface MissionsListViewProps {
  rows: MissionsListRow[]
  emptyMessage?: string
}

import { formatEuro } from "@/lib/formatters"
import type { PracticeSlug } from "@/lib/config/practices"

const PRACTICE_IMAGE_BY_SLUG: Record<PracticeSlug, string> = {
  "data-ia": "/images/practices/practice_data_ai.png",
  "digital-cloud": "/images/practices/practice_cloud_computing.png",
  "agile-pm": "/images/practices/practice_project_management.png",
  cybersecurity: "/images/practices/practice_cybersecurite.png",
  "qa-testing": "/images/practices/practice_qa_testing.png",
  "custom-apps": "/images/practices/practice_cloud_computing.png",
  "ux-ui-design": "/images/practices/practice_project_management.png",
  "legacy-mainframe": "/images/practices/practice_cloud_computing.png",
}

function formatDayMonth(date?: string | null) {
  if (!date) return "—"

  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return "—"

  const day = String(parsed.getDate()).padStart(2, "0")
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  return `${day}/${month}`
}

function getMissionEndProgress(endDate?: string) {
  if (!endDate) {
    return { label: "Indéterminée", pct: 100, color: "bg-emerald-500" }
  }

  const end = new Date(endDate)
  const now = new Date()
  const diffTime = end.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return { label: "Terminée", pct: 100, color: "bg-slate-300" }
  if (diffDays <= 15) return { label: "15 jours", pct: 20, color: "bg-amber-500" }
  if (diffDays <= 30) return { label: "30 jours", pct: 40, color: "bg-amber-500" }
  if (diffDays <= 60) return { label: "2 mois", pct: 60, color: "bg-blue-600" }
  return { label: "3 mois +", pct: 85, color: "bg-emerald-500" }
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
      router.push(`/missions/opps/${row.entityId}/modifier`)
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

  const missionColumns: StructuredListColumn<MissionsListRow>[] = [
    {
      id: "client",
      header: "Client",
      width: "12.5rem",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <CompanyLogo
            name={row.client || "Client"}
            logoPath={row.clientLogoPath}
            website={row.clientWebsite}
            size="sm"
          />
          <span className="font-bold text-heading">{row.client ?? "—"}</span>
        </div>
      ),
    },
    {
      id: "intitule",
      header: "Intitulé",
      width: "15rem",
      render: (row) => (
        <span className="font-semibold text-body group-hover:text-primary transition-colors duration-150">
          {row.title}
        </span>
      ),
    },
    {
      id: "consultant",
      header: "Consultant",
      width: "10.5rem",
      render: (row) => {
        const practice = getPracticeByName(row.practice)
        const practiceImage = practice ? PRACTICE_IMAGE_BY_SLUG[practice.slug] : null
        const practiceTitle = practice?.name
        const practiceLabel = practice?.shortName ?? ""

        return (
          <div className="flex items-center gap-2 min-w-0">
            {practiceImage ? (
              <Image
                src={practiceImage}
                alt={practiceLabel}
                width={18}
                height={18}
                className="shrink-0 rounded-sm"
                title={practiceTitle}
              />
            ) : null}
            <span className="truncate text-body">{row.consultant ?? "—"}</span>
          </div>
        )
      },
    },
    {
      id: "tarif",
      header: "Tarif",
      align: "right",
      width: "5.75rem",
      render: (row) => (
        <span className="font-medium text-heading">
          {row.tjm ? `${formatEuro(row.tjm)}/j` : "—"}
        </span>
      ),
    },
    {
      id: "marge",
      header: "Marge",
      align: "right",
      width: "5.5rem",
      render: (row) => (
        <span className="font-medium text-heading">
          {row.grossMarginPct !== null && row.grossMarginPct !== undefined
            ? `${Math.round(row.grossMarginPct)} %`
            : "—"}
        </span>
      ),
    },
    {
      id: "date-debut",
      header: "Date début",
      align: "center",
      width: "5.5rem",
      render: (row) => <span className="text-body">{formatDayMonth(row.startDate)}</span>,
    },
    {
      id: "date-fin",
      header: "Date fin",
      align: "center",
      width: "5.5rem",
      render: (row) => <span className="text-body">{formatDayMonth(row.endDate)}</span>,
    },
    {
      id: "fin-mission",
      header: <span className="whitespace-nowrap">Fin de mission</span>,
      align: "center",
      width: "10rem",
      render: (row) => {
        const progress = getMissionEndProgress(row.endDate)
        return (
          <div className="flex w-[9rem] flex-col gap-1 justify-self-center">
            <span className="text-[10px] text-body">{progress.label}</span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={progress.color} style={{ width: `${progress.pct}%`, height: "100%" }} />
            </div>
          </div>
        )
      },
    },
    {
      id: "action",
      header: "",
      align: "center",
      width: "3rem",
      render: (row) => (
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
      ),
    },
    {
      id: "statut",
      header: "Statut",
      align: "right",
      width: "6.5rem",
      render: (row) => {
        const style = getPastilleStyles(row.riskLevel)
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wider select-none",
              style.bg,
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", style.dot)} />
            {style.label}
          </span>
        )
      },
    },
  ]

  return (
    <>
      {/* Desktop view */}
      <div className="hidden md:block">
        <SurfaceCard className="overflow-hidden border-0 rounded-[var(--radius-medium)]">
          <StructuredList
            density="compact"
            items={rows}
            columns={missionColumns}
            getItemId={(row) => row.entityId}
            onItemClick={(row) =>
              openTab({
                entityType: row.entityType,
                entityId: row.entityId,
                title: row.entityType === "opportunite" ? (row.client ?? row.title) : row.title,
                subtitle: row.entityType === "opportunite" ? row.title : row.subtitle,
              })
            }
            ariaLabel="Liste des missions"
          />
        </SurfaceCard>
      </div>

      {/* Mobile view (cards) - Mobile-First & Integrally Readable */}
      <MissionsMobileListView
        rows={rows}
        emptyMessage={emptyMessage}
        onEditClick={handleEditClick}
      />

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
                      onClick={() => setFormRiskLevel(risk.value as "faible" | "modere" | "critique")}
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

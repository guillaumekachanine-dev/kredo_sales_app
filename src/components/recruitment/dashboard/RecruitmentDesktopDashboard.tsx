"use client"

import { useState } from "react"
import { PageFilterBar } from "@/components/ui/PageFilterBar"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { PageViewSelector } from "@/components/ui/PageViewSelector"
import { StructuredList, type StructuredListColumn } from "@/components/ui/StructuredList"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"

export interface Candidate {
  id: string
  name: string
  practice: string
  experience: string
  aiMatch: number
  targetClient: string
  logoLetter: string
  logoColor: string
  stage: "candidature" | "tech" | "rh" | "offre" | "embauche"
  email: string
  phone: string
  skills: string[]
  summary: string
}

export interface StaffingNeed {
  id: string
  client: string
  role: string
  practice: string
  urgence: "Haute" | "Moyenne" | "Basse"
  suggestedCandidates: {
    name: string
    avatarInitials: string
    score: number
  }[]
}

const STAGE_COLORS: Record<Candidate["stage"], string> = {
  candidature: "#3B82F6",
  tech: "#0EA5E9",
  rh: "#F59E0B",
  offre: "#9C27B0",
  embauche: "#10B981",
}

function StagePill({ stage, label }: { stage: Candidate["stage"]; label: string }) {
  const color = STAGE_COLORS[stage] || "#94A3B8"
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[length:var(--font-size-label-sm)] font-medium leading-[var(--line-height-label-sm)]"
      style={{ color }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </span>
  )
}

interface RecruitmentDesktopDashboardProps {
  candidates: Candidate[]
  staffingNeeds: StaffingNeed[]
  onSelectCandidate: (candidate: Candidate) => void
  onUpdateStage: (id: string, stage: Candidate["stage"]) => void
}

export function RecruitmentDesktopDashboard({
  candidates,
  staffingNeeds,
  onSelectCandidate,
  onUpdateStage,
}: RecruitmentDesktopDashboardProps) {
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list")
  const [filterPractice, setFilterPractice] = useState("all")
  const [filterUrgence, setFilterUrgence] = useState("all")
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [activeDragOverCol, setActiveDragOverCol] = useState<string | null>(null)

  // AI Matching alerts mirroring mockup
  const alerts = [
    {
      id: "alert-1",
      consultant: "Candidat X",
      match: "96%",
      role: "Role Y",
      details: "including tiny pgvector",
    },
    {
      id: "alert-2",
      consultant: "Candidat Y",
      match: "95%",
      role: "Role Z",
      details: "pgvector semantic matching",
    },
    {
      id: "alert-3",
      consultant: "Candidat Z",
      match: "95%",
      role: "Role W",
      details: "including tiny pgvector",
    },
    {
      id: "alert-4",
      consultant: "Candidat W",
      match: "96%",
      role: "Role V",
      details: "pgvector semantic matching",
    },
    {
      id: "alert-5",
      consultant: "Candidat V",
      match: "95%",
      role: "Role U",
      details: "matching skills index",
    },
  ]

  // Move candidate card to a different stage
  const moveCandidate = (id: string, direction: "left" | "right") => {
    const stages: Candidate["stage"][] = ["candidature", "tech", "rh", "offre", "embauche"]
    const candidate = candidates.find((c) => c.id === id)
    if (!candidate) return
    const currentIdx = stages.indexOf(candidate.stage)
    let newIdx = currentIdx
    if (direction === "left" && currentIdx > 0) newIdx = currentIdx - 1
    if (direction === "right" && currentIdx < stages.length - 1) newIdx = currentIdx + 1
    if (newIdx !== currentIdx) {
      onUpdateStage(id, stages[newIdx])
    }
  }

  // --- Filtering Logic ---
  const filteredCandidates = candidates.filter((c) => {
    if (filterPractice !== "all" && c.practice !== filterPractice) return false
    return true
  })

  const filteredStaffing = staffingNeeds.filter((need) => {
    if (filterPractice !== "all" && need.practice !== filterPractice) return false
    if (filterUrgence !== "all") {
      if (filterUrgence === "high" && need.urgence !== "Haute") return false
      if (filterUrgence === "normal" && need.urgence !== "Moyenne") return false
    }
    return true
  })

  // Group candidates by pipeline column
  const getStageCandidates = (stage: Candidate["stage"]) => {
    return filteredCandidates.filter((c) => c.stage === stage)
  }

  const activeFilterCount = (filterPractice !== "all" ? 1 : 0) + (filterUrgence !== "all" ? 1 : 0)

  const handleReset = () => {
    setFilterPractice("all")
    setFilterUrgence("all")
  }

  const columns: StructuredListColumn<Candidate>[] = [
    {
      id: "candidate",
      header: "Candidat",
      width: "16rem",
      render: (row) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary shrink-0 select-none">
            {row.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-heading truncate group-hover:text-primary transition-colors duration-150">
              {row.name}
            </span>
            <span className="text-[10px] text-muted truncate">{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      id: "practice",
      header: "Practice & Expérience",
      width: "12rem",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-body">{row.practice}</span>
          <span className="text-[10px] text-muted">{row.experience}</span>
        </div>
      ),
    },
    {
      id: "targetClient",
      header: "Compte Cible",
      width: "14rem",
      render: (row) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${row.logoColor} shrink-0 select-none`}>
            {row.logoLetter}
          </div>
          <span className="font-semibold text-body truncate">{row.targetClient}</span>
        </div>
      ),
    },
    {
      id: "aiMatch",
      header: "Match AI",
      align: "center",
      width: "10rem",
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-success/80 transition-[width] duration-300"
              style={{ width: `${row.aiMatch}%` }}
            />
          </div>
          <span className="w-8 text-right font-medium tabular-nums text-heading">
            {row.aiMatch}%
          </span>
        </div>
      ),
    },
    {
      id: "stage",
      header: "Étape",
      width: "11rem",
      render: (row) => {
        const labels: Record<Candidate["stage"], string> = {
          candidature: "Candidature",
          tech: "Entretien Tech",
          rh: "Entretien RH",
          offre: "Offre",
          embauche: "Embauché",
        }
        return <StagePill stage={row.stage} label={labels[row.stage]} />
      },
    },
    {
      id: "skills",
      header: "Compétences",
      render: (row) => (
        <div className="flex flex-wrap gap-1 max-w-[18rem]">
          {row.skills.slice(0, 3).map((skill) => (
            <Badge key={skill} variant="neutral" size="sm">
              {skill}
            </Badge>
          ))}
          {row.skills.length > 3 && (
            <Badge variant="neutral" size="sm">
              +{row.skills.length - 3}
            </Badge>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageFilterBar
        activeCount={activeFilterCount}
        onReset={handleReset}
        viewSelector={
          <PageViewSelector
            items={[
              { value: "list", label: "Liste" },
              { value: "kanban", label: "Kanban" },
            ]}
            value={viewMode}
            onChange={(val) => setViewMode(val as "list" | "kanban")}
            ariaLabel="Mode d'affichage des recrutements"
          />
        }
      >
        <PageFilterSelect
          id="recruitment-practice-filter"
          label="Practice"
          value={filterPractice}
          onChange={setFilterPractice}
          options={[
            { value: "all", label: "Toutes les practices" },
            { value: "AI", label: "AI / RAG" },
            { value: "Cloud", label: "Cloud / DevOps" },
            { value: "Data", label: "Data Engineering" },
            { value: "Digital", label: "Digital / Next.js" },
          ]}
        />
        <PageFilterSelect
          id="recruitment-urgence-filter"
          label="Urgence"
          value={filterUrgence}
          onChange={setFilterUrgence}
          options={[
            { value: "all", label: "Toutes urgences" },
            { value: "high", label: "Urgence Haute" },
            { value: "normal", label: "Urgence Moyenne" },
          ]}
        />
      </PageFilterBar>

      {viewMode === "list" && (
        <SurfaceCard className="overflow-hidden border-0 rounded-[var(--radius-medium)]">
          <StructuredList
            density="compact"
            items={filteredCandidates}
            columns={columns}
            getItemId={(row) => row.id}
            onItemClick={(row) => onSelectCandidate(row)}
            ariaLabel="Liste des candidats"
            emptyState="Aucun candidat ne correspond aux filtres."
          />
        </SurfaceCard>
      )}

      {viewMode === "kanban" && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted select-none">
            Pipeline Candidats
          </h2>

          <div className="grid grid-cols-5 gap-3.5 items-stretch min-h-[360px]">
            {[
              { key: "candidature", label: "Candidature" },
              { key: "tech", label: "Entretien Tech" },
              { key: "rh", label: "Entretien RH" },
              { key: "offre", label: "Offre" },
              { key: "embauche", label: "Embauché" },
            ].map((col) => {
              const list = getStageCandidates(col.key as Candidate["stage"])
              const isDragOver = activeDragOverCol === col.key
              const accentColor = STAGE_COLORS[col.key as Candidate["stage"]] || "#94A3B8"

              return (
                <div
                  key={col.key}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setActiveDragOverCol(col.key)
                  }}
                  onDragLeave={() => {
                    setActiveDragOverCol(null)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setActiveDragOverCol(null)
                    const id = e.dataTransfer.getData("candidateId")
                    if (id && draggedId === id) {
                      setDraggedId(null)
                      onUpdateStage(id, col.key as Candidate["stage"])
                    }
                  }}
                  className={cn(
                    "flex flex-col flex-1 min-w-[200px] max-w-[280px] rounded-2xl border bg-surface/60 p-3 transition-all duration-200 select-none",
                    isDragOver ? "border-primary bg-primary/5 ring-2 ring-primary/10 shadow-lg scale-[1.01]" : "border-border"
                  )}
                >
                  <div
                    className="flex items-center justify-between mb-3 pb-2.5 px-1 border-b"
                    style={{ borderBottomColor: accentColor }}
                  >
                    <span
                      className="text-[13px] font-bold"
                      style={{ color: accentColor }}
                    >
                      {col.label}
                    </span>
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted/40"
                      style={{ color: accentColor }}
                    >
                      {list.length}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[420px] pr-0.5 custom-scrollbar">
                    {list.length === 0 ? (
                      <div className="flex-1 border border-dashed border-border/60 rounded-lg flex items-center justify-center text-[10px] text-muted py-8 select-none">
                        Vide
                      </div>
                    ) : (
                      list.map((c) => (
                        <div
                          key={c.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("candidateId", c.id)
                            setDraggedId(c.id)
                            e.currentTarget.style.opacity = "0.4"
                          }}
                          onDragEnd={(e) => {
                            setDraggedId(null)
                            e.currentTarget.style.opacity = "1"
                          }}
                          onClick={() => onSelectCandidate(c)}
                          className="w-full flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm hover:border-primary/50 hover:shadow-md hover:scale-[1.005] active:scale-[0.995] transition-all duration-150 cursor-grab active:cursor-grabbing select-none"
                        >
                          {/* Header: Target Client and Experience */}
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <div className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[9px] ${c.logoColor} shrink-0`}>
                                {c.logoLetter}
                              </div>
                              <span className="text-[9px] font-bold text-muted uppercase tracking-wider truncate">
                                {c.targetClient}
                              </span>
                            </div>
                            <Badge variant="neutral" size="sm" className="shrink-0 font-bold uppercase tracking-wider text-[8px] px-1.5 py-0">
                              {c.experience}
                            </Badge>
                          </div>

                          {/* Candidate details */}
                          <div>
                            <h4 className="font-bold text-[12px] text-heading leading-tight hover:text-primary transition-colors truncate">
                              {c.name}
                            </h4>
                            <p className="text-[10px] text-body mt-0.5 font-medium">
                              {c.practice}
                            </p>
                          </div>

                          {/* Skills badges */}
                          <div className="flex flex-wrap gap-1 border-t border-border/50 pt-2.5">
                            {c.skills.slice(0, 2).map((skill) => (
                              <Badge key={skill} variant="neutral" size="sm" className="text-[8px] px-1.5 py-0">
                                {skill}
                              </Badge>
                            ))}
                            {c.skills.length > 2 && (
                              <Badge variant="neutral" size="sm" className="text-[8px] px-1.5 py-0">
                                +{c.skills.length - 2}
                              </Badge>
                            )}
                          </div>

                          {/* Match AI */}
                          <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[10px]">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted/80">Match AI</span>
                            <div className="flex items-center gap-1.5">
                              <div className="h-1 w-12 overflow-hidden rounded-full bg-border">
                                <div
                                  className="h-full rounded-full bg-success/80"
                                  style={{ width: `${c.aiMatch}%` }}
                                />
                              </div>
                              <span className="font-bold text-heading text-[10px]">{c.aiMatch}%</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Grid: AI matching Alerts & Staffing Needs */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        
        {/* Alertes Matching AI (via n8n) */}
        <div className="col-span-4 bg-surface rounded-xl border border-border/80 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="pb-2 border-b border-border/40 mb-3 select-none">
              <h2 className="text-sm font-bold text-heading font-heading">
                Alertes Matching AI (via n8n)
              </h2>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto max-h-[250px] pr-1">
              {alerts.map((alert) => {
                const targetC = candidates.find((c) => c.name.toLowerCase().includes(alert.consultant.toLowerCase())) || candidates[0]
                return (
                  <div
                    key={alert.id}
                    onClick={() => {
                      if (targetC) onSelectCandidate(targetC)
                    }}
                    className="p-3 bg-canvas/40 border border-border/60 hover:border-primary/50 hover:bg-canvas/60 rounded-xl flex items-start justify-between gap-3 group transition-all cursor-pointer transform hover:translate-y-[-1px]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-heading truncate group-hover:text-primary transition-colors">
                        {alert.consultant} - <span className="text-primary">{alert.match} Match</span>
                      </p>
                      <p className="text-[10px] text-body mt-0.5">
                        for {alert.role}
                      </p>
                      <p className="text-[9px] text-muted mt-1">
                        {alert.details}
                      </p>
                    </div>
                    {/* Blue robot head icon */}
                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 text-[#2554B8] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          <div className="text-[9px] text-muted text-center pt-2 mt-2 border-t border-border/20 select-none">
            Powered by n8n workflows & pgvector semantic matching
          </div>
        </div>

        {/* Besoins de Staffing & Candidats Suggérés */}
        <div className="col-span-8 bg-surface rounded-xl border border-border/80 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-border/40 mb-3 select-none">
              <h2 className="text-sm font-bold text-heading font-heading">
                Besoins de Staffing & Candidats Suggérés
              </h2>
            </div>

            <div className="overflow-x-auto max-h-[220px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-muted font-bold border-b border-border/40 select-none">
                    <th className="py-2 pb-2">Client</th>
                    <th className="py-2 pb-2">Rôle</th>
                    <th className="py-2 pb-2">Pratique</th>
                    <th className="py-2 pb-2">Urgence</th>
                    <th className="py-2 pb-2 text-right">Candidats Suggérés (Score AI)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredStaffing.map((need) => (
                    <tr key={need.id} className="hover:bg-canvas/30 transition-colors">
                      <td className="py-2.5 font-bold text-heading flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-slate-900 text-white font-black text-[9px] flex items-center justify-center select-none">
                          {need.client.charAt(0)}
                        </div>
                        <span>{need.client}</span>
                      </td>
                      <td className="py-2.5 text-body">{need.role}</td>
                      <td className="py-2.5 text-muted font-medium">{need.practice}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          need.urgence === "Haute"
                            ? "bg-rose-100 text-[#BE3E3E]"
                            : need.urgence === "Moyenne"
                            ? "bg-amber-100 text-[#C08A20]"
                            : "bg-slate-100 text-body"
                        }`}>
                          {need.urgence === "Haute" ? "Urgence" : need.urgence}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1 select-none">
                          {need.suggestedCandidates.map((sug, idx) => {
                            const cInfo = candidates.find((c) => c.name === sug.name) || candidates[0]
                            return (
                              <button
                                key={idx}
                                onClick={() => onSelectCandidate(cInfo)}
                                className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 hover:border-primary flex items-center justify-center font-bold text-[8px] text-primary relative group cursor-pointer"
                              >
                                {sug.avatarInitials}
                                <span className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-slate-800 text-white text-[9px] py-0.5 px-1.5 rounded whitespace-nowrap z-50">
                                  {sug.name} : {sug.score}%
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

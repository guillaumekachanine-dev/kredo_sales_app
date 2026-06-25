"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Candidate, RecruitmentDesktopDashboard, StaffingNeed } from "./dashboard/RecruitmentDesktopDashboard"
import { RecruitmentMobileDashboard } from "./dashboard/RecruitmentMobileDashboard"
import { CandidateDetailDrawer } from "./CandidateDetailDrawer"
import { EntityWorkspacePage } from "@/components/common/EntityWorkspacePage"
import { EntityWorkspaceHeader } from "@/components/common/EntityWorkspaceHeader"
import { EntityWorkspaceContent } from "@/components/common/EntityWorkspaceContent"
import { HeaderCalendar } from "@/components/ui/HeaderCalendar"
import { HeaderAlerts } from "@/components/ui/HeaderAlerts"

function StatChip({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex min-w-[8.75rem] shrink-0 flex-col justify-center rounded-[var(--radius-large)] border border-border bg-surface px-3 py-2"
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <span className="mt-1 whitespace-nowrap font-heading text-[18px] font-bold leading-none tracking-tight text-heading tabular-nums">
        {value}
      </span>
    </div>
  )
}

// Pre-configured mock recruitment data reflecting mockup contents
const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: "cand-1",
    name: "Consultant X",
    practice: "AI",
    experience: "Expert",
    aiMatch: 96,
    targetClient: "L'Oréal",
    logoLetter: "L",
    logoColor: "bg-black text-white",
    stage: "candidature",
    email: "consultant.x@kredo.dev",
    phone: "06 12 34 56 78",
    skills: ["pgvector", "RAG", "Next.js", "Supabase", "n8n"],
    summary: "Candidat identifié via n8n pour un fort matching sur les requêtes vectorielles (pgvector). Solide expérience sur l'intégration d'API RAG et modélisation sémantique.",
  },
  {
    id: "cand-2",
    name: "Consultant Y",
    practice: "Digital",
    experience: "Senior",
    aiMatch: 95,
    targetClient: "AXA Group",
    logoLetter: "A",
    logoColor: "bg-[#2554B8] text-white",
    stage: "tech",
    email: "consultant.y@kredo.dev",
    phone: "06 23 45 67 89",
    skills: ["Next.js 15", "TypeScript", "Tailwind CSS", "React Server Components"],
    summary: "Expert front-end Next.js/React. A validé l'entretien technique avec d'excellentes notes en performance (CWV / LCP / INP) et architecture modulaire.",
  },
  {
    id: "cand-3",
    name: "Consultant Z",
    practice: "Data",
    experience: "Confirme",
    aiMatch: 98,
    targetClient: "Air Liquide",
    logoLetter: "A",
    logoColor: "bg-[#2554B8] text-white",
    stage: "rh",
    email: "consultant.z@kredo.dev",
    phone: "06 34 56 78 90",
    skills: ["PostgreSQL", "dbt", "Airflow", "Supabase RLS", "SQL Engine"],
    summary: "Profil ingénieur de données avec de grandes compétences sur PostgreSQL avancé et RLS rules. Fortement recommandé pour l'intégration RLS multilocataire.",
  },
  {
    id: "cand-4",
    name: "Candidat A",
    practice: "Digital",
    experience: "Junior",
    aiMatch: 92,
    targetClient: "BNP Paribas",
    logoLetter: "B",
    logoColor: "bg-emerald-800 text-white",
    stage: "candidature",
    email: "candidate.a@gmail.com",
    phone: "06 45 67 89 01",
    skills: ["HTML5", "CSS3", "JavaScript", "React Basic"],
    summary: "Jeune diplômé motivé, bonne maîtrise de l'écosystème React et du flat design. Recommandé pour des missions d'intégration front-end simples.",
  },
  {
    id: "cand-5",
    name: "Candidat B",
    practice: "Cloud",
    experience: "Senior",
    aiMatch: 92,
    targetClient: "TotalEnergies",
    logoLetter: "T",
    logoColor: "bg-amber-600 text-white",
    stage: "tech",
    email: "candidate.b@outlook.com",
    phone: "06 56 78 90 12",
    skills: ["Docker", "Kubernetes", "AWS", "Terraform", "CI/CD"],
    summary: "Ingénieur DevOps expérimenté. Fortes compétences sur le déploiement cloud AWS et automatisation de pipelines d'intégration continue.",
  },
  {
    id: "cand-6",
    name: "Candidat C",
    practice: "AI",
    experience: "Expert",
    aiMatch: 95,
    targetClient: "L'Oréal",
    logoLetter: "L",
    logoColor: "bg-black text-white",
    stage: "tech",
    email: "candidate.c@kredo.dev",
    phone: "06 67 89 01 23",
    skills: ["Python", "PyTorch", "LLMs", "Vector Indexing"],
    summary: "Spécialiste NLP & Vector Stores. Profil très recherché pour optimiser la pertinence des réponses RAG sur le corpus documentaire L'Oréal.",
  },
  {
    id: "cand-7",
    name: "Candidat D",
    practice: "AI",
    experience: "Confirme",
    aiMatch: 95,
    targetClient: "Client",
    logoLetter: "C",
    logoColor: "bg-slate-700 text-white",
    stage: "offre",
    email: "candidate.d@kredo.dev",
    phone: "06 78 90 12 34",
    skills: ["LangChain", "OpenAI APIs", "Prompt Engineering"],
    summary: "Candidat en attente de retour d'offre. A conçu plusieurs playbooks de prompt engineering et des agents autonomes via LangChain.",
  },
  {
    id: "cand-8",
    name: "Candidat E",
    practice: "Cloud",
    experience: "Senior",
    aiMatch: 90,
    targetClient: "AXA Group",
    logoLetter: "A",
    logoColor: "bg-[#2554B8] text-white",
    stage: "embauche",
    email: "candidate.e@kredo.dev",
    phone: "06 89 01 23 45",
    skills: ["Azure", "Google Cloud", "DevSecOps"],
    summary: "Embauche validée pour le compte AXA Group. Démarrage prévu le mois prochain pour structurer la gouvernance cloud et sécurité.",
  },
]

const STAFFING_NEEDS: StaffingNeed[] = [
  {
    id: "need-1",
    client: "L'Oréal",
    role: "Lead Dev Next.js",
    practice: "Digital",
    urgence: "Haute",
    suggestedCandidates: [
      { name: "Consultant Y", avatarInitials: "CY", score: 95 },
      { name: "Candidat A", avatarInitials: "CA", score: 92 },
    ],
  },
  {
    id: "need-2",
    client: "AXA Group",
    role: "Data Engineer",
    practice: "Data",
    urgence: "Moyenne",
    suggestedCandidates: [
      { name: "Consultant Z", avatarInitials: "CZ", score: 98 },
    ],
  },
  {
    id: "need-3",
    client: "Air Liquide",
    role: "Architecte Cloud",
    practice: "Cloud",
    urgence: "Haute",
    suggestedCandidates: [
      { name: "Candidat B", avatarInitials: "CB", score: 92 },
      { name: "Candidat E", avatarInitials: "CE", score: 90 },
    ],
  },
  {
    id: "need-4",
    client: "BNP Paribas",
    role: "Ingénieur RAG / LLM",
    practice: "AI",
    urgence: "Moyenne",
    suggestedCandidates: [
      { name: "Consultant X", avatarInitials: "CX", score: 96 },
      { name: "Candidat C", avatarInitials: "CC", score: 95 },
    ],
  },
]

interface RecruitmentDashboardWrapperProps {
  device: "desktop" | "mobile"
}

export function RecruitmentDashboardWrapper({ device }: RecruitmentDashboardWrapperProps) {
  const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)

  // Callback to update candidate recruitment stage
  const handleUpdateStage = (id: string, stage: Candidate["stage"]) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const updated = { ...c, stage }
        // Keep active drawer candidate details synchronized
        if (selectedCandidate && selectedCandidate.id === id) {
          setSelectedCandidate(updated)
        }
        return updated
      })
    )
  }

  const activeCount = candidates.filter((c) => c.stage !== "embauche").length

  return (
    <EntityWorkspacePage>
      <EntityWorkspaceHeader
        title="Pilotage du Recrutement"
        kpis={
          <>
            <StatChip label="Candidats Actifs" value={activeCount} />
            <StatChip label="Offres Acceptées" value="85%" />
            <StatChip label="TTH Moyen" value="22 jours" />
          </>
        }
        actions={
          <div className="flex items-center gap-4">
            <HeaderCalendar />
            <HeaderAlerts />
            {/* User Avatar */}
            <div className="flex items-center gap-2">
              <div className="w-8.5 h-8.5 rounded-full bg-primary border border-border flex items-center justify-center font-bold text-xs text-white">
                GK
              </div>
              <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        }
      />

      <EntityWorkspaceContent
        desktopView={
          device === "desktop" ? (
            <RecruitmentDesktopDashboard
              candidates={candidates}
              staffingNeeds={STAFFING_NEEDS}
              onSelectCandidate={setSelectedCandidate}
              onUpdateStage={handleUpdateStage}
            />
          ) : null
        }
        mobileView={
          device === "mobile" ? (
            <RecruitmentMobileDashboard
              candidates={candidates}
              onSelectCandidate={setSelectedCandidate}
            />
          ) : null
        }
      />

      {/* Candidate side slider details drawer */}
      <CandidateDetailDrawer
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        onUpdateStage={handleUpdateStage}
      />
    </EntityWorkspacePage>
  )
}

"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  buildAnalyzeFunnel,
  FUNNEL_STATIC_SNAPSHOT_CAVEAT,
  type AnalyzeFunnelRulesResult,
  type CandidateSnapshotRow,
  type HiringProcessSnapshotRow,
  type StaffingFunnelSnapshotRow,
} from "./recruitment-margin-rules"

export type AnalyzeFunnelResult = AnalyzeFunnelRulesResult & {
  generatedAt: string
  sourceIssues: string[]
}

type QueryResult<T> = { data: T[]; error: string | null }

type HiringProcessRow = {
  id: string
  current_step: string | null
  status: string | null
  created_at: string | null
}

type OpportunityCandidateRow = {
  id: string
  status: string | null
  created_at: string | null
}

type CandidateRow = {
  id: string
  status: string | null
  source: string | null
}

async function safeRead<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<QueryResult<T>> {
  const { data, error } = await query
  return { data: data ?? [], error: error ? `${label}: ${error.message}` : null }
}

export async function getAnalyzeFunnel(): Promise<AnalyzeFunnelResult> {
  const generatedAt = new Date().toISOString()
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return {
      generatedAt,
      hiringFunnel: [],
      staffingFunnel: [],
      summary: { activeHiringProcesses: 0, staffedCandidates: 0, candidatesTotal: 0 },
      caveat: FUNNEL_STATIC_SNAPSHOT_CAVEAT,
      sourceIssues: ["Non authentifié."],
    }
  }

  const [hiringProcesses, opportunityCandidates, candidates] = await Promise.all([
    safeRead<HiringProcessRow>(
      "Processus recrutement",
      supabase
        .from("candidate_hiring_processes")
        .select("id,current_step,status,created_at")
        .order("created_at", { ascending: false })
        .limit(1000)
        .returns<HiringProcessRow[]>(),
    ),
    safeRead<OpportunityCandidateRow>(
      "Positionnements candidats",
      supabase
        .from("opportunity_candidates")
        .select("id,status,created_at")
        .order("created_at", { ascending: false })
        .limit(1000)
        .returns<OpportunityCandidateRow[]>(),
    ),
    safeRead<CandidateRow>(
      "Candidats",
      supabase
        .from("candidates")
        .select("id,status,source")
        .limit(1000)
        .returns<CandidateRow[]>(),
    ),
  ])

  const mapped = buildAnalyzeFunnel({
    hiringProcesses: hiringProcesses.data.map<HiringProcessSnapshotRow>((row) => ({
      id: row.id,
      currentStep: row.current_step,
      status: row.status,
      createdAt: row.created_at,
    })),
    opportunityCandidates: opportunityCandidates.data.map<StaffingFunnelSnapshotRow>((row) => ({
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
    })),
    candidates: candidates.data.map<CandidateSnapshotRow>((row) => ({
      id: row.id,
      status: row.status,
      source: row.source,
    })),
  })

  return {
    generatedAt,
    ...mapped,
    sourceIssues: [hiringProcesses, opportunityCandidates, candidates]
      .map((result) => result.error)
      .filter((issue): issue is string => Boolean(issue)),
  }
}

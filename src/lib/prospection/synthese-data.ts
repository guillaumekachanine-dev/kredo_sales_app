import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  getOpportunityStageLabel,
  isTerminalOpportunityStage,
} from "@/lib/opportunities/stages"
import { formatEuroCompact } from "@/lib/formatters"

// ─────────────────────────────────────────────────────────────────────────────
//  Synthèse de prospection — couche données (DÉCISIONNEL portefeuille)
//
//  La Synthèse répond à « où regarder maintenant » à l'échelle du portefeuille
//  (l'action par compte/échéance vit dans Suivi ; l'action par compte dans le hub).
//
//  Données RÉELLES (agrégats Supabase, RLS workspace) pour les blocs BI :
//   - répartition cycle de vie  → `companies.lifecycle_status`
//   - secteurs représentés      → `companies.sector`
//   - pipeline pondéré          → `opportunities.weighted_gain` (colonne générée)
//   - prospects à examiner      → `companies` (ordre stable par nom/id)
//
//  Agrégation côté app : volumétrie faible (≈96 comptes, ≈9 opps) → fetch minimal
//  + reduce JS, plus simple qu'une vue. À l'échelle (milliers de lignes), basculer
//  sur une vue SQL agrégée (`v_prospection_portfolio`) plutôt que tout rapatrier.
//
//  ⚠️ Le RADAR DE SIGNAUX reste mocké (// SEAM) : aucune table `signals` n'existe
//  encore. Source cible : flux n8n (veille) → table dédiée, ORDER BY detected_at.
// ─────────────────────────────────────────────────────────────────────────────

export type SyntheseStatus = "danger" | "warning" | "success" | "neutral"

export type LifecycleBucket = {
  key: string
  label: string
  count: number
  status: SyntheseStatus
}

export type SectorHeat = {
  sector: string
  count: number
}

export type PipelineStage = {
  key: string
  label: string
  count: number
  weighted: number
}

export type AccountToActivate = {
  id: string
  name: string
  sector: string
  lifecycleLabel: string
}

export type SignalRadarItem = {
  id: string
  company: string
  companyId?: string
  kind: string
  detail: string
  dateLabel: string
  status: SyntheseStatus
}

export type SyntheseKpi = {
  id: string
  label: string
  value: string
  status: SyntheseStatus
  hint?: string
}

export type SyntheseData = {
  kpis: SyntheseKpi[]
  lifecycle: LifecycleBucket[]
  sectorHeat: SectorHeat[]
  pipeline: { totalWeighted: number; openCount: number; stages: PipelineStage[] }
  accountsToActivate: AccountToActivate[]
  signalRadar: SignalRadarItem[]
}

// ─── Référentiels d'affichage (alignés CLAUDE.md / schéma) ────────────────────

const LIFECYCLE_LABEL: Record<string, string> = {
  cible: "Cibles",
  prospect: "Prospects",
  client: "Clients",
  client_actif: "Clients actifs",
  client_dormant: "Clients dormants",
  ancien_client: "Anciens clients",
  partenaire: "Partenaires",
  non_prioritaire: "Non prioritaires",
  exclu: "Exclus",
}

const LIFECYCLE_TONE: Record<string, SyntheseStatus> = {
  client: "success",
  client_actif: "success",
  partenaire: "success",
  prospect: "warning",
  cible: "neutral",
  client_dormant: "warning",
  ancien_client: "neutral",
  non_prioritaire: "neutral",
  exclu: "danger",
}

// ─── Loose client (même approche que intelligence-data.ts) ────────────────────

type LooseQuery<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>
type LooseTable = { select<T>(columns: string): LooseQuery<T> }
type LooseClient = { from(table: string): LooseTable }

type CompanyRow = {
  id: string
  name: string
  sector: string | null
  lifecycle_status: string
}

type OpportunityRow = {
  stage: string | null
  weighted_gain: number | string | null
}

function toNumber(value: number | string | null): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}


// ─── Radar de signaux — MOCK (// SEAM: flux veille n8n → table `signals`) ──────

const MOCK_RADAR: SignalRadarItem[] = [
  { id: "sr1", company: "BNP Paribas", companyId: "bnp", kind: "Levée / investissement", detail: "50 M€ investis dans le pôle digital.", dateLabel: "Il y a 2h", status: "success" },
  { id: "sr2", company: "L'Oréal", companyId: "loreal", kind: "Nomination", detail: "Nouveau CTO détecté sur LinkedIn.", dateLabel: "Ce matin", status: "warning" },
  { id: "sr3", company: "AXA Group", companyId: "axa", kind: "Recrutement", detail: "Vague de postes React / Next.js ouverte.", dateLabel: "Il y a 5h", status: "warning" },
  { id: "sr4", company: "Generali", companyId: "generali", kind: "Actualité", detail: "Publication du plan IT 2026.", dateLabel: "Hier", status: "neutral" },
]

// ─── Entrée publique ──────────────────────────────────────────────────────────

export async function getSyntheseData(): Promise<SyntheseData> {
  const supabase = (await createClient()) as unknown as LooseClient

  const [companiesResult, opportunitiesResult] = await Promise.all([
    supabase.from("companies").select<CompanyRow>("id,name,sector,lifecycle_status"),
    supabase.from("opportunities").select<OpportunityRow>("stage,weighted_gain"),
  ])

  const companies = companiesResult.data ?? []
  const opportunities = opportunitiesResult.data ?? []

  // ── Répartition cycle de vie ────────────────────────────────────────────────
  const lifeCounts = new Map<string, number>()
  for (const c of companies) {
    lifeCounts.set(c.lifecycle_status, (lifeCounts.get(c.lifecycle_status) ?? 0) + 1)
  }
  const lifecycle: LifecycleBucket[] = [...lifeCounts.entries()]
    .map(([key, count]) => ({
      key,
      label: LIFECYCLE_LABEL[key] ?? key,
      count,
      status: LIFECYCLE_TONE[key] ?? "neutral",
    }))
    .sort((a, b) => b.count - a.count)

  // ── Secteurs représentés (top par nombre de comptes) ───────────────────────
  const sectorAgg = new Map<string, number>()
  for (const c of companies) {
    const sector = c.sector?.trim() || "Secteur non renseigné"
    sectorAgg.set(sector, (sectorAgg.get(sector) ?? 0) + 1)
  }
  const sectorHeat: SectorHeat[] = [...sectorAgg.entries()]
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // ── Pipeline pondéré ────────────────────────────────────────────────────────
  const stageAgg = new Map<string, { count: number; weighted: number }>()
  let totalWeighted = 0
  let openCount = 0
  for (const o of opportunities) {
    const stage = o.stage ?? "detection"
    if (isTerminalOpportunityStage(stage)) continue
    const weighted = toNumber(o.weighted_gain) ?? 0
    const entry = stageAgg.get(stage) ?? { count: 0, weighted: 0 }
    entry.count += 1
    entry.weighted += weighted
    stageAgg.set(stage, entry)
    totalWeighted += weighted
    openCount += 1
  }
  const stages: PipelineStage[] = [...stageAgg.entries()]
    .map(([key, v]) => ({ key, label: getOpportunityStageLabel(key), count: v.count, weighted: v.weighted }))
    .sort((a, b) => b.weighted - a.weighted)

  // ── Prospects à examiner (ordre stable, sans note synthétique) ──────────────
  const accountsToActivate: AccountToActivate[] = companies
    .filter((c) => c.lifecycle_status === "prospect")
    .map((c) => ({
      id: c.id,
      name: c.name,
      sector: c.sector?.trim() || "—",
      lifecycleLabel: LIFECYCLE_LABEL[c.lifecycle_status] ?? c.lifecycle_status,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr") || a.id.localeCompare(b.id))
    .slice(0, 6)

  // ── KPI décisionnels ────────────────────────────────────────────────────────
  const activeClients = (lifeCounts.get("client") ?? 0) + (lifeCounts.get("client_actif") ?? 0)
  const targets = lifeCounts.get("prospect") ?? 0
  const kpis: SyntheseKpi[] = [
    { id: "k-portfolio", label: "Comptes au portefeuille", value: String(companies.length), status: "neutral" },
    { id: "k-targets", label: "Cibles & prospects à activer", value: String(targets), status: targets > 0 ? "warning" : "neutral" },
    { id: "k-pipeline", label: "Pipeline pondéré ouvert", value: formatEuroCompact(totalWeighted), status: "success", hint: `${openCount} opp. ouvertes` },
    { id: "k-clients", label: "Clients actifs", value: String(activeClients), status: "success" },
  ]

  return {
    kpis,
    lifecycle,
    sectorHeat,
    pipeline: { totalWeighted, openCount, stages },
    accountsToActivate,
    // SEAM: remplacer par le flux de veille réel quand la table `signals` existe.
    signalRadar: MOCK_RADAR,
  }
}

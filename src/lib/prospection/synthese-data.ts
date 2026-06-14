import { createClient } from "@/lib/supabase/server"

// ─────────────────────────────────────────────────────────────────────────────
//  Synthèse de prospection — couche données (DÉCISIONNEL portefeuille)
//
//  La Synthèse répond à « où regarder maintenant » à l'échelle du portefeuille
//  (l'action par compte/échéance vit dans Suivi ; l'action par compte dans le hub).
//
//  Données RÉELLES (agrégats Supabase, RLS workspace) pour les blocs BI :
//   - répartition cycle de vie  → `companies.lifecycle_status`
//   - secteurs chauds           → `companies.sector` (+ score moyen)
//   - pipeline pondéré          → `opportunities.weighted_gain` (colonne générée)
//   - comptes à activer         → `companies` (cible/prospect triés par ai_score)
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
  avgScore: number | null
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
  score: number | null
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
  client_actif: "Clients actifs",
  client_dormant: "Clients dormants",
  ancien_client: "Anciens clients",
  partenaire: "Partenaires",
  non_prioritaire: "Non prioritaires",
  exclu: "Exclus",
}

const LIFECYCLE_TONE: Record<string, SyntheseStatus> = {
  client_actif: "success",
  partenaire: "success",
  prospect: "warning",
  cible: "neutral",
  client_dormant: "warning",
  ancien_client: "neutral",
  non_prioritaire: "neutral",
  exclu: "danger",
}

const STAGE_LABEL: Record<string, string> = {
  detection: "Détection",
  qualification: "Qualification",
  besoin_confirme: "Besoin confirmé",
  recherche_profil: "Recherche profil",
  cv_envoyes: "CV envoyés",
  entretien_client: "Entretien client",
  negociation: "Négociation",
  gagne: "Gagné",
  perdu: "Perdu",
  abandonne: "Abandonné",
  // legacy tolérés en lecture (CLAUDE.md) — ne pas réutiliser à l'écriture
  en_cours: "En cours",
  cv_sent: "CV envoyés",
  rt: "Entretien client",
  win: "Gagné",
  lost: "Perdu",
  non_traitee: "Non traitée",
}

// stages considérés « fermés » → exclus du pipeline ouvert
const CLOSED_STAGES = new Set(["gagne", "perdu", "abandonne", "non_traitee", "win", "lost"])

// ─── Loose client (même approche que intelligence-data.ts) ────────────────────

type LooseQuery<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>
type LooseTable = { select<T>(columns: string): LooseQuery<T> }
type LooseClient = { from(table: string): LooseTable }

type CompanyRow = {
  id: string
  name: string
  sector: string | null
  lifecycle_status: string
  ai_score: number | string | null
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

function formatEuro(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)} k€`
  return `${Math.round(value)} €`
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
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
    supabase.from("companies").select<CompanyRow>("id,name,sector,lifecycle_status,ai_score"),
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

  // ── Secteurs chauds (top par nb de comptes, score moyen) ────────────────────
  const sectorAgg = new Map<string, { count: number; scoreSum: number; scoreN: number }>()
  for (const c of companies) {
    const sector = c.sector?.trim() || "Secteur non renseigné"
    const entry = sectorAgg.get(sector) ?? { count: 0, scoreSum: 0, scoreN: 0 }
    entry.count += 1
    const score = toNumber(c.ai_score)
    if (score !== null) {
      entry.scoreSum += score
      entry.scoreN += 1
    }
    sectorAgg.set(sector, entry)
  }
  const sectorHeat: SectorHeat[] = [...sectorAgg.entries()]
    .map(([sector, v]) => ({ sector, count: v.count, avgScore: v.scoreN ? round1(v.scoreSum / v.scoreN) : null }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // ── Pipeline pondéré ────────────────────────────────────────────────────────
  const stageAgg = new Map<string, { count: number; weighted: number }>()
  let totalWeighted = 0
  let openCount = 0
  for (const o of opportunities) {
    const stage = o.stage ?? "detection"
    if (CLOSED_STAGES.has(stage)) continue
    const weighted = toNumber(o.weighted_gain) ?? 0
    const entry = stageAgg.get(stage) ?? { count: 0, weighted: 0 }
    entry.count += 1
    entry.weighted += weighted
    stageAgg.set(stage, entry)
    totalWeighted += weighted
    openCount += 1
  }
  const stages: PipelineStage[] = [...stageAgg.entries()]
    .map(([key, v]) => ({ key, label: STAGE_LABEL[key] ?? key, count: v.count, weighted: v.weighted }))
    .sort((a, b) => b.weighted - a.weighted)

  // ── Comptes à activer (cibles/prospects à plus fort score) ──────────────────
  const accountsToActivate: AccountToActivate[] = companies
    .filter((c) => c.lifecycle_status === "cible" || c.lifecycle_status === "prospect")
    .map((c) => ({
      id: c.id,
      name: c.name,
      sector: c.sector?.trim() || "—",
      score: toNumber(c.ai_score),
      lifecycleLabel: LIFECYCLE_LABEL[c.lifecycle_status] ?? c.lifecycle_status,
    }))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    .slice(0, 6)

  // ── KPI décisionnels ────────────────────────────────────────────────────────
  const activeClients = lifeCounts.get("client_actif") ?? 0
  const targets = (lifeCounts.get("cible") ?? 0) + (lifeCounts.get("prospect") ?? 0)
  const scored = companies.map((c) => toNumber(c.ai_score)).filter((s): s is number => s !== null)
  const avgScore = scored.length ? round1(scored.reduce((a, b) => a + b, 0) / scored.length) : null

  const kpis: SyntheseKpi[] = [
    { id: "k-portfolio", label: "Comptes au portefeuille", value: String(companies.length), status: "neutral" },
    { id: "k-targets", label: "Cibles & prospects à activer", value: String(targets), status: targets > 0 ? "warning" : "neutral" },
    { id: "k-pipeline", label: "Pipeline pondéré ouvert", value: formatEuro(totalWeighted), status: "success", hint: `${openCount} opp. ouvertes` },
    { id: "k-score", label: "Score moyen portefeuille", value: avgScore !== null ? `${avgScore}/5` : "—", status: "neutral", hint: `${scored.length} comptes scorés` },
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

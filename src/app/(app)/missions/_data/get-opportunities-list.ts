import { createClient } from "@/lib/supabase/server"
import { MissionsListRow } from "@/components/missions/MissionsListView"
import {
  STAGE_LABELS,
  PRIORITY_LABELS,
  TYPE_OPTIONS,
} from "@/components/missions/opportunity-detail/opportunity-detail-options"
import { isOpenOpportunityStage, isTerminalOpportunityStage } from "@/lib/opportunities/stages"
import { formatEuro, formatDateShort } from "@/lib/formatters"
import type { Json } from "@/types/database"

interface CompanyInfo {
  name: string
  website?: string | null
  metadata?: Json | null
}

interface DBQueryResult {
  id: string
  title: string
  stage: string
  priority: string
  conviction: number
  acv: number | null
  estimated_gain: number | null
  target_daily_rate: number | null
  target_close_date: string | null
  start_date: string | null
  updated_at: string
  practice: string | null
  opportunity_type: string | null
  next_action_at: string | null
  source: string | null
  seniority: string | null
  location: string | null
  remote_policy: string | null
  opened_at: string | null
  required_headcount: number
  requires_staffing: boolean
  companies: CompanyInfo | CompanyInfo[] | null
}

interface MappedRow extends MissionsListRow {
  updatedAt: string
}

type SupabaseError = { message: string; code?: string; details?: string; hint?: string }
type OpportunitiesQuery = PromiseLike<{ data: DBQueryResult[] | null; error: SupabaseError | null }> & {
  select(columns: string): OpportunitiesQuery
  order(column: string, options?: { ascending?: boolean }): OpportunitiesQuery
}

type LooseSupabaseClient = {
  from(table: "opportunities"): OpportunitiesQuery
}

function getCompanyName(companies: DBQueryResult["companies"]): string {
  if (!companies) return "Compte non renseigné"
  if (Array.isArray(companies)) return companies[0]?.name ?? "Compte non renseigné"
  return companies.name ?? "Compte non renseigné"
}

function mapStageToStatus(stage: string): MissionsListRow["status"] {
  if (stage === "gagne") return "won"
  if (isTerminalOpportunityStage(stage)) return "lost"
  if (isOpenOpportunityStage(stage)) return "active"
  return "pending"
}

export async function getOpportunitiesList(): Promise<MissionsListRow[]> {
  try {
    const supabase = (await createClient()) as unknown as LooseSupabaseClient

    const { data, error } = await supabase
      .from("opportunities")
      .select(`
        id,
        title,
        stage,
        priority,
        conviction,
        acv,
        estimated_gain,
        target_daily_rate,
        target_close_date,
        start_date,
        updated_at,
        practice,
        opportunity_type,
        next_action_at,
        source,
        seniority,
        location,
        remote_policy,
        opened_at,
        required_headcount,
        requires_staffing,
        companies (
          name,
          website,
          metadata
        )
      `)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Supabase error:", error?.message, error?.code, error?.details, error?.hint)
      return []
    }

    const mapped: MappedRow[] = (data ?? []).map((item) => {
      const amountVal = item.acv ?? item.estimated_gain
      const dateVal = item.target_close_date ?? item.start_date
      let dateStr = formatDateShort(dateVal)
      if (dateStr === "—" && item.next_action_at) {
        dateStr = `Action : ${formatDateShort(item.next_action_at)}`
      }

      const tagParts: string[] = []
      if (item.practice) tagParts.push(item.practice)
      if (item.opportunity_type) {
        const typeOpt = TYPE_OPTIONS.find((option) => option.value === item.opportunity_type)
        const typeLabel = typeOpt ? typeOpt.label : item.opportunity_type.replaceAll("_", " ")
        tagParts.push(`${typeLabel.charAt(0).toUpperCase()}${typeLabel.slice(1)}`)
      }

      const tag = tagParts.length > 0
        ? [...tagParts, `${item.conviction}%`].join(" · ")
        : `${STAGE_LABELS[item.stage] || item.stage} · ${item.conviction}% · ${PRIORITY_LABELS[item.priority] || `Priorité ${item.priority}`}`

      const compRecord = Array.isArray(item.companies) ? item.companies[0] : item.companies
      const clientWebsite = compRecord?.website ?? null
      const clientLogoPath = compRecord?.metadata && typeof compRecord.metadata === "object" && !Array.isArray(compRecord.metadata)
        ? ("logo_path" in compRecord.metadata && typeof compRecord.metadata.logo_path === "string" ? compRecord.metadata.logo_path : null)
        : null

      return {
        entityId: item.id,
        entityType: "opportunite",
        title: item.title,
        subtitle: item.practice || undefined,
        client: getCompanyName(item.companies),
        clientWebsite,
        clientLogoPath,
        amount: formatEuro(amountVal),
        date: dateStr,
        tag,
        status: mapStageToStatus(item.stage),
        updatedAt: item.updated_at,
        conviction: item.conviction,
        acv: item.acv,
        estimatedGain: item.estimated_gain,
        stage: item.stage,
        priority: item.priority,
        targetDailyRate: item.target_daily_rate,
        targetCloseDate: item.target_close_date,
        nextActionAt: item.next_action_at,
        source: item.source,
        seniority: item.seniority,
        location: item.location,
        remotePolicy: item.remote_policy,
        openedAt: item.opened_at,
        requiredHeadcount: item.required_headcount,
        requiresStaffing: item.requires_staffing,
      }
    })

    mapped.sort((a, b) => {
      const aIsOpen = a.status === "active" || a.status === "pending"
      const bIsOpen = b.status === "active" || b.status === "pending"

      if (aIsOpen && !bIsOpen) return -1
      if (!aIsOpen && bIsOpen) return 1

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    return mapped.map((row) => ({
      entityId: row.entityId,
      entityType: row.entityType,
      title: row.title,
      subtitle: row.subtitle,
      status: row.status,
      amount: row.amount,
      date: row.date,
      client: row.client,
      clientWebsite: row.clientWebsite,
      clientLogoPath: row.clientLogoPath,
      tag: row.tag,
      conviction: row.conviction,
      acv: row.acv,
      estimatedGain: row.estimatedGain,
      stage: row.stage,
      priority: row.priority,
      targetDailyRate: row.targetDailyRate,
      targetCloseDate: row.targetCloseDate,
      nextActionAt: row.nextActionAt,
      updatedAt: row.updatedAt,
      source: row.source,
      seniority: row.seniority,
      location: row.location,
      remotePolicy: row.remotePolicy,
      openedAt: row.openedAt,
      requiredHeadcount: row.requiredHeadcount,
      requiresStaffing: row.requiresStaffing,
    }))
  } catch (err) {
    console.error("Unhandled error in getOpportunitiesList:", err)
    return []
  }
}

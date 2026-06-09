import { createClient } from "@/lib/supabase/server"
import { MissionsListRow } from "@/components/missions/MissionsListView"
import {
  STAGE_LABELS,
  PRIORITY_LABELS,
  TYPE_OPTIONS,
} from "@/components/missions/opportunity-detail/opportunity-detail-options"

function formatEuro(amount: number | null): string {
  if (amount === null || amount === undefined) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return "—"
  const formatted = date.toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  })
  return `${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}`.replace(".", "")
}

interface CompanyInfo {
  name: string
}

interface DBQueryResult {
  id: string
  title: string
  stage: string
  priority: string
  conviction: number
  acv: number | null
  estimated_gain: number | null
  target_close_date: string | null
  start_date: string | null
  updated_at: string
  practice: string | null
  opportunity_type: string | null
  next_action_at: string | null
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
  if (["win", "gagne"].includes(stage)) return "won"
  if (["lost", "perdu", "abandonne"].includes(stage)) return "lost"
  if (["en_cours", "cv_sent", "rt", "qualification", "besoin_confirme", "recherche_profil", "cv_envoyes", "entretien_client", "negociation"].includes(stage)) return "active"
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
        target_close_date,
        start_date,
        updated_at,
        practice,
        opportunity_type,
        next_action_at,
        companies (
          name
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
      let dateStr = formatDate(dateVal)
      if (dateStr === "—" && item.next_action_at) {
        dateStr = `Action : ${formatDate(item.next_action_at)}`
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

      return {
        entityId: item.id,
        entityType: "opportunite",
        title: item.title,
        subtitle: item.practice || undefined,
        client: getCompanyName(item.companies),
        amount: formatEuro(amountVal),
        date: dateStr,
        tag,
        status: mapStageToStatus(item.stage),
        updatedAt: item.updated_at,
      }
    })

    mapped.sort((a, b) => {
      const aIsOpen = a.status === "active" || a.status === "pending"
      const bIsOpen = b.status === "active" || b.status === "pending"

      if (aIsOpen && !bIsOpen) return -1
      if (!aIsOpen && bIsOpen) return 1

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    return mapped.map(({ updatedAt: _updatedAt, ...row }) => row)
  } catch (err) {
    console.error("Unhandled error in getOpportunitiesList:", err)
    return []
  }
}

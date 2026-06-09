import { createClient } from "@/lib/supabase/server"
import { MissionsListRow } from "@/components/missions/MissionsListView"

// Formate un montant en euros FR
function formatEuro(amount: number | null): string {
  if (amount === null || amount === undefined) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
}

// Formate une date ISO en format court FR (ex: "Juil 2026")
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return "—"
  const formatted = date.toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  })
  const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1)
  return capitalized.replace(".", "")
}

import {
  STAGE_LABELS,
  PRIORITY_LABELS,
  TYPE_OPTIONS,
} from "@/components/missions/opportunity-detail/opportunity-detail-options"

interface AccountInfo {
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
  crm_accounts: AccountInfo | AccountInfo[] | null
}

interface MappedRow extends MissionsListRow {
  updatedAt: string
}

export async function getOpportunitiesList(): Promise<MissionsListRow[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("sales_opportunities")
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
        crm_accounts (
          name
        )
      `)

    if (error) {
      console.error("Error fetching opportunities from Supabase:", error)
      return []
    }

    if (!data) return []

    // Cast the returned data from postgrest query
    const dbRows = data as unknown as DBQueryResult[]

    const mapped: MappedRow[] = dbRows.map((item) => {
      // client
      const account = item.crm_accounts
      let clientName = "Compte non renseigné"
      if (account) {
        if (Array.isArray(account)) {
          if (account[0]?.name) {
            clientName = account[0].name
          }
        } else if (account.name) {
          clientName = account.name
        }
      }

      // amount: priorité à acv, sinon estimated_gain
      const amountVal = item.acv ?? item.estimated_gain
      const amountStr = formatEuro(amountVal)

      // date: priorité à target_close_date, sinon start_date, sinon next_action_at
      const dateVal = item.target_close_date ?? item.start_date
      let dateStr = formatDate(dateVal)
      if (dateStr === "—" && item.next_action_at) {
        dateStr = `Action : ${formatDate(item.next_action_at)}`
      }

      // tag: [practice] · [type] · [conviction]% (si practice/type renseignés), sinon fallback stage/priorité
      const tagParts: string[] = []
      if (item.practice) {
        tagParts.push(item.practice)
      }
      if (item.opportunity_type) {
        const typeOpt = TYPE_OPTIONS.find((o) => o.value === item.opportunity_type)
        const typeLabel = typeOpt ? typeOpt.label : item.opportunity_type.replace("_", " ")
        const typeLabelCap = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)
        tagParts.push(typeLabelCap)
      }

      let tagStr = ""
      if (tagParts.length > 0) {
        tagParts.push(`${item.conviction}%`)
        tagStr = tagParts.join(" · ")
      } else {
        const stageLabel = STAGE_LABELS[item.stage] || item.stage
        const priorityLabel = PRIORITY_LABELS[item.priority] || `Priorité ${item.priority}`
        tagStr = `${stageLabel} · ${item.conviction}% · ${priorityLabel}`
      }

      // status mapping
      let status: MissionsListRow["status"] = "pending"
      if (item.stage === "win") {
        status = "won"
      } else if (item.stage === "lost") {
        status = "lost"
      } else if (["en_cours", "cv_sent", "rt"].includes(item.stage)) {
        status = "active"
      } else if (item.stage === "non_traitee") {
        status = "pending"
      }

      return {
        entityId: item.id,
        entityType: "opportunite",
        title: item.title,
        subtitle: item.practice || undefined,
        client: clientName,
        amount: amountStr,
        date: dateStr,
        tag: tagStr,
        status,
        updatedAt: item.updated_at,
      }
    })

    // Trier :
    // - D'abord les ouvertes (status matches "active" ou "pending")
    // - Ensuite par date de mise à jour décroissante (updatedAt desc)
    mapped.sort((a, b) => {
      const aIsOpen = a.status === "active" || a.status === "pending"
      const bIsOpen = b.status === "active" || b.status === "pending"

      if (aIsOpen && !bIsOpen) return -1
      if (!aIsOpen && bIsOpen) return 1

      const dateA = new Date(a.updatedAt).getTime()
      const dateB = new Date(b.updatedAt).getTime()
      return dateB - dateA
    })

    // Retourner le tableau propre typé sans updatedAt
    return mapped.map((row) => {
      const cleanRow: MissionsListRow = {
        entityId: row.entityId,
        entityType: row.entityType,
        title: row.title,
        client: row.client,
        amount: row.amount,
        date: row.date,
        tag: row.tag,
        status: row.status,
      }
      return cleanRow
    })
  } catch (err) {
    console.error("Unhandled error in getOpportunitiesList:", err)
    return []
  }
}

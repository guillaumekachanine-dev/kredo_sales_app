import { createClient } from "@/lib/supabase/server"
import { MissionsListRow } from "@/components/missions/MissionsListView"

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

interface PersonInfo {
  full_name: string | null
  first_name: string | null
  last_name: string | null
}

interface CollaboratorInfo {
  persons: PersonInfo | PersonInfo[] | null
}

interface DBMissionResult {
  id: string
  title: string
  status: string
  start_date: string | null
  end_date: string | null
  role_title: string | null
  practice: string | null
  seniority: string | null
  tjm: number
  gross_margin_pct: number | null
  updated_at: string
  companies: CompanyInfo | CompanyInfo[] | null
  collaborators: CollaboratorInfo | CollaboratorInfo[] | null
}

function getCompanyName(companies: CompanyInfo | CompanyInfo[] | null): string {
  if (!companies) return "Compte non renseigné"
  if (Array.isArray(companies)) return companies[0]?.name ?? "Compte non renseigné"
  return companies.name ?? "Compte non renseigné"
}

function getConsultantName(collaborators: CollaboratorInfo | CollaboratorInfo[] | null): string {
  if (!collaborators) return "—"
  const collaborator = Array.isArray(collaborators) ? collaborators[0] : collaborators
  if (!collaborator || !collaborator.persons) return "—"
  const person = Array.isArray(collaborator.persons) ? collaborator.persons[0] : collaborator.persons
  if (!person) return "—"
  return person.full_name || `${person.first_name || ""} ${person.last_name || ""}`.trim() || "—"
}

export async function getMissionsList(): Promise<MissionsListRow[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("missions")
      .select(`
        id,
        title,
        status,
        start_date,
        end_date,
        role_title,
        practice,
        seniority,
        tjm,
        gross_margin_pct,
        updated_at,
        companies (
          name
        ),
        collaborators (
          persons (
            full_name,
            first_name,
            last_name
          )
        )
      `)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Supabase error fetching missions:", error.message, error.code, error.details, error.hint)
      return []
    }

    const mapped: MissionsListRow[] = (data as unknown as DBMissionResult[] ?? []).map((item) => {
      const companyName = getCompanyName(item.companies)
      const consultantName = getConsultantName(item.collaborators)

      // Subtitle: Consultant name · Role or practice
      const subtitleParts: string[] = []
      if (consultantName && consultantName !== "—") subtitleParts.push(consultantName)
      if (item.role_title) {
        subtitleParts.push(item.role_title)
      } else if (item.practice) {
        subtitleParts.push(item.practice)
      }
      const subtitle = subtitleParts.join(" · ")

      // Tag: TJM and margin percentage
      const tagParts: string[] = []
      if (item.tjm) tagParts.push(`TJM ${item.tjm} €`)
      if (item.gross_margin_pct !== null && item.gross_margin_pct !== undefined) {
        tagParts.push(`Marge ${item.gross_margin_pct}%`)
      }
      const tag = tagParts.length > 0 ? tagParts.join(" · ") : undefined

      // Status mapping: active/pending/closed
      let status: MissionsListRow["status"] = "active"
      if (item.status === "closed") status = "closed"
      else if (item.status === "pending") status = "pending"

      return {
        entityId: item.id,
        entityType: "mission",
        title: item.title,
        subtitle: subtitle || undefined,
        client: companyName,
        amount: item.tjm ? `${formatEuro(item.tjm)}/j` : "—",
        date: formatDate(item.start_date),
        tag,
        status,
        tjm: item.tjm,
        grossMarginPct: item.gross_margin_pct,
      }
    })

    return mapped
  } catch (err) {
    console.error("Unhandled error in getMissionsList:", err)
    return []
  }
}

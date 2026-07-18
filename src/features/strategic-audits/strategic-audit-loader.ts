import "server-only"
import { createClient } from "@/lib/supabase/server"
import { parseStrategicAuditCartographies } from "./strategic-audit-cartographies"

export async function getStrategicAuditCartographies(companyId: string) {
  const supabase = await createClient()
  const { data: company } = await supabase.from("companies").select("id,name,logo_path:metadata->logo_path").eq("id", companyId).single()
  if (!company) return null
  const { data: result } = await supabase.from("ai_intelligence_results").select("content_json").eq("company_id", companyId).eq("result_type", "process_diagnostic").eq("status", "succeeded").order("completed_at", { ascending: false }).limit(1).maybeSingle()
  const cartographies = parseStrategicAuditCartographies((result?.content_json as { cartographies?: unknown } | null)?.cartographies)
  return cartographies ? { company, cartographies } : null
}

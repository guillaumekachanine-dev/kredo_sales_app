import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Json } from "@/types/database"
import type { AccountIssuesMapContent } from "@/lib/intelligence/account-intelligence-contracts"

// ADR-0012 Lot 4 / D-5 — matérialisation de la sortie brute du workflow
// intel-031-issues-map (result_type="account_issues_map", tracée telle quelle
// en ai_intelligence_results par saveResult()) en lignes `account_issues`.
// Même pattern que commercial_pitch → intelligence_documents (save-as-document.ts),
// adapté à un "1 résultat → N lignes" plutôt qu'"1 résultat → 1 document".
//
// Chaque run crée un NOUVEAU lot de lignes (status='open') — pas de
// déduplication automatique contre les enjeux déjà ouverts. Le prompt système
// du workflow reçoit `existingOpenIssues` pour limiter les doublons en amont
// (best-effort), mais la garantie reste la curation humaine (D-4 : écarter un
// doublon proposé est aussi rapide qu'en déclencher un).

export async function materializeAccountIssues(
  supabase: SupabaseClient<Database>,
  params: { workspaceId: string; companyId: string; runId: string },
  contentJson: unknown,
): Promise<{ success: boolean; insertedCount: number; error?: string }> {
  const content = contentJson as Partial<AccountIssuesMapContent>

  if (content?.schema_version !== 1 || !Array.isArray(content.issues)) {
    return { success: false, insertedCount: 0, error: "contentJson ne respecte pas le contrat AccountIssuesMapContent (schema_version=1, issues[])" }
  }

  if (content.issues.length === 0) {
    return { success: true, insertedCount: 0 }
  }

  const rows = content.issues.map((issue) => ({
    workspace_id: params.workspaceId,
    company_id: params.companyId,
    title: issue.title,
    category: issue.category,
    problem_statement: issue.problem_statement,
    evidence_level: issue.evidence_level,
    provenance: issue.provenance,
    source_refs: (issue.source_refs ?? []) as unknown as Json,
    importance: issue.importance,
    urgency: issue.urgency,
    criticality: issue.criticality,
    business_impact: issue.business_impact,
    accessibility: issue.accessibility,
    kredo_fit: issue.kredo_fit,
    contact_ids: issue.contact_ids ?? [],
    recommended_next_probe: issue.recommended_next_probe ?? null,
    generated_by_run_id: params.runId,
  }))

  const { error } = await supabase.from("account_issues").insert(rows)
  if (error) return { success: false, insertedCount: 0, error: error.message }

  return { success: true, insertedCount: rows.length }
}

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { resolveCurrentWorkspaceId } from "@/lib/supabase/workspace"
import {
  EMPTY_CURRENT_COMPANY_FACTS,
  indexCurrentCompanyFacts,
  type CurrentCompanyFact,
  type CurrentCompanyFacts,
} from "@/lib/intelligence/company-facts-contract"

/**
 * Loads the current, workspace-scoped account facts for one company once.
 * The row cardinality is owned by SQL; this loader only exposes that contract.
 */
export async function getCurrentCompanyFacts(companyId: string): Promise<CurrentCompanyFacts> {
  if (!companyId) return EMPTY_CURRENT_COMPANY_FACTS

  const [supabase, workspaceId] = await Promise.all([
    createClient(),
    resolveCurrentWorkspaceId(),
  ])
  if (!workspaceId) return EMPTY_CURRENT_COMPANY_FACTS

  const { data, error } = await supabase
    .from("account_facts")
    .select("id,fact_type,fact_subtype,cardinality,is_current,value_text,value_json,normalized_value,confidence_score,primary_source_id,source_proposal_id,effective_at,expires_at,verified_at,created_at,updated_at")
    .eq("workspace_id", workspaceId)
    .eq("target_type", "company")
    .eq("target_id", companyId)
    .eq("is_current", true)
    .order("verified_at", { ascending: false, nullsFirst: false })
    .order("effective_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Unable to load current company facts:", error)
    return EMPTY_CURRENT_COMPANY_FACTS
  }

  return indexCurrentCompanyFacts((data ?? []).flatMap((row): CurrentCompanyFact[] => {
    if (row.cardinality !== "single" && row.cardinality !== "multi") return []
    return [{
      id: row.id,
      factType: row.fact_type,
      factSubtype: row.fact_subtype,
      cardinality: row.cardinality,
      isCurrent: row.is_current,
      valueText: row.value_text,
      valueJson: row.value_json,
      normalizedValue: row.normalized_value,
      confidence: row.confidence_score,
      primarySourceId: row.primary_source_id,
      sourceProposalId: row.source_proposal_id,
      effectiveAt: row.effective_at,
      expiresAt: row.expires_at,
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }]
  }))
}

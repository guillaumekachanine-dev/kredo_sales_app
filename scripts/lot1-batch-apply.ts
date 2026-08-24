// Retired after the 2026-08-12 historical batch introduced account_facts
// cardinality drift. This script must never bypass the canonical proposal RPC.

console.error(
  "lot1-batch-apply.ts is retired. Apply proposals only through validate_and_apply_enrichment_proposals."
)
process.exitCode = 1

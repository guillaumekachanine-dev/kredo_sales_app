import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
})

async function runBaseline() {
  console.log("=== 1. COMPANIES BASELINE ===")
  const { data: companies, error: cErr } = await supabase
    .from("companies")
    .select("id, name, siren, naf_code")
  
  if (cErr) {
    console.error("Error fetching companies:", cErr)
    return
  }

  const totalCompanies = companies.length
  const withSiren = companies.filter(c => c.siren && c.siren.trim().length > 0)
  const withNaf = companies.filter(c => c.naf_code && c.naf_code.trim().length > 0)
  
  const sirenCounts = {}
  let invalidSirens = 0
  for (const c of withSiren) {
    const s = c.siren.trim()
    if (!/^\d{9}$/.test(s)) {
      invalidSirens++
    }
    sirenCounts[s] = (sirenCounts[s] || 0) + 1
  }
  const duplicateSirens = Object.entries(sirenCounts).filter(([_, count]) => count > 1)

  console.log(`Total companies: ${totalCompanies}`)
  console.log(`Companies with SIREN: ${withSiren.length}`)
  console.log(`Companies with NAF code: ${withNaf.length}`)
  console.log(`Duplicate SIRENs: ${duplicateSirens.length}`, duplicateSirens)
  console.log(`Invalid SIRENs: ${invalidSirens}`)

  console.log("\n=== 2. ACCOUNT_FACTS BASELINE ===")
  const targetFactTypes = [
    "legal_id",
    "naf_code",
    "collective_agreement",
    "headcount_france",
    "incorporation_date",
    "establishment",
    "executive"
  ]

  for (const factType of targetFactTypes) {
    const { data: facts, error: fErr } = await supabase
      .from("account_facts")
      .select("id, target_id, target_type, fact_type, primary_source_id, effective_at, confidence_score")
      .eq("fact_type", factType)

    if (fErr) {
      console.log(`Fact type '${factType}': Query error (${fErr.message})`)
      continue
    }

    const count = facts.length
    const coveredCompanies = new Set(facts.filter(f => f.target_type === 'company').map(f => f.target_id)).size
    const withoutSource = facts.filter(f => !f.primary_source_id).length
    const withoutEffectiveAt = facts.filter(f => !f.effective_at).length
    const withoutConfidence = facts.filter(f => f.confidence_score === null || f.confidence_score === undefined).length

    console.log(`Fact type '${factType}':`)
    console.log(`  Count: ${count}`)
    console.log(`  Covered companies: ${coveredCompanies}`)
    console.log(`  Without source: ${withoutSource}`)
    console.log(`  Without effective_at: ${withoutEffectiveAt}`)
    console.log(`  Without confidence_score: ${withoutConfidence}`)
  }

  console.log("\n=== 3. INTELLIGENCE_SOURCES BASELINE ===")
  const { data: sources, error: sErr } = await supabase
    .from("intelligence_sources")
    .select("id, source_type, source_key")

  if (sErr) {
    console.error("Error fetching sources:", sErr)
  } else {
    console.log(`Total intelligence_sources: ${sources.length}`)
  }
}

runBaseline().catch(console.error)

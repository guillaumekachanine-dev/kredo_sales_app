// Usage: npx tsx --env-file=.env.local scripts/lot1-batch-apply.ts [--full]
// Ce script lance INTEL-010-refresh sur 3 comptes (ou tous) puis auto-applique les propositions non ambiguës.

import { createClient } from "@supabase/supabase-js"
import { createHmac } from "crypto"

const FULL_BATCH = process.argv.includes("--full")
const LIMIT = FULL_BATCH ? 98 : 3

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const n8nBaseUrl = (process.env.N8N_WEBHOOK_BASE_URL || process.env.N8N_BASE_URL || "").replace(/\/$/, "")
const n8nSecret = process.env.N8N_WEBHOOK_SECRET || ""

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
})

function signPayload(body: string): string {
  if (!n8nSecret) return ""
  return "sha256=" + createHmac("sha256", n8nSecret).update(body).digest("hex")
}

async function main() {
  console.log(`Démarrage du batch Lot 1 - Mode: ${FULL_BATCH ? "FULL" : "CANARY"} (Limité à ${LIMIT} comptes)`)

  // 1. Get fallback profile & workspace
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, workspace_id")
    .limit(1)

  if (pErr || !profiles || profiles.length === 0) {
    console.error("Impossible de récupérer un profil utilisateur de référence:", pErr?.message)
    process.exit(1)
  }

  const userId = profiles[0].id
  const workspaceId = profiles[0].workspace_id

  console.log(`Profil utilisateur actif : ${userId} (Workspace: ${workspaceId})`)

  // 2. Fetch companies
  const { data: companies, error: cErr } = await supabase
    .from("companies")
    .select("id, name, siren, naf_code")
    .order("name")
    .limit(LIMIT)

  if (cErr || !companies) {
    console.error("Erreur récupération comptes :", cErr?.message)
    process.exit(1)
  }

  console.log(`${companies.length} comptes trouvés pour ce traitement.\n`)

  const summary = {
    total: companies.length,
    resolved: 0,
    ambiguous: 0,
    notFound: 0,
    error: 0,
    appliedFactsCount: 0,
    details: [] as any[]
  }

  for (const company of companies) {
    console.log(`======================================================`)
    console.log(`Traitement du compte : ${company.name} (${company.id})`)
    
    // 3. Simuler la création du run
    const { data: runData, error: runError } = await supabase
      .from("ai_intelligence_runs")
      .insert({
        workspace_id: workspaceId,
        company_id: company.id,
        run_type: "intel-010-refresh",
        status: "queued",
        input_snapshot: { operation: "account_scan", identityConfirmed: true },
        owner_id: userId,
      })
      .select("id")
      .single()
      
    if (runError || !runData) {
      console.error("Erreur création run :", runError?.message)
      summary.error++
      summary.details.push({ name: company.name, status: "error", reason: runError?.message })
      continue
    }

    const runId = runData.id
    console.log(`Run créé : ${runId}`)

    // 4. Appel du Webhook n8n
    const webhookUrl = `${n8nBaseUrl}/webhook/intel-010-refresh`
    const payload = {
      runId,
      workflowId: "intel-010-refresh",
      entityType: "company",
      entityId: company.id,
      companyId: company.id,
      workspaceId,
      userId,
      input: {
        operation: "account_scan",
        informationMode: "find",
        contactMode: "none",
        selectedSiren: company.siren || null,
        identityConfirmed: Boolean(company.siren),
        knownCompany: {
          name: company.name,
          siren: company.siren || null,
          nafCode: company.naf_code || null,
        },
      },
      callbackUrl: `${appUrl}/api/n8n/callback`,
    }

    const bodyStr = JSON.stringify(payload)
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (n8nSecret) {
      headers["X-KREDO-Signature"] = signPayload(bodyStr)
    }

    console.log(`Appel du webhook n8n (${webhookUrl})...`)
    try {
      const res = await fetch(webhookUrl, { method: "POST", headers, body: bodyStr })
      if (!res.ok) {
        const txt = await res.text().catch(() => "")
        console.error(`Erreur n8n ${res.status}:`, txt)
        summary.error++
        summary.details.push({ name: company.name, status: "error", reason: `n8n HTTP ${res.status}` })
        continue
      }
    } catch (err) {
      console.error("Erreur réseau n8n :", err)
      summary.error++
      summary.details.push({ name: company.name, status: "error", reason: String(err) })
      continue
    }

    // 5. Attendre la fin de l'exécution (polling ai_intelligence_runs)
    let runStatus = "queued"
    let attempts = 0
    while (["queued", "running"].includes(runStatus) && attempts < 40) {
      process.stdout.write(".")
      await new Promise(r => setTimeout(r, 1500))
      const { data: checkRun } = await supabase.from("ai_intelligence_runs").select("status").eq("id", runId).single()
      if (checkRun) runStatus = checkRun.status
      attempts++
    }
    console.log(`\nStatut final du run : ${runStatus}`)

    if (runStatus !== "succeeded") {
      summary.error++
      summary.details.push({ name: company.name, status: "error", reason: `Run status ${runStatus}` })
      continue
    }

    // 6. Inspecter les résultats et les propositions
    const { data: resultData } = await supabase
      .from("ai_intelligence_results")
      .select("content_json")
      .eq("run_id", runId)
      .maybeSingle()

    const contentJson = (resultData?.content_json || {}) as any
    const resolution = contentJson.resolution || {}
    console.log(`Résolution d'identité : status=${resolution.status}, siren=${resolution.siren}, matchMethod=${resolution.matchMethod}`)

    if (resolution.status === "not_found") {
      summary.notFound++
      summary.details.push({ name: company.name, status: "not_found" })
      continue
    } else if (resolution.status === "ambiguous") {
      summary.ambiguous++
      summary.details.push({ name: company.name, status: "ambiguous", candidatesCount: resolution.candidates?.length })
      continue
    }

    // 7. Récupérer les propositions
    const { data: proposals, error: propErr } = await supabase
      .from("enrichment_proposals")
      .select("*")
      .eq("run_id", runId)
      .in("status", ["proposed", "needs_review"])

    if (propErr || !proposals || proposals.length === 0) {
      console.log(`Aucune nouvelle proposition à appliquer.`)
      summary.resolved++
      summary.details.push({ name: company.name, status: "resolved", appliedFacts: 0 })
      continue
    }

    console.log(`${proposals.length} propositions générées. Application des faits et attributs...`)

    let companyUpdates: Record<string, any> = {}
    let appliedCount = 0

    for (const p of proposals) {
      // Direct CRM fields (siren, naf_code, legal_name, hq_location, employee_count)
      if (["siren", "naf_code", "legal_name", "hq_location", "employee_count"].includes(p.attribute_name)) {
        companyUpdates[p.attribute_name] = p.proposed_value
      } else {
        // Account facts (legal_id, collective_agreement, headcount_france, incorporation_date, establishment, executive)
        const factType = p.attribute_name
        const cardinality = ['establishment', 'executive'].includes(factType) ? 'multi' : 'single'
        const normHash = p.normalized_value_hash || "hash"

        if (cardinality === 'single') {
          // Desactiver l'ancien fait mono-valué courant
          await supabase
            .from("account_facts")
            .update({ is_current: false })
            .eq("workspace_id", workspaceId)
            .eq("target_type", "company")
            .eq("target_id", company.id)
            .eq("fact_type", factType)
            .eq("is_current", true)
        } else {
          // Pour les faits multi-valués, vérifier si la même valeur existe déjà courant
          const { data: existingMulti } = await supabase
            .from("account_facts")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("target_type", "company")
            .eq("target_id", company.id)
            .eq("fact_type", factType)
            .eq("normalized_value_hash", normHash)
            .eq("is_current", true)
            .maybeSingle()

          if (existingMulti) {
            // Déjà présent et courant : ignorer pour l'idempotence
            await supabase
              .from("enrichment_proposals")
              .update({ status: "applied", applied_at: new Date().toISOString(), applied_by: userId })
              .eq("id", p.id)
            continue
          }
        }

        // Insertion du nouveau fait courant
        const { error: factErr } = await supabase
          .from("account_facts")
          .insert({
            workspace_id: workspaceId,
            target_type: "company",
            target_id: company.id,
            fact_type: factType,
            fact_subtype: null,
            cardinality,
            value_text: p.proposed_value,
            value_json: null,
            normalized_value: p.normalized_value || p.proposed_value,
            normalized_value_hash: normHash,
            origin: "external",
            confidence_score: p.confidence_score || 1.0,
            primary_source_id: p.primary_source_id,
            source_proposal_id: p.id,
            effective_at: new Date().toISOString(),
            is_current: true,
          })

        if (factErr) {
          console.error(`Erreur insertion fact '${factType}':`, factErr.message)
        } else {
          appliedCount++
        }
      }

      // Marquer la proposition comme appliquée
      await supabase
        .from("enrichment_proposals")
        .update({ status: "applied", applied_at: new Date().toISOString(), applied_by: userId })
        .eq("id", p.id)
    }

    if (Object.keys(companyUpdates).length > 0) {
      console.log(`Mise à jour CRM company:`, companyUpdates)
      await supabase.from("companies").update(companyUpdates).eq("id", company.id)
    }

    summary.resolved++
    summary.appliedFactsCount += appliedCount
    summary.details.push({
      name: company.name,
      status: "resolved",
      siren: companyUpdates.siren || company.siren,
      nafCode: companyUpdates.naf_code || company.naf_code,
      appliedFacts: appliedCount
    })
  }

  console.log(`\n=================== BATCH SUMMARY ===================`)
  console.log(`Total traités : ${summary.total}`)
  console.log(`Résolus       : ${summary.resolved}`)
  console.log(`Ambiguës      : ${summary.ambiguous}`)
  console.log(`Non trouvés   : ${summary.notFound}`)
  console.log(`Erreurs       : ${summary.error}`)
  console.log(`Total faits A1 appliqués : ${summary.appliedFactsCount}`)
  console.table(summary.details)
}

main().catch(console.error)

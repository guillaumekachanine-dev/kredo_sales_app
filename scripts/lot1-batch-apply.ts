// Usage: npx tsx --env-file=.env.local scripts/lot1-batch-apply.ts [--full]
// Ce script lance INTEL-010-refresh sur 3 comptes (ou tous) puis auto-applique les propositions non ambiguës.

import { createClient } from "@supabase/supabase-js"

const FULL_BATCH = process.argv.includes("--full")
const LIMIT = FULL_BATCH ? 98 : 3

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const adminEmail = process.env.ADMIN_EMAIL // Assuming an admin email is configured to get a JWT
const adminPassword = process.env.ADMIN_PASSWORD

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl as string, serviceKey as string, {
  auth: { persistSession: false },
})

async function main() {
  console.log(`Démarrage du batch Lot 1 - Mode: ${FULL_BATCH ? "FULL" : "CANARY"} (Limité à ${LIMIT} comptes)`)

  // Sign in to get a valid JWT and user ID for the RPC and the trigger
  let authClient = supabase
  let userId: string | null = null
  let workspaceId: string | null = null
  let token: string | null = null

  if (adminEmail && adminPassword) {
     const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
       email: adminEmail,
       password: adminPassword,
     })
     if (authErr) {
       console.error("Erreur d'authentification admin :", authErr.message)
       process.exit(1)
     }
     userId = authData.user.id
     token = authData.session.access_token
     const { data: profile } = await supabase.from("profiles").select("workspace_id").eq("id", userId).single()
     workspaceId = profile?.workspace_id

     // Initialize a new client with the session
     authClient = createClient(supabaseUrl as string, serviceKey as string, {
        global: {
           headers: { Authorization: "Bearer " + String(token) }
        }
     })
  } else {
     console.error("ADMIN_EMAIL and ADMIN_PASSWORD required in .env.local for applying changes securely.")
     console.error("Si non fourni, le script essaiera de simuler le POST via webhook avec service role (pas de garantie pour le RPC apply).")
  }

  // 1. Fetch companies
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, siren")
    .order("name")
    .limit(LIMIT)

  if (error) {
    console.error("Erreur récupération comptes :", error.message)
    process.exit(1)
  }

  console.log(`${companies.length} comptes trouvés.`)

  for (const company of companies) {
    console.log(`\n======================================================`)
    console.log(`Traitement du compte : ${company.name} (${company.id})`)
    
    let runId = null
    // 2. Simuler la création du run
    const { data: runData, error: runError } = await supabase
      .from("ai_intelligence_runs")
      .insert({
        workspace_id: workspaceId || "3d50821b-dfb7-4eeb-8431-7b9d628eb44e", // fallback if no admin user
        company_id: company.id,
        run_type: "intel-010-refresh",
        status: "queued",
        input_snapshot: { operation: "account_scan", identityConfirmed: true },
        owner_id: userId,
      })
      .select("id, workspace_id")
      .single()
      
    if (runError) {
      console.error("Erreur création run :", runError.message)
      continue
    }
    runId = runData.id
    
    // Appel du Webhook n8n
    const n8nUrl = process.env.N8N_BASE_URL || "http://localhost:5678"
    const n8nAuth = process.env.N8N_WEBHOOK_AUTH || ""
    
    const webhookUrl = `${n8nUrl}/webhook/intel-010-refresh`
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (n8nAuth) {
        headers["Authorization"] = `Basic ${Buffer.from(n8nAuth).toString("base64")}`
    }

    const payload = {
      runId,
      workflowId: "intel-010-refresh",
      entityType: "company",
      entityId: company.id,
      companyId: company.id,
      workspaceId: runData.workspace_id,
      userId,
      input: { operation: "account_scan", identityConfirmed: true },
      callbackUrl: `${appUrl}/api/n8n/callback`,
    }

    console.log(`Appel du webhook n8n...`)
    try {
      const res = await fetch(webhookUrl, { method: "POST", headers, body: JSON.stringify(payload) })
      if (!res.ok) {
         console.error("Erreur HTTP webhook :", res.status, await res.text())
         continue
      }
    } catch (err) {
      console.error("Erreur appel n8n :", err)
      continue
    }

    console.log(`Run ID : ${runId}`)

    // 3. Wait for completion
    let status = "queued"
    let attempts = 0
    while (["queued", "running"].includes(status) && attempts < 30) {
      process.stdout.write(".")
      await new Promise(r => setTimeout(r, 2000)) // wait 2s
      const { data: checkRun } = await supabase.from("ai_intelligence_runs").select("status").eq("id", runId).single()
      if (checkRun) status = checkRun.status
      attempts++
    }
    console.log(`\nStatut final du run : ${status}`)

    if (status !== "succeeded") {
      console.log(`Scan non abouti pour ${company.name}, on passe au suivant.`)
      continue
    }

    // 4. Fetch proposals
    const { data: proposals, error: propErr } = await supabase
      .from("enrichment_proposals")
      .select("id, attribute_name, proposed_value")
      .eq("run_id", runId)
      .eq("status", "proposed")

    if (propErr) {
      console.error("Erreur récupération propositions :", propErr.message)
      continue
    }

    if (!proposals || proposals.length === 0) {
      console.log(`Aucune proposition trouvée pour ${company.name}. (Peut-être ambigu ou introuvable)`)
      continue
    }

    const proposalIds = proposals.map(p => p.id)
    console.log(`Validation de ${proposalIds.length} propositions...`)

    if (authClient !== supabase) {
      // 5. Apply proposals via RPC (authenticated)
      const { data: rpcRes, error: rpcErr } = await authClient.rpc("validate_and_apply_enrichment_proposals", {
        p_proposal_ids: proposalIds,
        p_reason: "Lot 1 Batch Application"
      })

      if (rpcErr) {
         console.error(`Erreur lors de l'application RPC :`, rpcErr.message)
      } else {
         console.log(`Propositions appliquées avec succès :`)
         if (Array.isArray(rpcRes)) {
           rpcRes.forEach((r: any) => {
             console.log(`  - ${r.attribute_name} : ${r.status}`)
           })
         } else {
           console.log(`RPC executé, réponse:`, rpcRes)
         }
      }
    } else {
      console.log("Client non authentifié. Les propositions restent au statut 'proposed' pour application manuelle via UI.")
    }
  }

  console.log("Terminé.")
}

main().catch(console.error)

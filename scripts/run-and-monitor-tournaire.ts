import { createClient } from "@supabase/supabase-js"
import { triggerN8nRun } from "../src/lib/n8n/trigger-run"

const TOURNAIRE_COMPANY_ID = "cde3d719-f1ef-4bd5-a55d-1f37c7642637"
const WORKSPACE_ID = "98dcd39d-f87b-4f9d-add9-ce76d635953a"
const USER_ID = "61decd1c-97b2-4fc1-9570-80c52ce001d3"

async function main() {
  console.log("Déclenchement du run réel Tournaire V4...")
  const res = await triggerN8nRun({
    workflowId: "intel-030-account-knowledge",
    entityType: "company",
    entityId: TOURNAIRE_COMPANY_ID,
    companyId: TOURNAIRE_COMPANY_ID,
    workspaceId: WORKSPACE_ID,
    userId: USER_ID,
    input: { accountKnowledgeSchemaVersion: 4 },
  })

  if (!res.ok) {
    console.error("Échec de déclenchement :", res.error)
    process.exit(1)
  }

  const runId = res.runId!
  console.log("Run créé avec succès ! Run ID :", runId)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log("Suivi en temps réel de l'exécution sur Supabase...")
  const startTime = Date.now()
  while (Date.now() - startTime < 480000) {
    await new Promise((r) => setTimeout(r, 4000))
    const { data: run } = await supabase
      .from("ai_intelligence_runs")
      .select("status, error_message, config")
      .eq("id", runId)
      .single()

    const elapsed = Math.round((Date.now() - startTime) / 1000)
    console.log(`[+${elapsed}s] Statut : ${run?.status}`)

    if (run?.status === "failed") {
      console.error("Échec du run :", run.error_message)
      console.log("Config n8n :", run.config)
      process.exit(1)
    }

    if (run?.status === "succeeded") {
      console.log("Succès du run !")
      console.log("Config n8n :", run.config)

      const { data: results } = await supabase
        .from("ai_intelligence_results")
        .select("content_json, context_snapshot, qa_flags")
        .eq("run_id", runId)

      const cs = results?.[0]?.context_snapshot as any
      console.log("\n=== BILAN PRODUCTION RUN TOURNAIRE ===")
      console.log("ID Run :", runId)
      console.log("n8n Execution ID :", run.config?.n8nExecutionId)
      console.log("discoveryCount :", cs?.discoveryCount)
      console.log("selectedPages count :", cs?.selectedPages?.length)
      console.log("external_pages_fetched (fetchedPages) :", cs?.fetchedPages?.length)
      console.log("externalResearchStatus :", cs?.externalResearchStatus)
      console.log("urlSelectionDiagnostics :", JSON.stringify(cs?.urlSelectionDiagnostics, null, 2))
      console.log("URLs sélectionnées :")
      for (const p of cs?.selectedPages || []) {
        console.log(`  - [Score ${p.score}] ${p.link} (${p.title})`)
      }
      console.log("URLs réellement consultées (fetchedPages) :")
      for (const p of cs?.fetchedPages || []) {
        console.log(`  - ${p.link} (${p.text ? p.text.length : 0} car.)`)
      }
      return
    }
  }

  console.error("Timeout de surveillance après 180s")
}

main().catch(console.error)

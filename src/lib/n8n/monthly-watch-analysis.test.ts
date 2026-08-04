import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const workflow = JSON.parse(readFileSync(resolve(root, "n8n/workflows/intel-021-monthly-watch-analysis.json"), "utf8")) as {
  active: boolean
  nodes: Array<{ name: string; type: string; parameters: Record<string, unknown> }>
  connections: Record<string, { main: unknown[][] }>
}
const workflowText = JSON.stringify(workflow)
const enumMigration = readFileSync(resolve(root, "supabase/migrations/20260803190500_strategic_watch_analysis.sql"), "utf8")
const upsertMigration = readFileSync(resolve(root, "supabase/migrations/20260803190507_strategic_watch_document_upsert.sql"), "utf8")

describe("INTEL-021 workflow", () => {
  it("uses the stable webhook and remains inactive until n8n deployment", () => {
    expect(workflow.active).toBe(false)
    expect(workflow.nodes.some((node) => node.name === "Webhook — Monthly Watch" && node.parameters.path === "intel-021-monthly-watch-analysis")).toBe(true)
  })

  it("implements manual and scheduled entry points with the same app contract", () => {
    expect(workflow.nodes.some((node) => node.type === "n8n-nodes-base.scheduleTrigger")).toBe(true)
    expect(workflowText).toContain("/api/veille/monthly-watch/cron")
    expect(workflowText).toContain("triggerMode")
    expect(workflowText).toContain("digestIds")
    expect(workflowText).toContain("articleIds")
  })

  it("hydrates only existing watch rows and enforces article traceability", () => {
    expect(workflowText).toContain("veille_digests")
    expect(workflowText).toContain("veille_articles")
    expect(workflowText).not.toContain("account_signals")
    expect(workflowText).toContain("Traçabilité articleIds invalide")
    expect(workflowText).toContain("no_external_collection")
  })

  it("calls back both success and failure states", () => {
    expect(workflow.connections["Sign Callback"]).toBeDefined()
    expect(workflow.connections["Sign Failure Callback"]).toBeDefined()
    expect(workflowText).toContain("strategic_watch_analysis")
    expect(workflowText).toContain("status:'failed'")
  })
})

describe("strategic analysis persistence", () => {
  it("adds only the documentary enum and an idempotent per-period upsert", () => {
    expect(enumMigration).toContain("add value if not exists 'strategic_watch_analysis'")
    expect(upsertMigration).toContain("intelligence_documents_strategic_watch_period_uidx")
    expect(upsertMigration).toContain("pg_advisory_xact_lock")
    expect(upsertMigration).toContain("source_result_id = p_source_result_id")
    expect(upsertMigration).toContain("'regenerated'")
    expect(upsertMigration).not.toContain("create table")
  })
})

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const source = readFileSync("src/features/source-management/actions/ingest-source-corpus.ts", "utf8")

describe("ingest-source-corpus action — seul chemin d'écriture (Lot 4 §18-§19)", () => {
  it("is a server-only Server Action module", () => {
    expect(source).toContain('"use server"')
    expect(source).toContain('import "server-only"')
  })

  it("never uses the service-role key", () => {
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY")
    expect(source).not.toContain("service_role")
  })

  it("requires an authenticated session before calling the RPC", () => {
    expect(source).toContain("supabase.auth.getUser()")
  })

  it("writes exclusively through the ingest_source_corpus RPC — no direct table writes", () => {
    expect(source).toContain('supabase.rpc("ingest_source_corpus"')
    expect(source).toContain("p_payload")
    expect(source).toContain("p_segment_slug")
    expect(source).toContain("p_reason")
    expect(source).not.toMatch(/\.from\("source_catalog"\)[\s\S]{0,80}\.insert\(/)
    expect(source).not.toMatch(/\.from\("source_corpora"\)[\s\S]{0,80}\.insert\(/)
    expect(source).not.toMatch(/\.from\("source_corpus_items"\)[\s\S]{0,80}\.insert\(/)
  })

  it("revalidates /veille after a successful ingestion", () => {
    expect(source).toContain('revalidatePath("/veille")')
  })

  it("validates the payload server-side before calling the RPC (defense in depth)", () => {
    expect(source).toContain("isValidPayload")
    expect(source).toContain("isValidSourceItem")
  })

  it("re-enforces activation_state='draft' server-side, not just trusting the client", () => {
    expect(source).toContain('payload.activation_state !== "draft"')
  })

  it("re-enforces that a static source item is never enabled or eligible, even if the client sent otherwise", () => {
    expect(source).toContain('item.content_temporality === "static"')
    expect(source).toContain("item.is_enabled || item.news_eligible || item.account_watch_eligible")
  })
})

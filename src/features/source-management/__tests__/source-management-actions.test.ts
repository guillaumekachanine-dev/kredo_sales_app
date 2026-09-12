import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const source = readFileSync("src/features/source-management/actions/source-management-actions.ts", "utf8")

const MUTATING_ACTIONS = [
  "createManualSourceAction",
  "updateManualSourceAction",
  "setManualSourceActiveAction",
  "deleteManualSourceAction",
  "setCorpusActivationAction",
  "setCorpusNewsEnabledAction",
  "setCorpusAccountWatchEnabledAction",
  "setCorpusItemEnabledAction",
  "updateCorpusEditorialAction",
  "renameCorpusSourceAction",
  "removeSourceFromCorpusAction",
]

describe("source management server actions", () => {
  it("is a server-only Server Action module", () => {
    expect(source).toContain('"use server"')
    expect(source).toContain('import "server-only"')
  })

  it("exposes exactly the actions required by the Lot 3 mandate and corpus editorial mode", () => {
    for (const name of MUTATING_ACTIONS) {
      expect(source).toContain(`export async function ${name}(`)
    }
  })

  it("never uses the service-role key", () => {
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY")
    expect(source).not.toContain("service_role")
  })

  it("requires an authenticated session and a resolved workspace before any write", () => {
    expect(source).toContain("supabase.auth.getUser()")
    expect(source).toContain('.from("profiles")')
    expect(source).toContain("resolveActingWorkspace")
  })

  it("pre-checks the owner/admin role client-side, with RLS remaining the final guard", () => {
    expect(source).toContain('profile.role !== "owner" && profile.role !== "admin"')
  })

  it("never allows a write on a system-origin or locked source", () => {
    expect(source).toContain('current.origin === "system" || current.is_locked')
  })

  it("scopes every manual-source mutation to origin='manual' as a belt-and-suspenders guard", () => {
    expect(source).toContain('.eq("origin", "manual")')
  })

  it("scopes setCorpusActivationAction to sector and thematic, excluding system", () => {
    expect(source).toContain('.in("scope_kind", ["sector", "thematic"])')
  })

  it("scopes news and account-watch corpus actions strictly to sector", () => {
    const occurrences = source.match(/\.eq\("scope_kind", "sector"\)/g) ?? []
    // Both setCorpusNewsEnabledAction and setCorpusAccountWatchEnabledAction must be scoped to sector
    expect(occurrences.length).toBe(2)
  })

  it("revalidates /veille after every successful mutation", () => {
    const occurrences = source.match(/revalidatePath\("\/veille"\)/g) ?? []
    expect(occurrences.length).toBeGreaterThanOrEqual(MUTATING_ACTIONS.length)
  })

  it("supports reactivating an existing inactive manual source on duplicate detection", () => {
    expect(source).toContain("export async function reactivateManualSourceAction(")
  })

  it("updateCorpusEditorialAction rejects system corpora and merges editorial metadata non-destructively", () => {
    expect(source).toContain('current.scope_kind === "system"')
    expect(source).toContain('.neq("scope_kind", "system")')
    expect(source).toContain("...currentMeta")
    expect(source).toContain("...currentEditorial")
    expect(source).toContain("editorial: updatedEditorial")
  })

  it("renameCorpusSourceAction checks corpus is not system, source is not locked/system, and updates only name", () => {
    expect(source).toContain('corpus.scope_kind === "system"')
    expect(source).toContain('source.origin === "system" || source.is_locked')
    expect(source).toContain('.update({ name: normalizedName })')
    expect(source).toContain('.eq("id", item.source_id)')
    expect(source).toContain('.neq("origin", "system")')
    expect(source).toContain('.eq("is_locked", false)')
  })

  it("removeSourceFromCorpusAction deletes strictly from source_corpus_items, never from source_catalog", () => {
    const removeMatch = source.slice(source.indexOf("export async function removeSourceFromCorpusAction("))
    expect(removeMatch).toContain('.from("source_corpus_items")')
    expect(removeMatch).toContain(".delete()")
    expect(removeMatch).toContain('.eq("id", itemId)')
    expect(removeMatch).not.toContain('.from("source_catalog").delete()')
    expect(removeMatch).not.toContain("deleteManualSourceAction")
  })
})

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
]

describe("source management server actions", () => {
  it("is a server-only Server Action module", () => {
    expect(source).toContain('"use server"')
    expect(source).toContain('import "server-only"')
  })

  it("exposes exactly the actions required by the Lot 3 mandate", () => {
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

  it("scopes every corpus mutation to scope_kind='sector', never the system corpus", () => {
    expect(source).toContain('.eq("scope_kind", "sector")')
  })

  it("revalidates /veille after every successful mutation", () => {
    const occurrences = source.match(/revalidatePath\("\/veille"\)/g) ?? []
    expect(occurrences.length).toBeGreaterThanOrEqual(MUTATING_ACTIONS.length)
  })

  it("supports reactivating an existing inactive manual source on duplicate detection", () => {
    expect(source).toContain("export async function reactivateManualSourceAction(")
  })
})

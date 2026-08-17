import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const source = readFileSync("src/features/source-management/data/get-source-management-snapshot.ts", "utf8")

describe("source management snapshot loader", () => {
  it("is server-only", () => {
    expect(source).toContain('import "server-only"')
  })

  it("reads the three catalog tables and never a hardcoded source list", () => {
    expect(source).toContain('.from("source_catalog")')
    expect(source).toContain('.from("source_corpora")')
    expect(source).toContain('.from("source_corpus_items")')
    expect(source).not.toMatch(/const\s+.*sources\s*=\s*\[/i)
  })

  it("only reads current active corpora", () => {
    expect(source).toContain('.in("scope_kind", ["sector", "system"])')
  })

  it("reuses v_effective_watch_sources for accounts-fed instead of reimplementing segment→macro inheritance", () => {
    expect(source).toContain('.from("v_effective_watch_sources")')
    expect(source).toContain('.eq("usage_scope", "account_watch")')
    expect(source).not.toContain("parent_id")
  })

  it("resolves collection_mode by deriving it, never storing it", () => {
    expect(source).toContain("deriveCollectionMode(")
  })

  it("computes a static source as non-collectable", () => {
    expect(source).toContain('source.contentTemporality !== "static"')
  })

  it("returns an empty snapshot when no workspace can be resolved (unauthenticated)", () => {
    expect(source).toContain("EMPTY_SOURCE_MANAGEMENT_SNAPSHOT")
  })

  it("gates canManage on the owner/admin role, matching private.is_workspace_admin()", () => {
    expect(source).toContain('profile.role === "owner" || profile.role === "admin"')
  })
})

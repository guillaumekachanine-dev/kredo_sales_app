import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const source = readFileSync("src/features/source-management/data/resolve-source-corpus-import.ts", "utf8")

describe("resolve-source-corpus-import — lecture seule (Lot 4 §7-§8)", () => {
  it("is a server-only Server Action module", () => {
    expect(source).toContain('"use server"')
    expect(source).toContain('import "server-only"')
  })

  it("never writes: no insert/update/delete/upsert on any table", () => {
    expect(source).not.toMatch(/\.insert\(/)
    expect(source).not.toMatch(/\.update\(/)
    expect(source).not.toMatch(/\.delete\(/)
    expect(source).not.toMatch(/\.upsert\(/)
  })

  it("resolves the segment strictly against sector_intelligence.level='segment'", () => {
    expect(source).toContain('.from("sector_intelligence")')
    expect(source).toContain('.eq("slug", segmentSlug)')
    expect(source).toContain('row.level !== "segment"')
  })

  it("blocks a macro slug with an explicit message, distinct from 'not found'", () => {
    expect(source).toContain("secteur macro, pas un segment")
  })

  it("blocks an unknown or foreign-workspace slug via the RLS-scoped absence of a row", () => {
    expect(source).toContain("introuvable dans ce workspace")
  })

  it("requires an authenticated session before any read", () => {
    expect(source).toContain("supabase.auth.getUser()")
  })

  it("reads source_catalog once and matches by normalized hostname, never per-source queries", () => {
    expect(source).toContain('.from("source_catalog")')
    expect(source).toContain("normalizeHostname(")
    expect(source).toContain("byHostname")
  })

  it("never reimplements segment/macro inheritance — delegates entirely to sector_intelligence rows", () => {
    expect(source).not.toContain("v_sector_knowledge")
  })
})

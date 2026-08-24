import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("Mobile account lookup - neutralisation FOLIO", () => {
  it("interroge v_active_account_signals et n'utilise plus metadata.analysis_data.signaux", () => {
    const source = readFileSync("src/lib/accounts-contacts/mobile-account-lookup.ts", "utf8")

    expect(source).toContain('supabase\n      .from<SignalLookupRow>("v_active_account_signals")')
    expect(source).not.toContain("actualites_recentes")
    expect(source).not.toContain("analysis_data")
  })
})

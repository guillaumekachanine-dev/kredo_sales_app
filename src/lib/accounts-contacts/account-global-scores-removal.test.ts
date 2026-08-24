import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const REPOSITORY_ROOT = process.cwd()
const GENERATED_TYPES_PATH = join(REPOSITORY_ROOT, "src/types/database.generated.ts")
const MIGRATIONS_PATH = join(REPOSITORY_ROOT, "supabase/migrations")

const scorePrefix = ["account", "score", ""].join("_")
const forbiddenTokens = [
  ["legacy", "folio", "score"].join("_"),
  ["legacy", "Folio", "Score"].join(""),
  ["potential", "score", "raw"].join("_"),
  `${scorePrefix}runs`,
  `${scorePrefix}components`,
  `${scorePrefix}feedback`,
  `${scorePrefix}current`,
  `get_${scorePrefix}context`,
  ["compute", "conviction", "score", "v1"].join("_"),
  ["compute", "investment", "score", "v1"].join("_"),
  `validate_${scorePrefix}`,
]

function filesRecursively(directory: string, include: RegExp): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return filesRecursively(path, include)
    return include.test(entry.name) ? [path] : []
  })
}

function matchingFiles(paths: string[]): string[] {
  return paths.filter((path) => {
    const source = readFileSync(path, "utf8")
    return forbiddenTokens.some((token) => source.includes(token))
  })
}

describe("suppression physique des scores globaux de compte", () => {
  it("retire les objets legacy des types Supabase générés", () => {
    const generatedTypes = readFileSync(GENERATED_TYPES_PATH, "utf8")

    for (const token of forbiddenTokens) {
      expect(generatedTypes).not.toContain(token)
    }
  })

  it("ne conserve aucun consumer dans le runtime, les workflows ou les scripts", () => {
    const runtimeFiles = filesRecursively(join(REPOSITORY_ROOT, "src"), /\.(?:ts|tsx)$/)
      .filter((path) => path !== GENERATED_TYPES_PATH && !path.endsWith(".test.ts"))
    const workflowFiles = filesRecursively(join(REPOSITORY_ROOT, "n8n/workflows"), /\.json$/)
    const operationalScripts = filesRecursively(join(REPOSITORY_ROOT, "scripts"), /\.(?:js|mjs|mts|sql)$/)

    expect(matchingFiles(runtimeFiles)).toEqual([])
    expect(matchingFiles(workflowFiles)).toEqual([])
    expect(matchingFiles(operationalScripts)).toEqual([])
  })

  it("garde une migration explicite et sans suppression implicite", () => {
    const migrationName = readdirSync(MIGRATIONS_PATH).find((name) =>
      name.endsWith("_drop_account_global_scores.sql"),
    )

    expect(migrationName).toBeDefined()

    const migration = readFileSync(join(MIGRATIONS_PATH, migrationName!), "utf8")
    expect(migration).not.toMatch(/\bdrop\b[^;]*\bcascade\b/i)

    for (const token of forbiddenTokens.filter((token) => token !== ["legacy", "Folio", "Score"].join(""))) {
      expect(migration).toContain(token)
    }
  })
})

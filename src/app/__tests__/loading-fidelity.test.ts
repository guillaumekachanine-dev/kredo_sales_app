import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { LEGACY_PERMANENT_REDIRECTS } from "@/lib/navigation/legacy-redirects"

// ─────────────────────────────────────────────────────────────────────────────
//  Garde-fou de l'audit d'ouverture des pages (docs/audits/AUDIT-OUVERTURE-DES-PAGES.md §7).
//
//  Le défaut « une ancienne version s'affiche avant la nouvelle » est né de refontes
//  d'écran qui n'ont pas emporté leur état de chargement. Ces invariants échouent au
//  moment où il se reproduirait.
// ─────────────────────────────────────────────────────────────────────────────

const root = process.cwd()
const appGroup = resolve(root, "src/app/(app)")

function walk(dir: string, name: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, name, found)
    else if (entry.name === name) found.push(full)
  }
  return found
}

const read = (path: string) => readFileSync(path, "utf8")
const rel = (path: string) => relative(root, path)

const pages = walk(appGroup, "page.tsx")
const loadings = walk(appGroup, "loading.tsx")

describe("Fallback du groupe (app)", () => {
  it("reste neutre : aucun gabarit de page fictive", () => {
    const source = read(join(appGroup, "loading.tsx"))
    expect(source).not.toContain("Array.from")
    expect(source).not.toMatch(/grid-cols|rounded-xl border/)
    expect(source).toContain("kredo-route-progress")
  })
})

describe("Un squelette par route", () => {
  it.each(pages.map(rel))("%s ne double pas le loading.tsx de son segment par un <Suspense>", (page) => {
    const hasLoading = existsSync(join(dirname(resolve(root, page)), "loading.tsx"))
    if (!hasLoading) return
    expect(read(resolve(root, page))).not.toMatch(/<Suspense[\s>]/)
  })
})

describe("Redirections permanentes hors du moteur de rendu", () => {
  it.each(pages.map(rel))("%s n'est pas une simple redirection constante", (page) => {
    const source = read(resolve(root, page))
    const constantRedirect = /permanentRedirect\(\s*["'`][^"'`$]*["'`]\s*\)/.test(source)
    expect(
      constantRedirect,
      "Déclarer la redirection dans src/lib/navigation/legacy-redirects.ts (308 avant tout rendu)",
    ).toBe(false)
  })

  it("chaque source de redirection n'a plus de page", () => {
    for (const { source } of LEGACY_PERMANENT_REDIRECTS) {
      const segments = source.split("/").filter(Boolean).map((s) => (s.startsWith(":") ? `[${s.slice(1)}]` : s))
      expect(existsSync(join(appGroup, ...segments, "page.tsx")), source).toBe(false)
    }
  })
})

describe("Chrome des workspaces portée par les layouts", () => {
  const FRAMES: Array<{ layout: string; page: string; frame: string }> = [
    {
      layout: "missions/(engagements)/layout.tsx",
      page: "missions/(engagements)/page.tsx",
      frame: "EngagementsDesktopFrame",
    },
    { layout: "consultants/layout.tsx", page: "consultants/page.tsx", frame: "ConsultantsDesktopFrame" },
    {
      layout: "missions/opps/(workspace)/layout.tsx",
      page: "missions/opps/(workspace)/page.tsx",
      frame: "OpportunitiesDesktopFrame",
    },
  ]

  it.each(FRAMES)("$frame est monté par le layout, jamais par la page", ({ layout, page, frame }) => {
    expect(read(join(appGroup, layout))).toContain(`<${frame}>`)
    const pageSource = read(join(appGroup, page))
    expect(pageSource).not.toMatch(/<SectionRail[\s>]/)
    expect(pageSource).not.toMatch(/Desktop(Shell|Frame)[\s>]/)
  })

  it.each(FRAMES)("$layout a un loading.tsx à côté (squelette de contenu seul)", ({ layout }) => {
    expect(existsSync(join(appGroup, dirname(layout), "loading.tsx"))).toBe(true)
  })
})

describe("Thèmes des squelettes", () => {
  // Thèmes retirés des pages : un squelette qui les peint recrée un flash de thème.
  const RETIRED_SKELETON_THEMES = ['data-theme="cockpit"', 'data-theme="intelligence-reports"']

  it.each(loadings.map(rel))("%s ne peint pas un thème retiré", (loading) => {
    const source = read(resolve(root, loading))
    for (const theme of RETIRED_SKELETON_THEMES) expect(source).not.toContain(theme)
  })

  it("chaque data-theme posé par un loading.tsx est aussi celui d'une page réelle", () => {
    const themeOf = (source: string) => [...source.matchAll(/data-theme="([^"]+)"/g)].map((m) => m[1])
    const skeletonThemes = new Set(loadings.flatMap((file) => themeOf(read(file))))
    const allTsx: string[] = []
    const collect = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          if (!/design-lab|__tests__|[/\\]loading$/.test(full)) collect(full)
        } else if (/\.tsx$/.test(entry.name) && entry.name !== "loading.tsx" && !/Skeleton/.test(entry.name)) {
          allTsx.push(full)
        }
      }
    }
    collect(resolve(root, "src"))
    const productThemes = new Set(allTsx.flatMap((file) => themeOf(read(file))))
    for (const theme of skeletonThemes) expect(productThemes, theme).toContain(theme)
  })
})

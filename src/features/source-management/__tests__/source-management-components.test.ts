import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("SourceManagementLauncher — no double mount of Desktop/Mobile shells", () => {
  const source = read("src/features/source-management/components/SourceManagementLauncher.tsx")

  it("branches on variant before returning JSX", () => {
    expect(source).toContain('if (variant === "desktop") {')
  })

  // Le choix Desktop/Mobile a migré dans `SourceManagementShell` (chargement du
  // socle à l'ouverture, constat F-3c). L'invariant ADR-0006 est inchangé : une
  // seule shell montée. Il est asserté ici sur le lanceur, et ci-dessous sur la
  // shell elle-même — là où le branchement vit désormais.
  it("desktop variant delegates to the desktop shell only", () => {
    const desktopBranch = source.slice(source.indexOf('if (variant === "desktop")'), source.lastIndexOf("return ("))
    expect(desktopBranch).toContain('<SourceManagementShell variant="desktop"')
    expect(desktopBranch).not.toContain('variant="mobile"')
  })

  it("mobile branch (after the desktop return) delegates to the mobile shell only", () => {
    const mobileBranch = source.slice(source.lastIndexOf("return ("))
    expect(mobileBranch).toContain('<SourceManagementShell variant="mobile"')
    expect(mobileBranch).not.toContain('variant="desktop"')
  })

  it("never receives the snapshot as a prop — it is loaded on open", () => {
    expect(source).not.toContain("snapshot")
  })

  it("uses the source_parameters.png asset that exists in public/icons_set", () => {
    expect(source).toContain("/icons_set/source_parameters.png")
  })

  it("gives the mobile trigger a >=44px touch target (IconButton size sm = h-11)", () => {
    expect(source).toContain('size="sm"')
  })
})

describe("SourceBaseList — system lock and category grouping", () => {
  const source = read("src/features/source-management/components/SourceBaseList.tsx")

  it("never renders edit/toggle/delete actions for a system or locked source", () => {
    expect(source).toContain('if (source.origin === "system" || source.isLocked) {')
    expect(source).toContain("Socle verrouillé")
  })

  it("groups sources by the canonical KREDO_SOURCE_CATEGORY_ORDER", () => {
    expect(source).toContain("KREDO_SOURCE_CATEGORY_ORDER")
  })

  it("never invents a family value — shows an explicit fallback instead", () => {
    expect(source).toContain("source.family ?? ")
    expect(source).toContain("Non renseignée")
  })

  it("requires a two-step confirmation before deleting a manual source", () => {
    expect(source).toContain("confirmingDelete")
    expect(source).toContain("Confirmer la suppression")
  })
})

describe("SourceCorpusCard — static/manual_only semantics and corpus toggles", () => {
  const source = read("src/features/source-management/components/SourceCorpusCard.tsx")

  it("marks a static source as visible but non-collectable, never hides it", () => {
    expect(source).toContain("!item.isCollectable")
    expect(source).toContain("Hors veille récurrente")
  })

  it("never special-cases manual_only as an exclusion (it only deprioritizes, per the plan)", () => {
    expect(source).not.toContain('"manual_only"')
  })

  it("quality_verdict is displayed as a badge and never gates activation_state", () => {
    expect(source).toContain("CORPUS_QUALITY_VERDICT_LABELS")
    expect(source).not.toMatch(/qualityVerdict\s*===\s*["'`]rejected["'`]\s*&&.*disabled/)
  })

  it("exposes the three corpus-level toggles for sector corpora: activation, news usage, account-watch usage", () => {
    expect(source).toContain("setCorpusActivationAction(")
    expect(source).toContain("setCorpusNewsEnabledAction(")
    expect(source).toContain("setCorpusAccountWatchEnabledAction(")
  })

  it("hides news and account-watch usage toggles for thematic corpora", () => {
    expect(source).toContain('corpus.scopeKind !== "thematic"')
  })

  it("exposes per-item modulation via setCorpusItemEnabledAction", () => {
    expect(source).toContain("setCorpusItemEnabledAction(")
  })
})

describe("SourceCorpusDetailView — thematic corpora controls", () => {
  const source = read("src/features/source-management/components/SourceCorpusDetailView.tsx")

  it("hides Actualités and Veille comptes switches when scopeKind is thematic", () => {
    expect(source).toContain('corpus?.scopeKind !== "thematic"')
  })

  it("always exposes Corpus actif switch", () => {
    expect(source).toContain("Corpus actif")
    expect(source).toContain("toggleActivation")
  })

  it("uses neutral corpus labels rather than hardcoded sector labels", () => {
    expect(source).not.toContain("dans ce corpus sectoriel.")
    expect(source).toContain("dans ce corpus.")
  })
})

describe("ManualSourceForm — duplicate handling and reactivation", () => {
  const source = read("src/features/source-management/components/ManualSourceForm.tsx")

  it("offers to reactivate an existing inactive manual source on duplicate", () => {
    expect(source).toContain("reactivateManualSourceAction")
    expect(source).toContain("Réactiver")
    expect(source).toContain('result.duplicate.origin === "manual" && !result.duplicate.isActive')
  })

  it("is an internal state of the shell, never a nested dialog", () => {
    expect(source).not.toContain("AppDialog")
    expect(source).not.toContain("AppDrawer")
  })
})

describe("Corpus import — wired to the Lot 4 wizard, gated on canManage", () => {
  const desktop = read("src/features/source-management/components/SourceManagementDialogDesktop.tsx")
  const mobile = read("src/features/source-management/components/SourceManagementModalMobile.tsx")

  for (const [label, source] of [["Desktop", desktop], ["Mobile", mobile]] as const) {
    it(`${label}: the "Importer un corpus" CTA opens the wizard and is gated on canManage`, () => {
      expect(source).toContain("SourceCorpusImportWizard")
      expect(source).toContain('kind: "import"')
      expect(source).toContain("snapshot.canManage")
    })

    it(`${label}: shows a clean empty state when no sector corpus exists`, () => {
      expect(source).toContain("snapshot.sectorCorpora.length === 0")
    })

    it(`${label}: the wizard is an internal shell state, never a nested dialog`, () => {
      const wizardSource = read("src/features/source-management/components/SourceCorpusImportWizard.tsx")
      expect(wizardSource).not.toContain("AppDialog")
      expect(wizardSource).not.toContain("AppDrawer")
    })
  }

  it("Desktop mounts the wizard with variant=\"desktop\"", () => {
    expect(desktop).toContain('<SourceCorpusImportWizard variant="desktop"')
  })

  it("Mobile mounts the wizard with variant=\"mobile\"", () => {
    expect(mobile).toContain('<SourceCorpusImportWizard variant="mobile"')
  })
})

describe("Thematic corpora display in Desktop and Mobile shells", () => {
  const desktop = read("src/features/source-management/components/SourceManagementDialogDesktop.tsx")
  const mobile = read("src/features/source-management/components/SourceManagementModalMobile.tsx")

  it("Desktop displays Corpus thématiques section with snapshot.thematicCorpora", () => {
    expect(desktop).toContain("Corpus thématiques")
    expect(desktop).toContain("snapshot.thematicCorpora")
  })

  it("Desktop resolves activeCorpus from both sectorCorpora and thematicCorpora", () => {
    expect(desktop).toContain("[...snapshot.sectorCorpora, ...snapshot.thematicCorpora]")
  })

  it("Mobile displays Corpus thématiques section with snapshot.thematicCorpora", () => {
    expect(mobile).toContain("Corpus thématiques")
    expect(mobile).toContain("snapshot.thematicCorpora")
  })
})

describe("SourceManagementShell — chargement à l'ouverture et invariant adaptatif", () => {
  const source = read("src/features/source-management/components/SourceManagementShell.tsx")

  it("ne monte rien — donc ne charge rien — tant que le panneau est fermé", () => {
    // Garde-fou du constat F-3c : /veille chargeait 5 requêtes (~107 Ko) à chaque
    // rendu de page pour trois dialogues qui ne s'ouvrent que sur clic.
    // Le montage conditionnel est CE qui diffère le chargement : un état interne
    // ne suffirait pas, `useModuleSnapshot` se déclenche au montage.
    expect(source).toContain("if (!open) return null")
    expect(source).toContain("useModuleSnapshot(loadSourceManagementSnapshot)")
  })

  it("ne reçoit jamais le socle en prop", () => {
    expect(source).not.toContain("snapshot:")
  })

  it("rend l'échec de chargement, jamais un panneau vide silencieux", () => {
    expect(source).toContain('state.status === "error"')
    expect(source).toContain("isError=")
  })

  it("ne monte qu'une seule shell — ADR-0006", () => {
    const branch = source.slice(source.indexOf('return variant === "desktop"'))
    expect(branch).toContain("<SourceManagementDialogDesktop")
    expect(branch).toContain("<SourceManagementModalMobile")
    // Ternaire strict : les deux ne peuvent pas être rendues simultanément.
    expect(branch).toMatch(/variant === "desktop" \? \(/)
  })

  it("le dialogue de réglages de veille est lui aussi monté à l'ouverture seulement", () => {
    const header = read("src/components/veille/VeilleHeaderActions.tsx")
    expect(header).toContain("{settingsOpen ? (")
    expect(header).not.toContain("sourceManagementSnapshot")
  })

  it("/veille ne charge plus le socle de sources au rendu de page", () => {
    const page = read("src/app/(app)/veille/page.tsx")
    expect(page).not.toContain("getSourceManagementSnapshot")
  })
})

describe("Desktop/Mobile shells stay two distinct components (ADR-0006 adaptive)", () => {
  it("VeilleActualitesDesktop mounts the desktop shell, not the mobile drawer", () => {
    const source = read("src/components/veille/VeilleActualitesDesktop.tsx")
    // Insensible au formatage : ce qui compte est la shell et sa variante.
    expect(source).toMatch(/<SourceManagementShell\s+variant="desktop"/)
    expect(source).not.toContain("<SourceManagementModalMobile")
  })

  it("VeilleActualitesMobile mounts only the mobile launcher variant, inside MobilePageHeader.actions", () => {
    const source = read("src/components/veille/VeilleActualitesMobile.tsx")
    expect(source).toContain('actions={<SourceManagementLauncher variant="mobile"')
    expect(source).not.toContain('variant="desktop"')
  })

  it("never renders one shell hidden in CSS for the other breakpoint", () => {
    const desktop = read("src/components/veille/VeilleHeaderActions.tsx")
    const mobile = read("src/components/veille/VeilleActualitesMobile.tsx")
    for (const source of [desktop, mobile]) {
      expect(source).not.toMatch(/hidden md:block|md:hidden/)
    }
  })
})

describe("Dead global-watch fields are fully removed", () => {
  const header = read("src/components/veille/VeilleHeaderActions.tsx")
  const contracts = read("src/components/veille/veille-desktop-contracts.ts")

  it("VeilleHeaderActions no longer references sourceFamilies/categories", () => {
    expect(header).not.toContain("sourceFamilies")
    expect(header).not.toContain("categories")
    expect(header).not.toContain("Familles de sources")
    expect(header).not.toContain("Catégories surveillées")
  })

  it("GlobalWatchSettings keeps only enabled/cadence/maxArticles", () => {
    expect(contracts).not.toContain("sourceFamilies")
    expect(contracts).not.toContain("categories: string[]")
  })

  it("saveGlobalWatchSettingsAction still merges into workspace.settings instead of overwriting it", () => {
    const actions = read("src/app/(app)/veille/_actions/veille-actions.ts")
    expect(actions).toContain("...currentSettings")
  })
})

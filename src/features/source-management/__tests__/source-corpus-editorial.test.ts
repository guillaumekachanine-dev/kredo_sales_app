import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Corpus Editorial Mode — Snapshot name and description resolution", () => {
  const snapshotSource = read("src/features/source-management/data/get-source-management-snapshot.ts")

  it("extracts corpus name prioritizing editorial.name -> meta.name -> name -> sectorName -> slug", () => {
    expect(snapshotSource).toContain("extractCorpusName(corpus: SourceCorporaRow)")
    expect(snapshotSource).toContain("metaObj.editorial")
    expect(snapshotSource).toContain("metaObj.meta")
    expect(snapshotSource).toContain("metaObj.name")
    expect(snapshotSource).toContain("extractCorpusName(corpus) ?? resolvedSectorName ?? corpus.slug")
  })

  it("extracts corpus description prioritizing editorial.description -> meta.description -> description -> null", () => {
    expect(snapshotSource).toContain("extractCorpusDescription(corpus: SourceCorporaRow)")
    expect(snapshotSource).toContain("editorial as Record<string, unknown>).description")
    expect(snapshotSource).toContain("meta as Record<string, unknown>).description")
    expect(snapshotSource).toContain("metaObj.description")
    expect(snapshotSource).toContain("description: extractCorpusDescription(corpus)")
  })

  it("adds description to SourceCorpusView in contracts", () => {
    const contractsSource = read("src/features/source-management/domain/source-management-contracts.ts")
    expect(contractsSource).toContain("description: string | null")
    expect(contractsSource).toContain("export type UpdateCorpusEditorialInput = {")
    expect(contractsSource).toContain("export type RenameCorpusSourceInput = {")
  })
})

describe("Corpus Editorial Mode — Server Actions & Permissions", () => {
  const actionsSource = read("src/features/source-management/actions/source-management-actions.ts")

  it("requires resolveActingWorkspace for all editorial actions", () => {
    for (const action of ["updateCorpusEditorialAction", "renameCorpusSourceAction", "removeSourceFromCorpusAction"]) {
      const slice = actionsSource.slice(actionsSource.indexOf(`export async function ${action}(`))
      expect(slice.slice(0, 300)).toContain("resolveActingWorkspace()")
    }
  })

  it("updateCorpusEditorialAction rejects empty name and enforces max lengths", () => {
    const slice = actionsSource.slice(actionsSource.indexOf("export async function updateCorpusEditorialAction("))
    expect(slice).toContain("Le nom du corpus ne peut pas être vide.")
    expect(slice).toContain("normalizedName.length > 120")
    expect(slice).toContain("normalizedDescription.length > 500")
  })

  it("updateCorpusEditorialAction rejects system corpora", () => {
    const slice = actionsSource.slice(actionsSource.indexOf("export async function updateCorpusEditorialAction("))
    expect(slice).toContain('current.scope_kind === "system"')
    expect(slice).toContain("Un corpus système ne peut pas être modifié.")
  })

  it("updateCorpusEditorialAction merges editorial metadata without destroying existing keys", () => {
    const slice = actionsSource.slice(actionsSource.indexOf("export async function updateCorpusEditorialAction("))
    expect(slice).toContain("...currentMeta")
    expect(slice).toContain("...currentEditorial")
    expect(slice).toContain("editorial: updatedEditorial")
  })

  it("renameCorpusSourceAction rejects renaming when origin is system or is_locked", () => {
    const slice = actionsSource.slice(actionsSource.indexOf("export async function renameCorpusSourceAction("))
    expect(slice).toContain('source.origin === "system" || source.is_locked')
    expect(slice).toContain("Une source système ou verrouillée ne peut pas être modifiée.")
  })

  it("renameCorpusSourceAction updates exclusively source_catalog.name", () => {
    const slice = actionsSource.slice(actionsSource.indexOf("export async function renameCorpusSourceAction("))
    expect(slice).toContain('.from("source_catalog")')
    expect(slice).toContain('.update({ name: normalizedName })')
    expect(slice).not.toContain("source_key:")
    expect(slice).not.toContain("domain:")
    expect(slice).not.toContain("search_domain:")
  })

  it("removeSourceFromCorpusAction deletes strictly from source_corpus_items and never from source_catalog", () => {
    const slice = actionsSource.slice(actionsSource.indexOf("export async function removeSourceFromCorpusAction("))
    expect(slice).toContain('.from("source_corpus_items")')
    expect(slice).toContain(".delete()")
    expect(slice).toContain('.eq("id", itemId)')
    expect(slice).not.toContain('.from("source_catalog").delete')
  })

  it("removeSourceFromCorpusAction rejects removing sources from a system corpus", () => {
    const slice = actionsSource.slice(actionsSource.indexOf("export async function removeSourceFromCorpusAction("))
    expect(slice).toContain('corpus.scope_kind === "system"')
    expect(slice).toContain("Impossible de retirer une source d'un corpus système.")
  })
})

describe("Corpus Editorial Mode — Ingest compatibility", () => {
  const ingestSource = read("src/features/source-management/actions/ingest-source-corpus.ts")

  it("preserves metadata.editorial when re-importing a corpus of the same version", () => {
    expect(ingestSource).toContain('.from("source_corpora")')
    expect(ingestSource).toContain('.eq("slug", payload.slug)')
    expect(ingestSource).toContain('.eq("version", payload.version)')
    expect(ingestSource).toContain("existingMeta.editorial")
    expect(ingestSource).toContain("editorial: existingMeta.editorial")
  })
})

describe("Corpus Editorial Mode — Desktop UI (SourceCorpusDetailView)", () => {
  const desktopView = read("src/features/source-management/components/SourceCorpusDetailView.tsx")
  const dialogDesktop = read("src/features/source-management/components/SourceManagementDialogDesktop.tsx")

  it("passes canEdit from SourceManagementDialogDesktop to SourceCorpusDetailView", () => {
    expect(dialogDesktop).toContain("canEdit={snapshot.canManage && activeCorpus.scopeKind !== \"system\"}")
  })

  it("displays pencil button only when canEdit is true", () => {
    expect(desktopView).toContain("canEdit ? (")
    expect(desktopView).toContain("handleStartEdit")
    expect(desktopView).toContain("<PencilIcon")
  })

  it("shows read mode with description under the name when present", () => {
    expect(desktopView).toContain("corpus?.description ? (")
    expect(desktopView).toContain("corpus.description")
  })

  it("toggles inline edit mode without nested modals or drawers", () => {
    expect(desktopView).toContain("isEditing ? (")
    expect(desktopView).toContain("handleSaveCorpus")
    expect(desktopView).toContain("handleCancelEdit")
    expect(desktopView).not.toContain("AppDialog")
    expect(desktopView).not.toContain("AppDrawer")
  })

  it("provides inline confirmation before removing a source from corpus", () => {
    expect(desktopView).toContain("Retirer cette source du corpus ?")
    expect(desktopView).toContain("removeSourceFromCorpusAction")
  })

  it("displays discrete notice about shared source name in edit mode", () => {
    expect(desktopView).toContain("Le nom de la source est commun à tous les corpus qui l’utilisent.")
  })
})

describe("Corpus Editorial Mode — Mobile UI (SourceCorpusCard)", () => {
  const cardSource = read("src/features/source-management/components/SourceCorpusCard.tsx")
  const mobileSource = read("src/features/source-management/components/SourceManagementModalMobile.tsx")

  it("passes canEdit from SourceManagementModalMobile to corpus view", () => {
    expect(mobileSource).toContain("canEdit={snapshot.canManage && activeCorpus.scopeKind !== \"system\"}")
  })

  it("renders mobile edit button with touch target >= 44px (min-h-[44px] min-w-[44px])", () => {
    expect(cardSource).toContain("min-h-[44px] min-w-[44px]")
    expect(cardSource).toContain("Modifier le corpus")
  })

  it("provides inputs for corpus name and description with touch targets >= 44px", () => {
    expect(cardSource).toContain("corpusNameDraft")
    expect(cardSource).toContain("corpusDescDraft")
    expect(cardSource).toContain("updateCorpusEditorialAction")
  })

  it("provides touch-friendly inline removal confirmation on mobile", () => {
    expect(cardSource).toContain("Retirer cette source du corpus ?")
    expect(cardSource).toContain("removeSourceFromCorpusAction")
  })
})

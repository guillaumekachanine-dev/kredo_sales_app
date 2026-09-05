import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  assembleDigestFraming,
  ACTIVE_SECTORS_TOKEN,
  NO_ACTIVE_SECTORS_LABEL,
} from "../domain/assemble-digest-framing"
import { DIGEST_PRESETS, GLOBAL_DIGEST_TOPIC_KEY, buildSectorDigestPreset } from "../domain/digest-presets"

/**
 * Extrait le `blocContexteKredo` réellement figé dans le workflow versionné, et
 * le rend pour une liste de secteurs donnée. La comparaison n'est donc pas faite
 * contre une copie manuelle qui dériverait en silence, mais contre le JSON du
 * dépôt lui-même : si quelqu'un modifie le nœud n8n sans mettre à jour le
 * registre TypeScript, ce test tombe.
 */
function renderN8nFramingBlock(secteursActifs: string): string {
  const workflow = JSON.parse(
    readFileSync(join(process.cwd(), "n8n/workflows/veille-hebdomadaire-kredo.json"), "utf8"),
  ) as { nodes: Array<{ name: string; parameters?: { jsCode?: string } }> }

  const node = workflow.nodes.find((candidate) => candidate.name === "Build Contexte KREDO")
  const jsCode = node?.parameters?.jsCode
  if (!jsCode) throw new Error("Nœud « Build Contexte KREDO » introuvable dans le workflow versionné.")

  const opening = "const blocContexteKredo = `"
  const start = jsCode.indexOf(opening)
  if (start === -1) throw new Error("`blocContexteKredo` introuvable dans le nœud.")
  const from = start + opening.length
  const end = jsCode.indexOf("`;", from)
  if (end === -1) throw new Error("Fin du littéral `blocContexteKredo` introuvable.")

  return jsCode.slice(from, end).split("${secteursActifs}").join(secteursActifs)
}

describe("assembleDigestFraming", () => {
  it("reproduit a l'identique le blocContexteKredo fige dans le workflow n8n pour le sujet global", () => {
    const activeSectors = ["Industrie manufacturière", "Tourisme, Hôtellerie & Loisirs"]

    const assembled = assembleDigestFraming(DIGEST_PRESETS[GLOBAL_DIGEST_TOPIC_KEY], { activeSectors })

    expect(assembled).toBe(renderN8nFramingBlock(activeSectors.join(", ")))
  })

  it("reproduit le repli « transverse » du workflow quand aucun secteur n'est couvert", () => {
    const assembled = assembleDigestFraming(DIGEST_PRESETS[GLOBAL_DIGEST_TOPIC_KEY], { activeSectors: [] })

    expect(assembled).toBe(renderN8nFramingBlock(NO_ACTIVE_SECTORS_LABEL))
    expect(assembled).toContain(`couverts par KREDO : ${NO_ACTIVE_SECTORS_LABEL}.`)
  })

  it("n'ajoute jamais de section « Sujet » au cadrage global, sous peine de rompre l'identite", () => {
    const assembled = assembleDigestFraming(DIGEST_PRESETS[GLOBAL_DIGEST_TOPIC_KEY], {
      activeSectors: ["Un secteur"],
    })

    expect(assembled).not.toContain("## Sujet de ce digest")
  })

  it("ajoute la section « Sujet » pour tout autre sujet", () => {
    const assembled = assembleDigestFraming(DIGEST_PRESETS.ia, { activeSectors: ["Un secteur"] })

    expect(assembled).toContain("## Sujet de ce digest")
    expect(assembled).toContain(DIGEST_PRESETS.ia.label)
    expect(assembled).toContain(DIGEST_PRESETS.ia.intent)
  })

  it("substitue le jeton de secteurs partout, y compris dans les listes du preset", () => {
    const assembled = assembleDigestFraming(DIGEST_PRESETS[GLOBAL_DIGEST_TOPIC_KEY], {
      activeSectors: ["Aéronautique"],
    })

    expect(assembled).not.toContain(ACTIVE_SECTORS_TOKEN)
    expect(assembled).toContain("Un signal touchant un des secteurs de Aéronautique")
  })

  it("nomme le segment vise dans le cadrage d'un sujet sectoriel", () => {
    const preset = buildSectorDigestPreset({ slug: "seg-demo", name: "Compositions & ingrédients B2B" })

    const assembled = assembleDigestFraming(preset, {
      activeSectors: ["Parfumerie"],
      segmentLabel: preset.label,
    })

    expect(assembled).toContain("## Sujet de ce digest")
    expect(assembled).toContain("Compositions & ingrédients B2B")
  })

  it("ignore les noms de secteurs vides plutot que de produire une liste a trous", () => {
    const assembled = assembleDigestFraming(DIGEST_PRESETS[GLOBAL_DIGEST_TOPIC_KEY], {
      activeSectors: ["  ", "Santé", ""],
    })

    expect(assembled).toContain("couverts par KREDO : Santé.")
  })
})

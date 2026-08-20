import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { mapE4ToCanon, normalizeEventDate, truncateEventTitle } from "./map-e4-to-canon"
import type { E4SectorKnowledgeOutput } from "./e4-contracts"

describe("mapE4ToCanon — Invariants et Mapping", () => {
  const dummyMeta = {
    segment_slug: "seg-test",
    date_snapshot: "2026-08-14",
    acces_web: "complet" as const,
    confiance_plafond: "haute" as const,
  }

  it("1. Piège §4.1 : maillons[i].rang devient value_chain_nodes.maillon (et non rang)", () => {
    const input: E4SectorKnowledgeOutput = {
      meta: dummyMeta,
      perimetre: { definition: "Def", hors_champ: [], regle_comparabilite: "Regle" },
      theses: [],
      message_sectoriel: "Msg",
      marche: { perimetre: "France", src_ids: [1], taille_eur_bn: 1.5 },
      modeles_economiques: [],
      maillons: [
        {
          rang: 3,
          nom: "Transformation & Synthèse",
          contenu: "Description du maillon 3",
          ou_lesn_se_branche: "Branche ESN",
          src_ids: [1],
        },
      ],
      regulation: [],
      playbook: { personas: [], objections: [], entry_points: [], roi_arguments: [] },
      sources: [],
      compteurs: {},
    }

    const { payload } = mapE4ToCanon(input, { segmentId: "00000000-0000-0000-0000-000000000001" })

    expect(payload.value_chain_nodes).toHaveLength(1)
    expect(payload.value_chain_nodes[0].maillon).toBe(3)
    expect(payload.value_chain_nodes[0].label).toBe("Transformation & Synthèse")
    expect(payload.value_chain_nodes[0].description).toBe("Description du maillon 3")
  })

  it("2. Traduction des practices : mapOfferPracticeToKredoPractice('data-ai') donne 'data_ai'", () => {
    const input: E4SectorKnowledgeOutput = {
      meta: dummyMeta,
      perimetre: { definition: "Def", hors_champ: [], regle_comparabilite: "Regle" },
      theses: [],
      message_sectoriel: "Msg",
      marche: { perimetre: "France", src_ids: [1], taille_eur_bn: 1.5 },
      modeles_economiques: [],
      maillons: [],
      regulation: [
        {
          libelle: "Règlement IA",
          statut: "acquis",
          authority: "UE",
          source_url: "https://eur-lex.europa.eu/test",
          commercial_angle: "Angle",
          kredo_practice: "data-ai",
          portee: "segment",
        },
        {
          libelle: "Directive NIS2",
          statut: "acquis",
          authority: "ANSSI",
          source_url: "https://anssi.gouv.fr/test",
          commercial_angle: "Angle",
          kredo_practice: "cybersecurity",
          portee: "segment",
        },
      ],
      playbook: { personas: [], objections: [], entry_points: [], roi_arguments: [] },
      sources: [],
      compteurs: {},
    }

    const { payload } = mapE4ToCanon(input, { segmentId: "00000000-0000-0000-0000-000000000001" })

    expect(payload.regulatory_items[0].kredo_practice).toBe("data_ai")
    expect(payload.regulatory_items[1].kredo_practice).toBe("cyber")
  })

  it("3. Verrous de résolution : taille_statut='not_published' force market_size_eur_bn à null et pose le verrou", () => {
    const inputWithLock: E4SectorKnowledgeOutput = {
      meta: dummyMeta,
      perimetre: { definition: "Def", hors_champ: [], regle_comparabilite: "Regle" },
      theses: [],
      message_sectoriel: "Msg",
      marche: {
        perimetre: "France",
        src_ids: [1],
        taille_eur_bn: 42.5, // Même si un nombre existait par erreur, le statut l'emporte
        taille_statut: "not_published",
        croissance_pct: 3.2,
        croissance_statut: "published",
      },
      modeles_economiques: [],
      maillons: [],
      regulation: [],
      playbook: { personas: [], objections: [], entry_points: [], roi_arguments: [] },
      sources: [],
      compteurs: {},
    }

    const { payload: payloadLocked } = mapE4ToCanon(inputWithLock, { segmentId: "00000000-0000-0000-0000-000000000001" })

    expect(payloadLocked.sector_patch.market_size_eur_bn).toBeNull()
    expect(payloadLocked.sector_patch.resolution_locks?.market_size_eur_bn).toBe("not_published")
    expect(payloadLocked.sector_patch.market_growth_pct).toBe(3.2)
    expect(payloadLocked.sector_patch.resolution_locks?.market_growth_pct).toBeUndefined()

    // Test sans statut spécifié (comportement historique : pas de verrou posé)
    const inputWithoutStatus: E4SectorKnowledgeOutput = {
      meta: dummyMeta,
      perimetre: { definition: "Def", hors_champ: [], regle_comparabilite: "Regle" },
      theses: [],
      message_sectoriel: "Msg",
      marche: {
        perimetre: "France",
        src_ids: [1],
        taille_eur_bn: 10.0,
        croissance_pct: 5.0,
      },
      modeles_economiques: [],
      maillons: [],
      regulation: [],
      playbook: { personas: [], objections: [], entry_points: [], roi_arguments: [] },
      sources: [],
      compteurs: {},
    }

    const { payload: payloadUnlocked } = mapE4ToCanon(inputWithoutStatus, { segmentId: "00000000-0000-0000-0000-000000000001" })
    expect(payloadUnlocked.sector_patch.market_size_eur_bn).toBe(10.0)
    expect(payloadUnlocked.sector_patch.market_growth_pct).toBe(5.0)
    expect(payloadUnlocked.sector_patch.resolution_locks).toEqual({})
  })

  it("4. Filtrage réglementation : portee='macro' n'apparaît pas dans regulatory_items et est tracé dans meta", () => {
    const input: E4SectorKnowledgeOutput = {
      meta: dummyMeta,
      perimetre: { definition: "Def", hors_champ: [], regle_comparabilite: "Regle" },
      theses: [],
      message_sectoriel: "Msg",
      marche: { perimetre: "France", src_ids: [1] },
      modeles_economiques: [],
      maillons: [],
      regulation: [
        {
          libelle: "Régulation Segment",
          statut: "acquis",
          authority: "UE",
          source_url: "https://eur-lex.europa.eu/1",
          commercial_angle: "Angle 1",
          portee: "segment",
        },
        {
          libelle: "Régulation Macro",
          statut: "acquis",
          authority: "UE",
          source_url: "https://eur-lex.europa.eu/2",
          commercial_angle: "Angle 2",
          portee: "macro",
        },
      ],
      playbook: { personas: [], objections: [], entry_points: [], roi_arguments: [] },
      sources: [],
      compteurs: {},
    }

    const result = mapE4ToCanon(input, { segmentId: "00000000-0000-0000-0000-000000000001" })

    expect(result.payload.regulatory_items).toHaveLength(1)
    expect(result.payload.regulatory_items[0].name).toBe("Régulation Segment")
    expect(result.meta.ignoredMacroRegulations).toHaveLength(1)
    expect(result.meta.ignoredMacroRegulations[0].libelle).toBe("Régulation Macro")
  })

  it("5. Test contre le fixture réel du run pilote Parfumerie (04-secteur.json)", () => {
    const pilotPath = resolve(__dirname, "../../../../docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/04-secteur.json")
    const pilotRaw = readFileSync(pilotPath, "utf8")
    const pilotData = JSON.parse(pilotRaw) as E4SectorKnowledgeOutput

    const segmentId = "db34f8a0-9d9e-4585-acd6-2fbbdd1baad6"
    const result = mapE4ToCanon(pilotData, { segmentId })
    const { payload, meta } = result

    // Vérification globale du segment
    expect(payload.segment_id).toBe(segmentId)
    expect(payload.study_snapshot_date).toBe("2026-08-14")

    // Vérification des 6 maillons (6 maillons E4 -> 6 nœuds en base avec maillon 1 à 6)
    expect(payload.value_chain_nodes).toHaveLength(6)
    expect(payload.value_chain_nodes.map((n) => n.maillon)).toEqual([1, 2, 3, 4, 5, 6])
    expect(meta.counts.maillons).toBe(6)

    // Vérification des dépendances critiques
    expect(meta.counts.dependancesCritiques).toBe(6)
    const depCrit = (payload.sector_patch.playbook_patch as Record<string, unknown>).dependances_critiques as unknown[]
    expect(depCrit).toHaveLength(6)

    // Vérification des pain points
    expect(payload.pain_points).toHaveLength(4)
    expect(meta.counts.painPoints).toBe(4)

    // Vérification de la réglementation : 5 items au total dont 3 macro ignorés et 2 écrits
    expect(payload.regulatory_items).toHaveLength(2)
    expect(meta.ignoredMacroRegulations).toHaveLength(3)
    expect(meta.counts.regulatoryItems).toBe(2)
    expect(meta.counts.ignoredMacroRegulations).toBe(3)

    // Vérification de la chronologie (7 événements)
    expect(payload.events).toHaveLength(7)
    expect(meta.counts.events).toBe(7)
    expect(payload.events[0].event_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // Vérification des thèses (5 thèses)
    expect(meta.counts.theses).toBe(5)

    // Vérification des modèles économiques combinés (4 blocs clients + 5 modèles = 9)
    expect(meta.counts.economicModels).toBe(9)

    // Vérification des fronts technologiques (5) et risques (7)
    expect(meta.counts.techFronts).toBe(5)
    expect(meta.counts.risks).toBe(7)

    // Vérification des sources (29) et trous (5)
    expect(meta.counts.sources).toBe(29)
    expect(meta.counts.trous).toBe(5)

    // Vérification des verrous sur le marché (non publié sur le pilote)
    expect(payload.sector_patch.market_size_eur_bn).toBeNull()
    expect(payload.sector_patch.market_growth_pct).toBeNull()
    expect(payload.sector_patch.resolution_locks).toEqual({
      market_size_eur_bn: "not_published",
      market_growth_pct: "not_published",
    })
  })

  it("6. Helpers de normalisation de date et titre", () => {
    expect(normalizeEventDate("2026")).toBe("2026-01-01")
    expect(normalizeEventDate("2026-08")).toBe("2026-08-01")
    expect(normalizeEventDate("2026-08-14")).toBe("2026-08-14")

    const shortTitle = "Court titre"
    expect(truncateEventTitle(shortTitle)).toBe("Court titre")

    const longTitle = "A".repeat(150)
    const truncated = truncateEventTitle(longTitle, 120)
    expect(truncated.length).toBeLessThanOrEqual(120)
    expect(truncated.endsWith("...")).toBe(true)
  })
})

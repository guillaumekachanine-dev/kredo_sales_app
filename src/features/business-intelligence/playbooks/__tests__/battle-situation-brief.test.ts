import { describe, expect, it } from "vitest"
import {
  BATTLE_SITUATION_ACTIVITY_CATEGORY,
  BATTLE_SITUATION_CHANNEL,
  BATTLE_SITUATION_OUTPUT_KIND,
  BATTLE_SITUATION_SCENARIO,
  buildBattleSituationBrief,
  readBattleSituation,
  type BuildBattleSituationBriefInput,
} from "../battle-situation-brief"
import {
  createEmptyBattleSituationDraft,
  type BattleSituationDraft,
} from "../battle-situation-options"

// ─── Fixtures ───────────────────────────────────────────────────────────────

const CONTACT_PERSONA = {
  key: "contact:ct-1",
  kind: "contact" as const,
  label: "Camille Roux",
  sublabel: "DSI",
  contactId: "ct-1",
  jobTitle: "Directrice des systèmes d'information",
  relationshipRole: "decideur",
}

const PLAYBOOK_PERSONA = {
  key: "playbook-persona:0:DSI",
  kind: "playbook" as const,
  label: "DSI",
  sublabel: "Continuité du SI",
  personaLabel: "DSI",
}

const ACCOUNT_ISSUE = {
  key: "account-issue:ai-1",
  id: "ai-1",
  label: "Modernisation du SI de production",
  source: "account" as const,
  detail: "ERP en fin de support",
  evidenceLevel: "observed",
  resolvedLevel: null,
}

const SECTOR_ISSUE = {
  key: "sector-pain-point:pp-1",
  id: "pp-1",
  label: "Traçabilité réglementaire des lots",
  source: "sector" as const,
  detail: null,
  evidenceLevel: null,
  resolvedLevel: "segment" as const,
}

const ANGLE = {
  key: "actor-angle:Industrialisation gouvernée",
  label: "Industrialisation gouvernée",
  source: "account" as const,
  detail: null,
}

const OFFER = {
  key: "offer:off-1",
  id: "off-1",
  name: "Cloud Assessment",
  practiceName: "Cloud Engineering",
  shortDescription: null,
  isSuggested: true,
}

function createDraft(overrides: Partial<BattleSituationDraft> = {}): BattleSituationDraft {
  return {
    ...createEmptyBattleSituationDraft(),
    persona: CONTACT_PERSONA,
    issue: ACCOUNT_ISSUE,
    angle: ANGLE,
    offer: OFFER,
    ...overrides,
  }
}

function createInput(overrides: Partial<BuildBattleSituationBriefInput> = {}): BuildBattleSituationBriefInput {
  return {
    actor: { id: "cme-1", companyId: "comp-1", name: "Robertet", lifecycleStatus: "prospect" },
    segmentId: "seg-1",
    senderName: "Guillaume Kasanin",
    draft: createDraft(),
    ...overrides,
  }
}

function buildOk(input: BuildBattleSituationBriefInput) {
  const result = buildBattleSituationBrief(input)
  if (!result.ok) throw new Error(`brief attendu, manquants : ${result.missing.join(", ")}`)
  return result
}

// ─── Identité du scénario ───────────────────────────────────────────────────

describe("Lot 3 — identité du brief Battle", () => {
  it("porte le scénario, le type de sortie, le canal, la catégorie et le scope attendus", () => {
    const { brief } = buildOk(createInput())

    expect(brief.what.scenario).toBe(BATTLE_SITUATION_SCENARIO)
    expect(brief.what.outputKind).toBe(BATTLE_SITUATION_OUTPUT_KIND)
    expect(brief.what.channel).toBe(BATTLE_SITUATION_CHANNEL)
    expect(brief.what.activityCategory).toBe(BATTLE_SITUATION_ACTIVITY_CATEGORY)
    expect(brief.what.scope).toBe("account")
  })

  it("applique les défauts du lot : concis, décrocher un rendez-vous, direct, vous, fr", () => {
    const { brief } = buildOk(createInput())

    expect(brief.what.length).toBe("concise")
    expect(brief.who.objective).toBe("get_meeting")
    expect(brief.how.tone).toBe("direct")
    expect(brief.how.formality).toBe("vous")
    expect(brief.how.language).toBe("fr")
  })

  it("respecte la longueur choisie par l'utilisateur", () => {
    const { brief } = buildOk(createInput({ draft: createDraft({ length: "standard" }) }))
    expect(brief.what.length).toBe("standard")
  })

  it("documente que le scénario n'est pas encore enregistré (Lot 4, A3)", () => {
    // Ce booléen bascule tout seul le jour où A3 ajoute le seed au registre :
    // l'imposition d'identité devient alors inerte, le résolveur suffit.
    const { scenarioRegistered } = buildOk(createInput())
    expect(scenarioRegistered).toBe(false)
  })

  it("dérive le type de destinataire du lifecycle du compte, pas du scénario de repli", () => {
    const { brief } = buildOk(
      createInput({ actor: { id: "cme-1", companyId: "comp-1", name: "Robertet", lifecycleStatus: "client_actif" } }),
    )
    expect(brief.who.recipient.type).toBe("active_client")
    expect(brief.who.recipient.relation).toBe("active_client")
  })
})

// ─── Interlocuteur ──────────────────────────────────────────────────────────

describe("Lot 3 — interlocuteur dans le brief", () => {
  it("contact CRM : contactId, nom réel et persona dérivée de la fonction", () => {
    const { brief, battleSituation } = buildOk(createInput())

    expect(brief.who.recipient.contactId).toBe("ct-1")
    expect(brief.who.recipient.displayName).toBe("Camille Roux")
    expect(brief.who.recipient.persona).toBe("cto_cio")
    expect(battleSituation.personaLabel).toBeUndefined()
  })

  it("sans contact CRM : personaLabel dans battleSituation, aucun nom fabriqué", () => {
    const { brief, battleSituation } = buildOk(
      createInput({ draft: createDraft({ persona: PLAYBOOK_PERSONA }) }),
    )

    expect(battleSituation.personaLabel).toBe("DSI")
    expect(brief.who.recipient.contactId).toBeUndefined()
    // `displayName` désigne une personne réelle — le nœud `Quality Check` de n8n
    // y cherche un nom de famille. Un rôle générique n'y a pas sa place.
    expect(brief.who.recipient.displayName).toBeUndefined()
    expect(brief.who.recipient.persona).toBe("other")
  })
})

// ─── Champs canoniques vs bloc Situation ────────────────────────────────────

describe("Lot 3 — répartition canonique / battleSituation", () => {
  it("porte l'offre dans context.offerRef, jamais dans battleSituation", () => {
    const { brief, battleSituation } = buildOk(createInput())

    expect(brief.context.offerRef).toBe("off-1")
    expect(JSON.stringify(battleSituation)).not.toContain("off-1")
  })

  it("porte les listes personnelles dans context.preferredCollectionIds", () => {
    const { brief, battleSituation } = buildOk(
      createInput({ draft: createDraft({ collectionIds: ["col-1", "col-2"] }) }),
    )

    expect(brief.context.preferredCollectionIds).toEqual(["col-1", "col-2"])
    expect(JSON.stringify(battleSituation)).not.toContain("col-1")
  })

  it("omet preferredCollectionIds quand aucune liste n'est choisie", () => {
    const { brief } = buildOk(createInput())
    expect(brief.context.preferredCollectionIds).toBeUndefined()
  })

  it("ne place l'angle QUE dans battleSituation.angle — context.angle est du code mort", () => {
    const { brief, battleSituation } = buildOk(createInput())

    expect(battleSituation.angle).toEqual({ label: "Industrialisation gouvernée", source: "account" })
    // `context.angle` n'a aucun producteur ni aucun lecteur (Lot 0 §R-B) :
    // s'en servir ferait disparaître l'angle silencieusement.
    expect(brief.context.angle).toBeUndefined()
    // La situation ne doit pas non plus être repliée dans mustInclude.
    expect(brief.context.mustInclude).toBeUndefined()
    expect(brief.context.mustExclude).toBeUndefined()
  })

  it("ne duplique aucun champ déjà canonique dans battleSituation", () => {
    const { battleSituation } = buildOk(createInput())
    const keys = Object.keys(battleSituation)

    expect(keys).not.toContain("companyId")
    expect(keys).not.toContain("contactId")
    expect(keys).not.toContain("offerRef")
    expect(keys).not.toContain("preferredCollectionIds")
  })

  it("expose la traçabilité : entrée de cartographie et maille segment", () => {
    const { battleSituation } = buildOk(createInput())
    expect(battleSituation.competitiveEntryId).toBe("cme-1")
    expect(battleSituation.segmentId).toBe("seg-1")
  })

  it("relit le bloc Situation depuis le brief", () => {
    const { brief, battleSituation } = buildOk(createInput())
    expect(readBattleSituation(brief)).toEqual(battleSituation)
  })
})

// ─── Provenance et dimensions facultatives ──────────────────────────────────

describe("Lot 3 — provenance et facultatif", () => {
  it("conserve la provenance SECTEUR d'un enjeu sectoriel", () => {
    const { battleSituation } = buildOk(createInput({ draft: createDraft({ issue: SECTOR_ISSUE }) }))
    expect(battleSituation.issue).toEqual({
      id: "pp-1",
      label: "Traçabilité réglementaire des lots",
      source: "sector",
    })
  })

  it("brief valide sans timing, sans objection et sans ROI", () => {
    const { brief, battleSituation } = buildOk(createInput())

    expect(battleSituation.timing).toBeUndefined()
    expect(battleSituation.objection).toBeUndefined()
    expect(battleSituation.roiArgument).toBeUndefined()
    expect(brief.what.scenario).toBe(BATTLE_SITUATION_SCENARIO)
  })

  it("intègre timing, objection et ROI quand ils sont choisis", () => {
    const { battleSituation } = buildOk(
      createInput({
        draft: createDraft({
          timing: {
            key: "sector-regulatory:reg-1",
            id: "reg-1",
            label: "NIS2",
            source: "sector",
            detail: null,
            resolvedLevel: "segment",
          },
          objection: {
            key: "playbook-objection:0:Nous avons déjà un intégrateur",
            label: "Nous avons déjà un intégrateur",
            response: "Nous intervenons en complément",
          },
          roiArgument: { key: "playbook-roi:0:Réduction du délai", argument: "Réduction du délai" },
        }),
      }),
    )

    expect(battleSituation.timing).toEqual({ id: "reg-1", label: "NIS2", source: "sector" })
    expect(battleSituation.objection).toEqual({
      label: "Nous avons déjà un intégrateur",
      response: "Nous intervenons en complément",
    })
    expect(battleSituation.roiArgument).toBe("Réduction du délai")
  })
})

// ─── Situation incomplète ───────────────────────────────────────────────────

describe("Lot 3 — situation incomplète", () => {
  it("refuse de construire un brief sans offre", () => {
    const result = buildBattleSituationBrief(createInput({ draft: createDraft({ offer: null }) }))
    expect(result).toEqual({ ok: false, missing: ["offer"] })
  })

  it("refuse de construire un brief sans enjeu", () => {
    const result = buildBattleSituationBrief(createInput({ draft: createDraft({ issue: null }) }))
    expect(result).toEqual({ ok: false, missing: ["issue"] })
  })

  it("refuse de construire un brief sans interlocuteur ni angle", () => {
    const result = buildBattleSituationBrief(
      createInput({ draft: createDraft({ persona: null, angle: null }) }),
    )
    expect(result).toEqual({ ok: false, missing: ["persona", "angle"] })
  })
})

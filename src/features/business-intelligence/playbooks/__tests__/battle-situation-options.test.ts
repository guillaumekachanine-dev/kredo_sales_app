import { describe, expect, it } from "vitest"
import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"
import {
  buildAngleOptions,
  buildIssueOptions,
  buildObjectionOptions,
  buildOfferOptions,
  buildPersonaOptions,
  buildRoiOptions,
  buildSituationSummary,
  buildTimingOptions,
  createEmptyBattleSituationDraft,
  findUnsatisfiableRequirements,
  pruneDraftAgainstOptions,
  toBattleSituation,
  validateBattleSituationDraft,
  type BattleSituationOptions,
} from "../battle-situation-options"

// ─── Fixtures ───────────────────────────────────────────────────────────────

function createActor(overrides: Partial<CompetitiveMapActor> = {}): CompetitiveMapActor {
  return {
    id: "cme-1",
    companyId: "comp-1",
    name: "Robertet",
    category: "leader",
    categoryLabel: "Leader",
    confidence: "haute",
    businessFootprintScore: 4,
    digitalMaturityScore: 3,
    appetenceScore: 35,
    accessibilityScore: 5,
    appetenceProvisoire: false,
    isPositioned: true,
    isBenchmarkAccount: true,
    revenueEstimateMeur: 843.9,
    revenueExercice: 2025,
    revenuePerimetre: "groupe",
    headcountFrance: "2500+",
    positioning: "Premier acteur intégré du naturel",
    forces: "Intégration amont-aval",
    vulnerability: "Exposition au change",
    angleEntree: "Industrialisation gouvernée de NaturIA",
    lifecycleStatus: "prospect",
    details: {
      propositionValeur: null,
      differenciateurs: [],
      dependances: [],
      chaineValeur: [],
      chantiersTechnologiques: [],
      triggers: ["Publication du CA semestriel"],
      lignesRouges: ["Ne pas proposer un POC IA basique"],
      trous: [],
      metierChaineValeur: null,
      maillon: null,
      contratsMajeurs: [],
      grilles: [],
      coucheEsn: [],
      traductionCommerciale: ["Gouvernance de la donnée de formulation"],
      iaAnnonceVsDeploye: null,
      ...(overrides.details ?? {}),
    },
    ...overrides,
  }
}

const PLAYBOOK = {
  personas: [
    { fonction: "DSI", repond_de: "Continuité et sécurité du SI", ce_qui_le_reveille: "Audit NIS2" },
    { fonction: "Directeur industriel", repond_de: "Rendement des lignes" },
  ],
  objections: [
    { objection: "Nous avons déjà un intégrateur", reponse: "Nous intervenons en complément sur la couche data" },
  ],
  entry_points: [
    { signal: "Programme de modernisation SI", angle: "Cloud souverain", interlocuteur: "DSI" },
  ],
  roi_arguments: [{ argument: "Réduction du temps de qualification des lots" }],
}

const SECTOR_PAIN_POINTS = [
  { id: "pp-1", title: "Traçabilité réglementaire des lots", description: "Exigence IFRA", resolvedLevel: "segment" as const },
  { id: "pp-2", title: "Pénurie de profils data", description: null, resolvedLevel: "macro" as const },
]

const ACCOUNT_ISSUES = [
  {
    id: "ai-1",
    title: "Modernisation du SI de production",
    problemStatement: "ERP de production en fin de support",
    evidenceLevel: "observed",
    provenance: "human_verified",
  },
  {
    id: "ai-2",
    title: "Dette technique sur la couche data",
    problemStatement: null,
    evidenceLevel: "weak",
    provenance: "inferred",
  },
]

function buildOptions(overrides: Partial<BattleSituationOptions> = {}): BattleSituationOptions {
  const actor = createActor()
  const personas = buildPersonaOptions([], PLAYBOOK)
  return {
    personas: personas.options,
    personaFallbackToPlaybook: personas.fallbackToPlaybook,
    issues: buildIssueOptions(ACCOUNT_ISSUES, SECTOR_PAIN_POINTS),
    angles: buildAngleOptions(actor, PLAYBOOK),
    timings: buildTimingOptions(actor, [], []),
    objections: buildObjectionOptions(PLAYBOOK),
    roiArguments: buildRoiOptions(PLAYBOOK),
    offers: buildOfferOptions(
      [
        { id: "off-1", name: "Cloud Assessment", practiceName: "Cloud Engineering", practiceSlug: "cloud-engineering", shortDescription: null },
        { id: "off-2", name: "Audit data", practiceName: "Data & IA", practiceSlug: "data-ai", shortDescription: null },
      ],
      ["data-ai"],
    ),
    ...overrides,
  }
}

// ─── Interlocuteur ──────────────────────────────────────────────────────────

describe("Lot 3 — interlocuteur", () => {
  it("privilégie les contacts CRM réels quand il en existe", () => {
    const { options, fallbackToPlaybook } = buildPersonaOptions(
      [{ id: "ct-1", fullName: "Camille Roux", jobTitle: "DSI", relationshipRole: "decideur" }],
      PLAYBOOK,
    )

    expect(fallbackToPlaybook).toBe(false)
    expect(options).toHaveLength(1)
    expect(options[0]).toMatchObject({ kind: "contact", label: "Camille Roux", contactId: "ct-1", sublabel: "DSI" })
    expect(options[0].personaLabel).toBeUndefined()
  })

  it("bascule sur les personas du playbook quand le compte n'a AUCUN contact CRM", () => {
    // Cas majoritaire mesuré au Lot 0 : 15 comptes sur 23. Ce n'est pas un état
    // d'erreur — c'est le chemin nominal de la moitié du portefeuille.
    const { options, fallbackToPlaybook } = buildPersonaOptions([], PLAYBOOK)

    expect(fallbackToPlaybook).toBe(true)
    expect(options.map((option) => option.label)).toEqual(["DSI", "Directeur industriel"])
    expect(options[0].kind).toBe("playbook")
    expect(options[0].personaLabel).toBe("DSI")
    // Un rôle générique ne doit JAMAIS finir dans un champ de nom réel.
    expect(options[0].contactId).toBeUndefined()
  })

  it("ne propose rien quand il n'y a ni contact ni persona", () => {
    expect(buildPersonaOptions([], {}).options).toEqual([])
  })
})

// ─── Enjeux ─────────────────────────────────────────────────────────────────

describe("Lot 3 — enjeux et provenance", () => {
  it("étiquette COMPTE les enjeux issus d'account_issues et expose leur niveau de preuve", () => {
    const options = buildIssueOptions(ACCOUNT_ISSUES, [])

    expect(options).toHaveLength(2)
    expect(options[0]).toMatchObject({
      id: "ai-1",
      source: "account",
      evidenceLevel: "observed",
      detail: "ERP de production en fin de support",
      resolvedLevel: null,
    })
    expect(options[1].evidenceLevel).toBe("weak")
  })

  it("étiquette SECTEUR les points de douleur sectoriels et garde resolvedLevel à part", () => {
    const options = buildIssueOptions([], SECTOR_PAIN_POINTS)

    expect(options.map((option) => option.source)).toEqual(["sector", "sector"])
    // resolvedLevel (segment/macro) est ORTHOGONAL à source : il ne doit jamais
    // être replié dans la provenance compte/secteur.
    expect(options.map((option) => option.resolvedLevel)).toEqual(["segment", "macro"])
    expect(options.every((option) => option.evidenceLevel === null)).toBe(true)
  })

  it("place les enjeux compte avant les enjeux secteur sans jamais les confondre", () => {
    const options = buildIssueOptions(ACCOUNT_ISSUES, SECTOR_PAIN_POINTS)
    expect(options.map((option) => option.source)).toEqual(["account", "account", "sector", "sector"])
  })

  it("aucune source d'enjeu ⇒ dimension insatisfiable, donc génération bloquée", () => {
    const options = buildOptions({ issues: buildIssueOptions([], []) })

    expect(options.issues).toEqual([])
    expect(findUnsatisfiableRequirements(options)).toContain("issue")
  })
})

// ─── Angle ──────────────────────────────────────────────────────────────────

describe("Lot 3 — angle", () => {
  it("ordonne angle_entree, traduction commerciale (COMPTE) puis entry_points (SECTEUR)", () => {
    const options = buildAngleOptions(createActor(), PLAYBOOK)

    expect(options.map((option) => [option.label, option.source])).toEqual([
      ["Industrialisation gouvernée de NaturIA", "account"],
      ["Gouvernance de la donnée de formulation", "account"],
      ["Cloud souverain", "sector"],
    ])
  })

  it("ne duplique pas un angle_entree répété dans la traduction commerciale", () => {
    const actor = createActor({
      angleEntree: "Cloud souverain",
      details: { ...createActor().details, traductionCommerciale: ["Cloud souverain"] },
    })

    expect(buildAngleOptions(actor, {}).map((option) => option.label)).toEqual(["Cloud souverain"])
  })
})

// ─── Timing, objection, ROI ─────────────────────────────────────────────────

describe("Lot 3 — dimensions facultatives", () => {
  it("compose le timing depuis les triggers compte, le réglementaire et les événements", () => {
    const options = buildTimingOptions(
      createActor(),
      [{ id: "reg-1", name: "NIS2", deadlineDate: "2026-10-17", commercialAngle: "Fenêtre de mise en conformité", resolvedLevel: "segment" }],
      [{ id: "ev-1", title: "Salon SIAL", eventDate: "2026-10-01", commercialOpportunity: null, resolvedLevel: "macro" }],
    )

    expect(options.map((option) => [option.label, option.source])).toEqual([
      ["Publication du CA semestriel", "account"],
      ["NIS2", "sector"],
      ["Salon SIAL", "sector"],
    ])
    expect(options[0].id).toBeUndefined() // un trigger de profile_json n'a pas d'identifiant
    expect(options[1].id).toBe("reg-1")
    expect(options[2].detail).toBe("2026-10-01")
  })

  it("ne fabrique aucune option quand les sources facultatives sont vides", () => {
    expect(buildTimingOptions(createActor({ details: { ...createActor().details, triggers: [] } }), [], [])).toEqual([])
    expect(buildObjectionOptions({})).toEqual([])
    expect(buildRoiOptions({})).toEqual([])
  })

  it("porte la réponse préparée de l'objection, jamais une ligne rouge", () => {
    const actor = createActor()
    const objections = buildObjectionOptions(PLAYBOOK)

    expect(objections[0]).toMatchObject({
      label: "Nous avons déjà un intégrateur",
      response: "Nous intervenons en complément sur la couche data",
    })
    // Les lignes rouges (`a_ne_pas_dire`) ne sont PAS des objections.
    expect(objections.some((option) => actor.details.lignesRouges.includes(option.label))).toBe(false)
  })

  it("garde le ROI en texte, sans jamais produire de chiffre", () => {
    const roiArguments = buildRoiOptions(PLAYBOOK)
    expect(roiArguments).toHaveLength(1)
    expect(roiArguments[0].argument).toBe("Réduction du temps de qualification des lots")
  })
})

// ─── Offres ─────────────────────────────────────────────────────────────────

describe("Lot 3 — offres", () => {
  it("remonte les practices suggérées en tête sans masquer le catalogue", () => {
    const options = buildOptions().offers

    expect(options.map((option) => option.name)).toEqual(["Audit data", "Cloud Assessment"])
    expect(options[0].isSuggested).toBe(true)
    expect(options[1].isSuggested).toBe(false)
  })

  it("catalogue vide ⇒ offre insatisfiable, donc génération bloquée", () => {
    expect(findUnsatisfiableRequirements(buildOptions({ offers: [] }))).toContain("offer")
  })
})

// ─── Validation et cohérence du brouillon ───────────────────────────────────

describe("Lot 3 — validation du brouillon", () => {
  it("exige exactement 4 dimensions : interlocuteur, enjeu, angle, offre", () => {
    const draft = createEmptyBattleSituationDraft()
    expect(validateBattleSituationDraft(draft)).toEqual({
      isComplete: false,
      missing: ["persona", "issue", "angle", "offer"],
    })
  })

  it("est complet sans timing, sans objection, sans ROI et sans Knowledge", () => {
    const options = buildOptions()
    const draft = {
      ...createEmptyBattleSituationDraft(),
      persona: options.personas[0],
      issue: options.issues[0],
      angle: options.angles[0],
      offer: options.offers[0],
    }

    expect(validateBattleSituationDraft(draft)).toEqual({ isComplete: true, missing: [] })
  })

  it("reste incomplet tant que l'offre manque", () => {
    const options = buildOptions()
    const draft = {
      ...createEmptyBattleSituationDraft(),
      persona: options.personas[0],
      issue: options.issues[0],
      angle: options.angles[0],
    }

    expect(validateBattleSituationDraft(draft).missing).toEqual(["offer"])
  })

  it("dérive les clés du contenu quand la source n'a pas d'identifiant", () => {
    // Sans cela, l'angle du compte A (clé positionnelle « actor-angle ») serait
    // considéré comme toujours disponible sur le compte B et partirait dans le
    // brief avec le libellé du compte A. Bug réel, trouvé en test.
    const angleA = buildAngleOptions(createActor({ angleEntree: "Angle A" }), {})[0]
    const angleB = buildAngleOptions(createActor({ angleEntree: "Angle B" }), {})[0]

    expect(angleA.key).not.toBe(angleB.key)
  })

  it("purge les sélections devenues orphelines — changement de compte", () => {
    const options = buildOptions()
    const draft = {
      ...createEmptyBattleSituationDraft(),
      persona: options.personas[0],
      issue: options.issues[0],
      angle: options.angles[0],
      timing: null,
      offer: options.offers[0],
      collectionIds: ["col-1"],
    }

    // Nouveau compte : plus aucun enjeu compte, plus le même angle.
    const nextOptions = buildOptions({
      issues: buildIssueOptions([], SECTOR_PAIN_POINTS),
      angles: buildAngleOptions(createActor({ angleEntree: "Autre angle", details: { ...createActor().details, traductionCommerciale: [] } }), {}),
    })
    const pruned = pruneDraftAgainstOptions(draft, nextOptions)

    expect(pruned.issue).toBeNull()
    expect(pruned.angle).toBeNull()
    // L'offre et les listes personnelles ne dépendent pas du compte.
    expect(pruned.offer).toEqual(options.offers[0])
    expect(pruned.collectionIds).toEqual(["col-1"])
    expect(validateBattleSituationDraft(pruned).isComplete).toBe(false)
  })
})

// ─── Résumé et projection ───────────────────────────────────────────────────

describe("Lot 3 — résumé et projection vers le contrat", () => {
  it("compose une phrase lisible dans l'ordre de décision", () => {
    const options = buildOptions()
    const summary = buildSituationSummary({
      ...createEmptyBattleSituationDraft(),
      persona: options.personas[0],
      issue: options.issues[0],
      angle: options.angles[0],
      timing: buildTimingOptions(createActor(), [], [])[0],
      offer: options.offers[0],
    })

    expect(summary).toBe(
      "DSI · Modernisation du SI de production · Industrialisation gouvernée de NaturIA · Publication du CA semestriel · offre Audit data",
    )
  })

  it("ne projette rien tant que la situation est incomplète", () => {
    expect(
      toBattleSituation(createEmptyBattleSituationDraft(), { competitiveEntryId: "cme-1", segmentId: "seg-1" }),
    ).toBeNull()
  })

  it("projette les identifiants stables, la provenance et le personaLabel du fallback", () => {
    const options = buildOptions()
    const situation = toBattleSituation(
      {
        ...createEmptyBattleSituationDraft(),
        persona: options.personas[0],
        issue: options.issues[2], // enjeu SECTEUR
        angle: options.angles[0],
        objection: options.objections[0],
        roiArgument: options.roiArguments[0],
        offer: options.offers[0],
      },
      { competitiveEntryId: "cme-1", segmentId: "seg-1" },
    )

    expect(situation).toEqual({
      competitiveEntryId: "cme-1",
      segmentId: "seg-1",
      issue: { id: "pp-1", label: "Traçabilité réglementaire des lots", source: "sector" },
      angle: { label: "Industrialisation gouvernée de NaturIA", source: "account" },
      objection: {
        label: "Nous avons déjà un intégrateur",
        response: "Nous intervenons en complément sur la couche data",
      },
      roiArgument: "Réduction du temps de qualification des lots",
      personaLabel: "DSI",
    })
    // L'angle n'a structurellement aucun identifiant : n'en jamais fabriquer un.
    expect(situation?.angle.id).toBeUndefined()
    // Timing absent ⇒ clé absente, pas une clé à `undefined`.
    expect(Object.keys(situation ?? {})).not.toContain("timing")
  })

  it("n'écrit pas personaLabel quand un contact CRM réel est choisi", () => {
    const options = buildOptions({
      personas: buildPersonaOptions([{ id: "ct-1", fullName: "Camille Roux", jobTitle: "DSI", relationshipRole: null }], PLAYBOOK).options,
    })
    const situation = toBattleSituation(
      {
        ...createEmptyBattleSituationDraft(),
        persona: options.personas[0],
        issue: options.issues[0],
        angle: options.angles[0],
        offer: options.offers[0],
      },
      { competitiveEntryId: "cme-1", segmentId: "seg-1" },
    )

    expect(situation?.personaLabel).toBeUndefined()
  })
})

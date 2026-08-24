import { describe, expect, it } from "vitest"
import { assembleMissionPrompt } from "../data/assemble-mission-prompt"
import { findMissionSpec } from "../domain/mission-catalog"
import type { MissionSpec, ResolvedCorpus } from "../domain/mission-contracts"

const SPEC = findMissionSpec("veille-analyse-mensuelle") as MissionSpec

const CORPUS: ResolvedCorpus = {
  items: [
    {
      ref: { kind: "veille_period", table: "veille_digests", id: "digest-1" },
      title: "Semaine du 7 juillet",
      date: "2026-07-07",
      provenance: "veille_digests",
      content: "Synthèse de la période : trois mouvements notables.",
      chars: 51,
    },
    {
      ref: { kind: "veille_period", table: "veille_articles", id: "article-1" },
      title: "Nouvelle directive NIS2",
      date: "2026-07-09",
      provenance: "veille_articles · Les Echos",
      content: "Résumé : entrée en application.",
      chars: 31,
    },
  ],
  stats: { requested: 3, kept: 2, dropped: 1, totalChars: 82 },
  trace: [],
}

describe("assembleMissionPrompt — fonction pure", () => {
  it("rend exactement la même chose à deux appels identiques", () => {
    expect(assembleMissionPrompt(SPEC, CORPUS)).toEqual(assembleMissionPrompt(SPEC, CORPUS))
  })

  it("ne mute ni le preset ni le corpus", () => {
    const specSnapshot = JSON.stringify(SPEC)
    const corpusSnapshot = JSON.stringify(CORPUS)
    assembleMissionPrompt(SPEC, CORPUS)
    expect(JSON.stringify(SPEC)).toBe(specSnapshot)
    expect(JSON.stringify(CORPUS)).toBe(corpusSnapshot)
  })
})

describe("assembleMissionPrompt — prompt système", () => {
  it("porte les contraintes du preset", () => {
    const { systemPrompt } = assembleMissionPrompt(SPEC, CORPUS)
    for (const rule of SPEC.constraints.rules) {
      expect(systemPrompt).toContain(rule)
    }
  })

  it("impose le contrat MissionReportV1 et ses six catégories", () => {
    const { systemPrompt } = assembleMissionPrompt(SPEC, CORPUS)
    expect(systemPrompt).toContain('"schemaVersion": 1')
    for (const key of ["title", "executiveSummary", "findings", "recommendations", "sourceRefs"]) {
      expect(systemPrompt).toContain(`"${key}"`)
    }
    for (const category of [
      "tendance",
      "signal_faible",
      "reglementaire",
      "opportunite",
      "risque",
      "autre",
    ]) {
      expect(systemPrompt).toContain(`\`${category}\``)
    }
    for (const horizon of ["immediate", "30_days", "quarter"]) {
      expect(systemPrompt).toContain(`\`${horizon}\``)
    }
  })

  it("impose un format JSON brut sans balises ni blocs de code Markdown", () => {
    const { systemPrompt } = assembleMissionPrompt(SPEC, CORPUS)
    expect(systemPrompt).toContain("Réponds UNIQUEMENT par l'objet JSON brut.")
    expect(systemPrompt).toContain("Le premier caractère de ta réponse doit être { et le dernier }.")
    expect(systemPrompt).toContain("N'ajoute aucun texte avant ou après.")
    expect(systemPrompt).toContain("N'utilise jamais de bloc Markdown, de balises ```json ou de backticks.")
    expect(systemPrompt).not.toContain("```json\n{")
    expect(systemPrompt).not.toContain("}\n```")
  })

  it("ne contient aucun contenu de corpus — il ne dépend que du preset", () => {
    const { systemPrompt } = assembleMissionPrompt(SPEC, CORPUS)
    expect(systemPrompt).not.toContain("mouvements notables")
    expect(systemPrompt).toBe(assembleMissionPrompt(SPEC, { ...CORPUS, items: [] }).systemPrompt)
  })
})

describe("assembleMissionPrompt — prompt utilisateur", () => {
  it("rend chaque source avec le triplet que le LLM devra citer", () => {
    const { userPrompt } = assembleMissionPrompt(SPEC, CORPUS)
    for (const source of CORPUS.items) {
      expect(userPrompt).toContain(`kind: ${source.ref.kind}`)
      expect(userPrompt).toContain(`table: ${source.ref.table}`)
      expect(userPrompt).toContain(`id: ${source.ref.id}`)
      expect(userPrompt).toContain(source.title)
      expect(userPrompt).toContain(source.provenance)
      expect(userPrompt).toContain(source.content)
    }
  })

  it("annonce la couverture réelle et interdit d'interpréter les écarts", () => {
    const { userPrompt } = assembleMissionPrompt(SPEC, CORPUS)
    expect(userPrompt).toContain("Sources retenues : 2 sur 3 considérées (82 caractères).")
    expect(userPrompt).toContain("1 élément(s) ont été écartés")
    expect(userPrompt).toContain("Ne suppose rien de leur contenu")
  })

  it("tait la ligne d'écart quand rien n'a été écarté", () => {
    const complete: ResolvedCorpus = {
      ...CORPUS,
      stats: { requested: 2, kept: 2, dropped: 0, totalChars: 82 },
    }
    const { userPrompt } = assembleMissionPrompt(SPEC, complete)
    expect(userPrompt).not.toContain("ont été écartés")
  })

  it("dit explicitement qu'aucune source n'a pu être hydratée plutôt que de rendre un bloc vide", () => {
    const empty: ResolvedCorpus = {
      items: [],
      stats: { requested: 0, kept: 0, dropped: 0, totalChars: 0 },
      trace: [],
    }
    const { userPrompt } = assembleMissionPrompt(SPEC, empty)
    expect(userPrompt).toContain("Aucune source n'a pu être hydratée.")
  })

  it("affiche « inconnue » plutôt qu'une date inventée", () => {
    const undated: ResolvedCorpus = {
      ...CORPUS,
      items: [{ ...CORPUS.items[0], date: null }],
    }
    const { userPrompt } = assembleMissionPrompt(SPEC, undated)
    expect(userPrompt).toContain("date: inconnue")
  })
})

const RENTABILITE_SPEC = findMissionSpec("rentabilite-portefeuille") as MissionSpec

const RENTABILITE_CORPUS: ResolvedCorpus = {
  items: [
    {
      ref: { kind: "delivery_period", table: "pnl_monthly", id: "pnl-july-2026" },
      title: "P&L mensuel · juillet 2026",
      date: "2026-07-01",
      provenance: "pnl_monthly",
      content:
        "Mois : juillet 2026\nChiffre d'affaires : 197 430 € (−65 450 € (−24,9 %) vs juin 2026)\nMarge brute : 28,76 % (−19,26 pts vs juin 2026) (56 780 €)",
      chars: 172,
    },
    {
      ref: {
        kind: "delivery_period",
        table: "v_collaborator_activity_summary",
        id: "collab-1:2026-07-01",
      },
      title: "Activité · Alice Martin · juillet 2026",
      date: "2026-07-01",
      provenance: "v_collaborator_activity_summary",
      content:
        "Collaborateur : Alice Martin\nPériode : juillet 2026\nJours facturables : 12\nTaux d'activité : 57,14 %\nMarge réelle (%) : 22,50 %",
      chars: 145,
    },
  ],
  stats: { requested: 2, kept: 2, dropped: 0, totalChars: 317 },
  trace: [],
}

describe("assembleMissionPrompt — preset rentabilite-portefeuille", () => {
  it("assemble le prompt sans lever d'erreur et de manière déterministe", () => {
    expect(RENTABILITE_SPEC).toBeDefined()
    const result1 = assembleMissionPrompt(RENTABILITE_SPEC, RENTABILITE_CORPUS)
    const result2 = assembleMissionPrompt(RENTABILITE_SPEC, RENTABILITE_CORPUS)

    expect(result1).toEqual(result2)
    expect(result1.systemPrompt.trim()).not.toBe("")
    expect(result1.userPrompt.trim()).not.toBe("")
  })

  it("génère un prompt système contenant les 6 catégories de Finding et la règle anti-recalcul", () => {
    const { systemPrompt } = assembleMissionPrompt(RENTABILITE_SPEC, RENTABILITE_CORPUS)

    // Les 6 catégories de Finding doivent apparaître
    for (const category of [
      "tendance",
      "signal_faible",
      "reglementaire",
      "opportunite",
      "risque",
      "autre",
    ]) {
      expect(systemPrompt).toContain(`\`${category}\``)
    }

    // Les 3 horizons
    for (const horizon of ["immediate", "30_days", "quarter"]) {
      expect(systemPrompt).toContain(`\`${horizon}\``)
    }

    // La règle anti-recalcul
    expect(systemPrompt).toContain("Ne recalcule aucun ratio ni aucun écart")
    expect(systemPrompt).toContain("Tous les chiffres et toutes les variations nécessaires sont déjà fournis")
  })

  it("génère un prompt utilisateur structuré avec le label, l'intention, le template et les sources delivery_period", () => {
    const { userPrompt } = assembleMissionPrompt(RENTABILITE_SPEC, RENTABILITE_CORPUS)

    expect(userPrompt).toContain("## Mission — Rentabilité du portefeuille")
    expect(userPrompt).toContain(RENTABILITE_SPEC.intent.preset)
    expect(userPrompt).toContain("Sources retenues : 2 sur 2 considérées (317 caractères).")
    expect(userPrompt).toContain(
      "chaque constat dans findings doit obligatoirement être imputé à une mission, un client ou un consultant nommé",
    )
    for (const source of RENTABILITE_CORPUS.items) {
      expect(userPrompt).toContain(`kind: ${source.ref.kind}`)
      expect(userPrompt).toContain(`table: ${source.ref.table}`)
      expect(userPrompt).toContain(`id: ${source.ref.id}`)
      expect(userPrompt).toContain(source.title)
      expect(userPrompt).toContain(source.provenance)
      expect(userPrompt).toContain(source.content)
    }
  })
})

const ACTIVATION_SPEC = findMissionSpec("activation-portefeuille") as MissionSpec

const ACTIVATION_CORPUS: ResolvedCorpus = {
  items: [
    {
      ref: { kind: "prospection_window", table: "v_active_account_signals", id: "sig-1" },
      title: "Signal · Acme Corp · Levée de fonds",
      date: "2026-08-10",
      provenance: "v_active_account_signals",
      content: "Compte : Acme Corp\nScore urgence : 8",
      chars: 35,
    },
  ],
  stats: { requested: 1, kept: 1, dropped: 0, totalChars: 35 },
  trace: [],
}

describe("assembleMissionPrompt — preset activation-portefeuille", () => {
  it("assemble le prompt sans lever d'erreur et contient les contraintes anti-agrégation", () => {
    expect(ACTIVATION_SPEC).toBeDefined()
    const { systemPrompt, userPrompt } = assembleMissionPrompt(ACTIVATION_SPEC, ACTIVATION_CORPUS)

    expect(systemPrompt).toContain("Ne calcule, ne cumule ni ne moyenne aucun score de signal entre eux")
    expect(userPrompt).toContain("## Mission — Activation du portefeuille")
    expect(userPrompt).toContain(ACTIVATION_SPEC.intent.preset)
    expect(userPrompt).toContain("kind: prospection_window")
  })
})

const STAFFING_SPEC = findMissionSpec("capacite-staffing") as MissionSpec

const STAFFING_CORPUS: ResolvedCorpus = {
  items: [
    {
      ref: { kind: "staffing_horizon", table: "collaborators", id: "collab-1" },
      title: "Staffing · Alice Martin",
      date: "2026-10-15",
      provenance: "collaborators",
      content: "Consultant : Alice Martin\nDate de fin de mission : 2026-10-15",
      chars: 55,
    },
  ],
  stats: { requested: 1, kept: 1, dropped: 0, totalChars: 55 },
  trace: [],
}

describe("assembleMissionPrompt — preset capacite-staffing", () => {
  it("assemble le prompt sans lever d'erreur et contient la règle d'incertitude sur les fins de mission", () => {
    expect(STAFFING_SPEC).toBeDefined()
    const { systemPrompt, userPrompt } = assembleMissionPrompt(STAFFING_SPEC, STAFFING_CORPUS)

    expect(systemPrompt).toContain("ne conclus jamais à une absence de risque de banc")
    expect(userPrompt).toContain("## Mission — Capacité de staffing")
    expect(userPrompt).toContain(STAFFING_SPEC.intent.preset)
    expect(userPrompt).toContain("kind: staffing_horizon")
  })
})

const REVUE_SPEC = findMissionSpec("revue-compte-client") as MissionSpec

const REVUE_CORPUS: ResolvedCorpus = {
  items: [
    {
      ref: { kind: "account_context", table: "companies", id: "comp-1" },
      title: "Société Générale",
      date: "2026-08-01",
      provenance: "companies",
      content: "Raison sociale : Société Générale\nStatut de relation : client_actif",
      chars: 68,
    },
    {
      ref: { kind: "account_delivery", table: "missions", id: "mission-1" },
      title: "Mission · Transformation Cloud",
      date: "2026-01-01",
      provenance: "missions",
      content: "Titre : Transformation Cloud\nStatut : active\nTJM : 850 €\nCJM : 420 €\nMarge brute (%) : 50,59 %",
      chars: 98,
    },
  ],
  stats: { requested: 2, kept: 2, dropped: 0, totalChars: 166 },
  trace: [],
}

describe("assembleMissionPrompt — preset revue-compte-client", () => {
  it("assemble le prompt sans lever d'erreur et contient les règles anti-recalcul et de confidentialité", () => {
    expect(REVUE_SPEC).toBeDefined()
    const { systemPrompt, userPrompt } = assembleMissionPrompt(REVUE_SPEC, REVUE_CORPUS)

    expect(systemPrompt).toContain("Ne recalcule aucun ratio ni écart")
    expect(systemPrompt).toContain("Ne divulgue aucun chiffre de rémunération individuelle")
    expect(userPrompt).toContain("## Mission — Revue de compte client")
    expect(userPrompt).toContain(REVUE_SPEC.intent.preset)
    expect(userPrompt).toContain("kind: account_context")
    expect(userPrompt).toContain("kind: account_delivery")
  })
})

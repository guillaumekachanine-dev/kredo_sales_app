import type { MissionSpec } from "./mission-contracts"

export const MISSION_CATALOG = [
  {
    slug: "veille-analyse-mensuelle",
    version: 1,
    label: "Analyse mensuelle de la veille",
    description:
      "Analyse stratégique mensuelle de la veille Kredo : tendances, signaux faibles, réglementation, opportunités, risques et actions prioritaires.",
    corpus: {
      // La période concrète n'est connue qu'au lancement : le sélecteur veille_period
      // est fourni par le contexte, pas par le catalogue. `requiredAtLaunch` rend cette
      // exigence explicite — sans lui, ce preset décrirait une mission sans corpus.
      base: [],
      requiredAtLaunch: ["veille_period"],
      userAddition: {
        allowed: false,
        kinds: [],
      },
      budget: {
        maxTotalChars: 120_000,
        maxCharsPerItem: 4_000,
        maxItems: 120,
      },
    },
    intent: {
      preset:
        "Analyser la veille de la période pour dégager les évolutions structurantes, les signaux faibles, les changements réglementaires, les opportunités commerciales, les risques et les actions prioritaires pour Kredo.",
      userEditable: false,
    },
    constraints: {
      rules: [
        "Fonder l'analyse exclusivement sur le corpus fourni.",
        "Ne mener aucune recherche externe.",
        "Ne jamais inventer de fait, de chiffre, de source ou de causalité absente du corpus.",
        "Relier toute conclusion factuelle à au moins une source du corpus.",
        "Distinguer explicitement les faits observés des interprétations et recommandations.",
      ],
    },
    promptTemplate: `Tu produis une analyse stratégique mensuelle de veille destinée à un manager commercial d'ESN.

À partir du corpus fourni uniquement :
- synthétise les évolutions majeures dans executiveSummary ;
- classe les constats dans findings avec les catégories tendance, signal_faible, reglementaire, opportunite ou risque ;
- utilise autre uniquement lorsqu'un constat utile n'entre réellement dans aucune des cinq catégories précédentes ;
- formule dans recommendations les actions prioritaires découlant des constats ;
- rattache chaque finding et chaque recommandation à ses preuves via SourceRef ;
- consolide dans sourceRefs les sources effectivement mobilisées.

Ne transforme jamais une absence d'information en conclusion. Si le corpus ne permet pas d'étayer un point, ne l'affirme pas.`,
    model: {
      provider: "anthropic",
      model: "claude-sonnet-5",
      maxOutputTokens: 5_000,
    },
  },
] satisfies MissionSpec[]

/**
 * Seule porte d'entrée du catalogue : le slug reçu du navigateur ne sert qu'à CHERCHER
 * un preset relu et typé, jamais à en composer un. Un slug inconnu rend `undefined`,
 * et l'appelant refuse le lancement (ADR-0020 M-7 — rien n'est configurable côté client).
 */
export function findMissionSpec(slug: string): MissionSpec | undefined {
  return MISSION_CATALOG.find((mission) => mission.slug === slug)
}

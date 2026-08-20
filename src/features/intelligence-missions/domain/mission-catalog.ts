import type { MissionSpec } from "./mission-contracts"

export const MISSION_CATALOG = [
  {
    slug: "veille-analyse-mensuelle",
    version: 3,
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
- synthétise les évolutions majeures dans executiveSummary (maximum 8 phrases) ;
- classe les constats dans findings (maximum 8 constats au total) avec les catégories tendance, signal_faible, reglementaire, opportunite ou risque ;
- chaque statement de constat fait maximum 3 phrases ;
- utilise autre uniquement lorsqu'un constat utile n'entre réellement dans aucune des cinq catégories précédentes ;
- formule dans recommendations les actions prioritaires découlant des constats (maximum 5 recommandations) ;
- chaque rationale de recommandation fait maximum 3 phrases ;
- rattache chaque finding et chaque recommandation à ses preuves via SourceRef ;
- consolide dans sourceRefs les sources effectivement mobilisées, sans jamais répéter plusieurs fois la même source.

Règles de concision et de sélection :
- Le rapport doit rester synthétique. Ne cherche pas à restituer chaque élément du corpus. Sélectionne uniquement les constats et recommandations les plus significatifs.
- Privilégie les constats les plus structurants plutôt que l'exhaustivité.
- Ne transforme jamais une absence d'information en conclusion. Si le corpus ne permet pas d'étayer un point, ne l'affirme pas.`,
    model: {
      provider: "anthropic",
      model: "claude-sonnet-5",
      maxOutputTokens: 8_000,
    },
  },
  {
    slug: "rentabilite-portefeuille",
    version: 1,
    label: "Rentabilité du portefeuille",
    description:
      "Analyse financière et opérationnelle de la rentabilité du portefeuille : marges réelles, dérives par mission, client ou consultant et actions prioritaires.",
    corpus: {
      // Le mois analysé n'est connu qu'au lancement : le sélecteur delivery_period
      // est fourni par le contexte, pas par le catalogue. `requiredAtLaunch` rend cette
      // exigence explicite — sans lui, ce preset décrirait une mission sans corpus.
      base: [],
      requiredAtLaunch: ["delivery_period"],
      userAddition: {
        allowed: false,
        kinds: [],
      },
      budget: {
        maxTotalChars: 120_000,
        maxCharsPerItem: 1_200,
        maxItems: 250,
      },
    },
    intent: {
      preset:
        "À partir de l'activité facturée, des coûts internes et du P&L du mois replacés sur les trois mois précédents, identifier où la rentabilité du centre de profit se fait et se perd, nommer les dérives par mission, client et consultant, et formuler les actions prioritaires.",
      userEditable: false,
    },
    constraints: {
      rules: [
        "Fonder l'analyse exclusivement sur le corpus fourni.",
        "Ne mener aucune recherche externe.",
        "Ne jamais inventer de fait, de chiffre, de source ou de causalité absente du corpus.",
        "Relier toute conclusion factuelle à au moins une source du corpus.",
        "Distinguer explicitement les faits observés des interprétations et recommandations.",
        "Ne recalcule aucun ratio ni aucun écart. Tous les chiffres et toutes les variations nécessaires sont déjà fournis, pré-calculés, dans le corpus. Ne produis aucun chiffre absent du corpus.",
      ],
    },
    promptTemplate: `Tu produis une analyse financière et opérationnelle de la rentabilité du portefeuille destinée à un manager de centre de profit en ESN.

À partir du corpus fourni uniquement :
- synthétise les enseignements majeurs dans executiveSummary (maximum 8 phrases) en tranchant explicitement : indique clairement où la marge se fait et où elle se perd sur la période, au-delà de la simple énumération des chiffres ;
- classe les constats dans findings (maximum 8 constats au total) avec les catégories tendance, signal_faible, reglementaire, opportunite ou risque ;
- chaque statement de constat fait maximum 3 phrases ;
- chaque constat dans findings doit obligatoirement être imputé à une mission, un client ou un consultant nommé ;
- utilise autre uniquement lorsqu'un constat utile n'entre réellement dans aucune des cinq catégories précédentes ;
- formule dans recommendations les actions prioritaires découlant des constats (maximum 5 recommandations) en renseignant systématiquement l'horizon (immediate, 30_days ou quarter) ;
- chaque rationale de recommandation fait maximum 3 phrases ;
- rattache chaque finding et chaque recommandation à ses preuves via SourceRef ;
- consolide dans sourceRefs les sources effectivement mobilisées, sans jamais répéter plusieurs fois la même source.

Règles de concision et de sélection :
- Le rapport doit rester synthétique. Ne cherche pas à restituer chaque élément du corpus. Sélectionne uniquement les constats et recommandations les plus significatifs.
- Privilégie les constats les plus structurants plutôt que l'exhaustivité.
- Ne transforme jamais une absence d'information en conclusion. Si le corpus ne permet pas d'étayer un point, ne l'affirme pas.`,
    model: {
      provider: "anthropic",
      model: "claude-sonnet-5",
      maxOutputTokens: 8_000,
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

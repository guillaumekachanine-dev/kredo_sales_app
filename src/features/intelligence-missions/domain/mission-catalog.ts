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
  {
    slug: "activation-portefeuille",
    version: 1,
    label: "Activation du portefeuille",
    description:
      "Identification et caractérisation des comptes prioritaires à relancer selon les signaux d'achat, la fraîcheur relationnelle et les enjeux cartographiés.",
    corpus: {
      base: [],
      requiredAtLaunch: ["prospection_window"],
      userAddition: {
        allowed: false,
        kinds: [],
      },
      budget: {
        maxTotalChars: 120_000,
        maxCharsPerItem: 2_000,
        maxItems: 150,
      },
    },
    intent: {
      preset:
        "À partir des signaux d'achat détectés sur la période, des comptes qu'ils touchent, de la fraîcheur relationnelle et des enjeux cartographiés, désigner au maximum 8 comptes à activer en priorité commercialement.",
      userEditable: false,
    },
    constraints: {
      rules: [
        "Fonder l'analyse exclusivement sur le corpus fourni.",
        "Ne mener aucune recherche externe.",
        "Ne jamais inventer de fait, de chiffre, de source ou de causalité absente du corpus.",
        "Relier toute conclusion factuelle à au moins une source du corpus.",
        "Distinguer explicitement les faits observés des interprétations et recommandations.",
        "Ne calcule, ne cumule ni ne moyenne aucun score de signal entre eux. Chaque score cité doit être attribué à un signal précis, jamais à un compte pris globalement.",
      ],
    },
    promptTemplate: `Tu produis une analyse d'activation du portefeuille de prospection destinée à un manager commercial en ESN.

À partir du corpus fourni uniquement :
- synthétise les arbitrages prioritaires de prospection dans executiveSummary (maximum 8 phrases) en indiquant clairement sur quels comptes concentrer l'effort ce mois et lesquels laisser de côté ;
- classe les constats dans findings (maximum 8 constats au total, un par compte désigné) avec les catégories opportunite, risque ou signal_faible ;
- chaque statement de constat fait maximum 3 phrases ;
- chaque constat dans findings doit obligatoirement être imputé à un compte nommé et rattaché à au moins un signal, une interaction ou un enjeu identifié ;
- formule dans recommendations les actions d'activation prioritaires (maximum 5 recommandations) avec l'angle d'approche et l'interlocuteur pressenti si le corpus le connaît, en renseignant systématiquement l'horizon (immediate ou 30_days) ;
- chaque rationale de recommandation fait maximum 3 phrases ;
- si un compte présente des signaux forts mais que la classification est incomplète, la relation dormante ou qu'aucun interlocuteur qualifié n'est identifié, tu peux l'écarter explicitement en motivant ta décision plutôt que de l'omettre silencieusement ;
- rattache chaque finding et chaque recommandation à ses preuves via SourceRef ;
- consolide dans sourceRefs les sources effectivement mobilisées, sans jamais répéter plusieurs fois la même source.

Règles de concision et de sélection :
- Le rapport doit désigner au maximum 8 comptes au total. Ne cherche pas à restituer chaque élément du corpus.
- Ne reconstitue aucun score global de compte et n'additionne pas les scores des signaux entre eux.
- Privilégie les opportunités d'activation les plus structurantes et argumentées plutôt que l'exhaustivité.
- Ne transforme jamais une absence d'information en conclusion. Si le corpus ne permet pas d'étayer un point, ne l'affirme pas.`,
    model: {
      provider: "anthropic",
      model: "claude-sonnet-5",
      // 16_000 et non 8_000 (contrairement aux deux presets précédents) : le JSON de
      // cette mission répète un objet SourceRef complet par citation, dans findings,
      // recommendations ET sourceRefs — un run réel a atteint stop_reason: max_tokens
      // à 8_000, produisant un rawOutput tronqué que validateMissionReport rejette
      // (JSON.parse échoue), vu côté n8n comme un 400 sur le nœud Callback. Le nœud
      // "Call LLM" du workflow figé a un timeout de 180s ; à ~105 tokens/s observés,
      // 16_000 tokens restent sous ce plafond avec marge.
      maxOutputTokens: 16_000,
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

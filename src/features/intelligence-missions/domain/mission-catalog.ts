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
  {
    slug: "capacite-staffing",
    version: 1,
    label: "Capacité de staffing",
    description:
      "Anticipation de la capacité de staffing sur les 3 mois à venir : consultants qui se libèrent, absences, compétences disponibles et besoins ouverts à rapprocher.",
    corpus: {
      base: [],
      requiredAtLaunch: ["staffing_horizon"],
      userAddition: {
        allowed: false,
        kinds: [],
      },
      budget: {
        maxTotalChars: 120_000,
        maxCharsPerItem: 1_500,
        maxItems: 200,
      },
    },
    intent: {
      preset:
        "À partir des consultants actifs, de leurs missions en cours, de leurs absences, de leur activité YTD, de leurs compétences significatives et des besoins ouverts, anticiper la capacité de staffing sur les 3 mois à venir et rapprocher les consultants qui se libèrent des besoins compatibles.",
      userEditable: false,
    },
    constraints: {
      rules: [
        "Fonder l'analyse exclusivement sur le corpus fourni.",
        "Ne mener aucune recherche externe.",
        "Ne jamais inventer de fait, de chiffre, de source ou de causalité absente du corpus.",
        "Relier toute conclusion factuelle à au moins une source du corpus.",
        "Distinguer explicitement les faits observés des interprétations et recommandations.",
        "Ne recalcule aucun taux ni écart : les taux d'activité YTD et les écarts à la cible sont déjà fournis, pré-calculés, dans le corpus.",
        "Quand une mission n'a pas de date de fin connue, dis-le explicitement comme une incertitude — ne conclus jamais à une absence de risque de banc sur cette base.",
      ],
    },
    promptTemplate: `Tu produis une analyse de capacité de staffing destinée à un manager de centre de profit en ESN.

À partir du corpus fourni uniquement :
- synthétise dans executiveSummary (maximum 8 phrases) qui se libère dans les 3 mois à venir et sur quels besoins ouverts ces disponibilités peuvent se positionner ;
- classe les constats dans findings (maximum 8 constats au total) avec les catégories opportunite, risque ou signal_faible ;
- chaque statement de constat fait maximum 3 phrases ;
- chaque constat dans findings doit obligatoirement être imputé à un consultant nommé ;
- si une mission n'a pas de date de fin connue, signale-le explicitement comme une incertitude à traiter, jamais comme une absence de risque ;
- formule dans recommendations les actions de repositionnement prioritaires (maximum 5 recommandations), en citant systématiquement le besoin ouvert correspondant quand il existe dans le corpus, et en renseignant l'horizon (immediate ou 30_days) ;
- chaque rationale de recommandation fait maximum 3 phrases ;
- rattache chaque finding et chaque recommandation à ses preuves via SourceRef ;
- consolide dans sourceRefs les sources effectivement mobilisées, sans jamais répéter plusieurs fois la même source.

Règles de concision et de sélection :
- Le rapport doit rester synthétique. Ne cherche pas à restituer chaque élément du corpus.
- Privilégie les rapprochements consultant-besoin les plus structurants et argumentés plutôt que l'exhaustivité.
- Ne transforme jamais une absence d'information en conclusion. Si le corpus ne permet pas d'étayer un point, ne l'affirme pas.`,
    model: {
      provider: "anthropic",
      model: "claude-sonnet-5",
      maxOutputTokens: 16_000,
    },
  },
  {
    slug: "revue-compte-client",
    version: 1,
    label: "Revue de compte client",
    description:
      "Analyse transversale de la relation et de la delivery d'un compte client : signaux, interlocuteurs, missions, rentabilité, dérives et plan d'action.",
    corpus: {
      base: [],
      requiredAtLaunch: ["account_context", "account_delivery"],
      userAddition: {
        allowed: false,
        kinds: [],
      },
      budget: {
        maxTotalChars: 120_000,
        maxCharsPerItem: 2_000,
        maxItems: 200,
      },
    },
    intent: {
      preset:
        "À partir de l'historique relationnel, des signaux, des contacts, des missions en cours, des CRA et de la rentabilité de la delivery, dresser le bilan complet de la relation client, identifier les risques et dérives, et formuler les actions prioritaires de consolidation et de développement du compte.",
      userEditable: false,
    },
    constraints: {
      rules: [
        "Fonder l'analyse exclusivement sur le corpus fourni.",
        "Ne mener aucune recherche externe.",
        "Ne jamais inventer de fait, de chiffre, de source ou de causalité absente du corpus.",
        "Relier toute conclusion factuelle à au moins une source du corpus.",
        "Distinguer explicitement les faits observés des interprétations et recommandations.",
        "Ne recalcule aucun ratio ni écart. Tous les chiffres nécessaires sont déjà fournis, pré-calculés, dans le corpus.",
        "Ne divulgue aucun chiffre de rémunération individuelle dans le rapport.",
      ],
    },
    promptTemplate: `Tu produis une revue de compte client destinée à un responsable de compte ou manager de centre de profit en ESN.

À partir du corpus fourni uniquement :
- synthétise dans executiveSummary (maximum 8 phrases) le bilan global de la relation client et de l'exécution de la delivery, en tranchant explicitement sur la santé globale du compte, au-delà de la simple énumération des chiffres ;
- classe les constats dans findings (maximum 8 constats au total) avec les catégories opportunite, risque, signal_faible, tendance ou reglementaire ;
- chaque statement de constat fait maximum 3 phrases ;
- au moins un constat dans findings doit obligatoirement croiser la dimension relationnelle (signal, interaction, contact ou enjeu) et la dimension exécution / rentabilité (marge, CRA, alerte ou CA) ;
- utilise autre uniquement lorsqu'un constat utile n'entre réellement dans aucune des cinq catégories précédentes ;
- formule dans recommendations les actions prioritaires de consolidation, redressement ou développement du compte (maximum 5 recommandations), en renseignant systématiquement l'horizon (immediate, 30_days ou quarter) ;
- chaque rationale de recommandation fait maximum 3 phrases ;
- rattache chaque finding et chaque recommandation à ses preuves via SourceRef ;
- consolide dans sourceRefs les sources effectivement mobilisées, sans jamais répéter plusieurs fois la même source.

Règles de concision et de sélection :
- Le rapport doit rester synthétique et centré sur le compte analysé. Ne cherche pas à restituer chaque élément du corpus.
- Privilégie les constats et actions les plus structurants plutôt que l'exhaustivité.
- Ne transforme jamais une absence d'information en conclusion. Si le corpus ne permet pas d'étayer un point, ne l'affirme pas.
- Aucun chiffre de rémunération individuelle ne doit apparaître dans le rapport.`,
    model: {
      provider: "anthropic",
      model: "claude-sonnet-5",
      maxOutputTokens: 16_000,
    },
  },
  {
    slug: "post-mortem-commercial",
    version: 1,
    label: "Post-mortem commercial",
    description:
      "Analyse trimestrielle du pipe commercial clos : affaires gagnées, perdues et abandonnées, motifs récurrents et leviers d'amélioration.",
    corpus: {
      base: [],
      requiredAtLaunch: ["pipeline_period"],
      userAddition: {
        allowed: false,
        kinds: [],
      },
      budget: {
        maxTotalChars: 120_000,
        maxCharsPerItem: 2_000,
        maxItems: 200,
      },
    },
    intent: {
      preset:
        "À partir des affaires closes sur le trimestre (gagnées, perdues, abandonnées), de leur historique d'interactions, des profils présentés et des compétences requises, analyser les facteurs d'échec et de succès et identifier les motifs récurrents de perte et de gain.",
      userEditable: false,
    },
    constraints: {
      rules: [
        "Fonder l'analyse exclusivement sur le corpus fourni.",
        "Ne mener aucune recherche externe.",
        "Ne jamais inventer de fait, de chiffre, de source ou de causalité absente du corpus.",
        "Relier toute conclusion factuelle à au moins une source du corpus.",
        "Distinguer explicitement les faits observés des interprétations et recommandations.",
        "N'énonce aucune statistique en pourcentage sur l'ensemble des affaires (par exemple 'X % des pertes'). Le volume du corpus ne le permet pas. Formule des constats nominatifs, affaire par affaire.",
      ],
    },
    promptTemplate: `Tu produis une analyse post-mortem commerciale trimestrielle destinée à un responsable commercial ou manager de centre de profit en ESN.

À partir du corpus fourni uniquement :
- synthétise dans executiveSummary (maximum 8 phrases) le bilan des affaires closes du trimestre, leurs volumes et les enseignements majeurs des succès et des échecs, sans jamais employer de pourcentage global sur l'ensemble des affaires ;
- classe les constats dans findings (maximum 8 constats au total) avec les catégories opportunite, risque, signal_faible, tendance ou reglementaire ;
- chaque statement de constat fait maximum 3 phrases ;
- chaque constat dans findings doit obligatoirement désigner une affaire précise et nommée du corpus, jamais une moyenne ou un agrégat ;
- au moins un motif récurrent de perte doit être identifié et distingué explicitement d'un motif de gain ;
- n'énonce aucune statistique en pourcentage sur l'ensemble des affaires à aucun niveau (y compris dans executiveSummary) ;
- formule dans recommendations les actions d'amélioration commerciale et de qualification prioritaires (maximum 5 recommandations), en renseignant systématiquement l'horizon (immediate, 30_days ou quarter) ;
- chaque rationale de recommandation fait maximum 3 phrases ;
- rattache chaque finding et chaque recommandation à ses preuves via SourceRef ;
- consolide dans sourceRefs les sources effectivement mobilisées, sans jamais répéter plusieurs fois la même source.

Règles de concision et de sélection :
- Le rapport doit rester synthétique et centré sur les affaires du trimestre. Ne cherche pas à restituer chaque élément du corpus.
- Privilégie les enseignements commerciaux les plus structurants plutôt que l'exhaustivité.
- Ne transforme jamais une absence d'information en conclusion. Si le corpus ne permet pas d'étayer un point, ne l'affirme pas.`,
    model: {
      provider: "anthropic",
      model: "claude-sonnet-5",
      maxOutputTokens: 16_000,
    },
  },
  {
    slug: "funnel-recrutement",
    version: 1,
    label: "Funnel de recrutement",
    description:
      "Analyse prospective et historique des étapes de recrutement : identification des goulots d'étranglement où les candidats sont perdus et mesure des délais réels entre jalons.",
    corpus: {
      base: [],
      requiredAtLaunch: ["hiring_period"],
      userAddition: {
        allowed: false,
        kinds: [],
      },
      budget: {
        maxTotalChars: 120_000,
        maxCharsPerItem: 2_000,
        maxItems: 200,
      },
    },
    intent: {
      preset:
        "À partir des processus de recrutement de la période, de leurs jalons datés avec délais pré-calculés, des candidats et de leurs présentations client, identifier à quelle étape le funnel perd le plus de candidats et repérer les délais anormaux entre étapes.",
      userEditable: false,
    },
    constraints: {
      rules: [
        "Fonder l'analyse exclusivement sur le corpus fourni.",
        "Ne mener aucune recherche externe.",
        "Ne jamais inventer de fait, de chiffre, de source ou de causalité absente du corpus.",
        "Relier toute conclusion factuelle à au moins une source du corpus.",
        "Distinguer explicitement les faits observés des interprétations et recommandations.",
        "Ne recalcule aucun délai : tous les délais entre jalons consécutifs sont déjà pré-calculés dans le corpus.",
        "Si moins de 5 process de recrutement recoupent la fenêtre analysée, indique-le explicitement et limite les conclusions à ce que le volume permet réellement d'affirmer.",
      ],
    },
    promptTemplate: `Tu produis une analyse du funnel de recrutement et des délais d'embauche destinée à un responsable du recrutement ou manager de centre de profit en ESN.
Produis exclusivement un objet JSON strictement valide (au format MissionReportV1), sans balise Markdown \`\`\`json, sans texte avant ni après.

À partir du corpus fourni uniquement :
- synthétise dans executiveSummary (maximum 8 phrases) le bilan du funnel sur la période, en désignant explicitement l'étape où le funnel perd le plus de candidats et en indiquant la tendance globale sur les délais d'embauche ;
- classe les constats dans findings (maximum 8 constats au total) avec les catégories opportunite, risque, signal_faible, tendance ou reglementaire ;
- chaque statement de constat fait maximum 3 phrases ;
- au moins un constat dans findings doit nommer l'étape de perte principale du funnel ;
- au moins un délai anormal entre jalons doit être cité avec sa source précise (du jalon A au jalon B) et la durée constatée dans le corpus ;
- si le corpus comporte moins de 5 processus de recrutement sur la fenêtre analysée, déclare explicitement ce seuil d'abstention dans executiveSummary et limite tes conclusions à ce volume restreint ;
- formule dans recommendations les actions prioritaires de simplification et d'accélération du recrutement (maximum 5 recommandations), en renseignant systématiquement l'horizon (immediate, 30_days ou quarter) ;
- chaque rationale de recommandation fait maximum 3 phrases ;
- rattache chaque finding et chaque recommandation à ses preuves via SourceRef ;
- consolide dans sourceRefs les sources effectivement mobilisées, sans jamais répéter plusieurs fois la même source.

Règles de concision et de sélection :
- Le rapport doit rester synthétique et centré sur les processus de la période. Ne cherche pas à restituer chaque élément du corpus.
- Privilégie les constats sur les goulots d'étranglement et les délais les plus significatifs plutôt que l'exhaustivité.
- Ne transforme jamais une absence d'information en conclusion. Si le corpus ne permet pas d'étayer un point, ne l'affirme pas.`,
    model: {
      provider: "anthropic",
      model: "claude-sonnet-5",
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

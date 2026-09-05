/**
 * Registre des SUJETS de digest — ADR-0022 §3.1.
 *
 * Module PUR : aucune dépendance Supabase, aucune I/O. Miroir de
 * `mission-catalog.ts` (ADR-0020) : le métier éditorial vit ici, en TypeScript
 * versionné et relisible en revue de code, **jamais dans un nœud n8n**.
 *
 * Un sujet répond à « qu'est-ce que je retiens ? ». Il est orthogonal au corpus,
 * qui répond à « où est-ce que je cherche ? » et vit, lui, dans `source_corpora`.
 *
 * ── LE PRESET `global` EST UNE REPRISE À L'IDENTIQUE ──────────────────────────
 * Ses listes `relevant` / `irrelevant` reproduisent MOT POUR MOT celles du nœud
 * « Build Contexte KREDO » du workflow `veille-hebdomadaire-kredo`, figées avant
 * toute modification. `assembleDigestFraming` réassemble un bloc byte-identique
 * à `blocContexteKredo`, et un test l'asserte. C'est ce qui garantit que le
 * passage au payload v2 ne change PAS le digest hebdomadaire existant.
 * Ne pas retoucher ces deux listes sans mettre à jour l'attendu du test.
 *
 * Les sujets SECTORIELS ne figurent pas ici : ils sont dérivés dynamiquement de
 * `sector_intelligence WHERE level = 'segment'`, donc un nouveau segment devient
 * sélectionnable sans migration ni commit (ADR-0022 §3.1).
 */

/** Clé du sujet « tout-venant », celui du cron hebdomadaire. Jamais renommée. */
export const GLOBAL_DIGEST_TOPIC_KEY = "global" as const

export type DigestPreset = {
  /** Clé stable, écrite telle quelle dans `veille_digests.topic_key`. */
  readonly key: string
  /** Version du cadrage éditorial — à incrémenter dès que `relevant`/`irrelevant` change. */
  readonly version: number
  readonly label: string
  /** Une phrase : ce que le digest cherche à produire. */
  readonly intent: string
  /** Ce qui mérite d'être retenu. */
  readonly relevant: readonly string[]
  /** Ce qui doit être écarté ou noté faible. */
  readonly irrelevant: readonly string[]
  /** Slug du corpus proposé par défaut dans l'UI. Jamais imposé : l'utilisateur peut en choisir un autre. */
  readonly defaultCorpusSlug: string | null
}

export const DIGEST_PRESETS: Readonly<Record<string, DigestPreset>> = {
  [GLOBAL_DIGEST_TOPIC_KEY]: {
    key: GLOBAL_DIGEST_TOPIC_KEY,
    version: 1,
    label: "Veille IA & Marché",
    intent:
      "Donner à un commercial d'ESN des munitions commerciales issues de l'actualité IA et marché de la semaine.",
    // ⚠️ Reprise à l'identique du nœud n8n « Build Contexte KREDO ». Voir l'en-tête.
    relevant: [
      "Un cas d'usage IA concret en entreprise, avec impact business chiffrable.",
      "Une tendance qui va faire réagir un DSI (agents IA, souveraineté, coûts, sécurité).",
      "Une évolution réglementaire qui crée un besoin de service (audit, mise en conformité).",
      "Un signal touchant un des secteurs de {{secteursActifs}} (acteur, tendance, chiffre).",
      "Une annonce d'un grand acteur (OpenAI, Anthropic, Mistral...) que le prospect aura vue.",
    ],
    irrelevant: [
      "La recherche académique pure, les détails techniques sans traduction business.",
      "Le buzz sans substance, les listes d'outils, les annonces produit mineures.",
      "L'actualité \"dirigeant d'ESN\" (fusions, valorisations, politique salariale).",
      "Ce qui ne se transforme en AUCUN angle commercial exploitable.",
    ],
    defaultCorpusSlug: null,
  },

  ia: {
    key: "ia",
    version: 1,
    label: "Intelligence artificielle",
    intent:
      "Suivre l'adoption de l'IA en entreprise : usages réels, coûts, gouvernance et ce qu'un DSI en retient.",
    relevant: [
      "Un déploiement d'IA en production, avec périmètre, coût ou gain mesuré.",
      "Une décision d'architecture ou d'infrastructure IA prise par une entreprise nommée.",
      "Un cadre de gouvernance, de conformité ou de sécurité applicable aux systèmes d'IA.",
      "Un chiffre de marché ou d'adoption réutilisable tel quel devant un décideur.",
      "Un signal touchant un des secteurs de {{secteursActifs}} (acteur, tendance, chiffre).",
    ],
    irrelevant: [
      "Les annonces de modèles sans usage d'entreprise identifiable.",
      "Les benchmarks et les classements de modèles entre eux.",
      "Les levées de fonds et valorisations d'éditeurs, sauf effet direct sur un client.",
      "Les démonstrations et les fils de discussion sans source vérifiable.",
    ],
    defaultCorpusSlug: "folio-ai-tech",
  },

  llm: {
    key: "llm",
    version: 1,
    label: "LLM & modèles",
    intent:
      "Suivre l'état de l'art des modèles de langage sous l'angle de ce qu'il change pour une DSI cliente.",
    relevant: [
      "Une évolution de capacité (raisonnement, contexte, multimodal, agents) et son usage d'entreprise.",
      "Un changement de tarification, de disponibilité ou de conditions d'API.",
      "Une contrainte d'inférence, d'hébergement ou de souveraineté qui pèse sur un déploiement.",
      "Un retour d'expérience documenté sur la mise en production d'un modèle.",
    ],
    irrelevant: [
      "Les comparatifs de scores sans traduction opérationnelle.",
      "Les articles de recherche sans implémentation disponible.",
      "Les rumeurs de modèles non annoncés officiellement.",
      "Les prises de position dans les rivalités entre éditeurs.",
    ],
    defaultCorpusSlug: "folio-ai-tech",
  },
} as const

/**
 * Cadrage d'un sujet SECTORIEL, construit à la volée depuis le segment.
 *
 * Il n'y a volontairement pas d'entrée par segment dans `DIGEST_PRESETS` : les
 * 38 segments changent au rythme de la taxonomie, pas du code. `topicKey` est
 * alors LE SLUG du segment (jamais la valeur littérale « segment » — deux
 * segments entreraient en collision sur la clé d'unicité, ADR-0022 §3.2).
 */
export function buildSectorDigestPreset(segment: {
  slug: string
  name: string
  corpusSlug?: string | null
}): DigestPreset {
  return {
    key: segment.slug,
    version: 1,
    label: segment.name,
    intent: `Suivre l'actualité du segment « ${segment.name} » sous l'angle de ce qu'elle ouvre commercialement pour une ESN.`,
    relevant: [
      `Un mouvement d'un acteur du segment « ${segment.name} » : investissement, réorganisation, site, dirigeant.`,
      "Une contrainte réglementaire ou normative qui crée un besoin de service datable.",
      "Un chantier de modernisation, de digitalisation ou de sécurisation annoncé publiquement.",
      "Une tension de recrutement ou de compétences révélant un besoin d'externalisation.",
      "Un chiffre de marché réutilisable tel quel devant un décideur du secteur.",
    ],
    irrelevant: [
      "L'actualité produit ou marketing sans conséquence sur le système d'information.",
      "Les communiqués institutionnels sans fait nouveau.",
      "L'actualité d'acteurs hors du segment, même voisins.",
      "Ce qui ne se transforme en AUCUN angle commercial exploitable.",
    ],
    defaultCorpusSlug: segment.corpusSlug ?? null,
  }
}

export function findDigestPreset(topicKey: string): DigestPreset | null {
  return Object.prototype.hasOwnProperty.call(DIGEST_PRESETS, topicKey)
    ? DIGEST_PRESETS[topicKey]
    : null
}

export function listDigestPresets(): DigestPreset[] {
  // `global` d'abord, le reste dans l'ordre de déclaration : c'est l'ordre d'affichage.
  return Object.values(DIGEST_PRESETS)
}

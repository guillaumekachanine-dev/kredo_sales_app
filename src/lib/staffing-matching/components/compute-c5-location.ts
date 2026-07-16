import type { MatchingNeed, MatchingProfile, RawMatchComponent } from "../types"

// C5 — Compatibilité géographique / mobilité. Composante volontairement prudente
// et de faible poids : `opportunities.location` est du texte libre et aucune
// donnée de distance (postgis/earthdistance non installés) n'est disponible — on
// ne promet donc jamais un rayon kilométrique. On exploite le télétravail (qui
// neutralise la localisation) et la mobilité déclarée. Confiance basse quand on
// ne peut que constater une localisation sans base de comparaison fiable.
export function computeLocationFit(need: MatchingNeed, profile: MatchingProfile): RawMatchComponent {
  const base = {
    componentKey: "C5_location" as const,
    componentLabel: "Localisation / mobilité",
    evidenceRefs: [{ table: "candidates", id: profile.sourceId }],
  }

  const isFullRemote = isFullRemotePolicy(need.remotePolicy)

  if (isFullRemote) {
    return {
      ...base,
      applicable: true,
      normalizedScore: 100,
      confidence: 80,
      explanation: "Mission en télétravail total — la localisation n'est pas contraignante.",
      positives: ["Télétravail total : localisation non bloquante."],
      negatives: [],
    }
  }

  // Sans localisation de besoin, rien à contraindre.
  if (!need.location) {
    return {
      ...base,
      applicable: false,
      normalizedScore: 0,
      confidence: 0,
      explanation: "Aucune localisation sur le besoin — critère non évalué.",
      positives: [],
      negatives: [],
    }
  }

  const mobility = profile.mobility ? stripLower(profile.mobility) : null

  // Collaborateurs : mobilité non renseignée par la RPC -> non évaluable en présentiel.
  if (!mobility) {
    return {
      ...base,
      applicable: false,
      normalizedScore: 0,
      confidence: 0,
      explanation: `Localisation du besoin (${need.location}) sans mobilité déclarée pour ce profil — critère non évalué.`,
      positives: [],
      negatives: [],
    }
  }

  // Le profil cite-t-il la ville de la mission dans sa zone de mobilité ?
  const locationTokens = stripLower(need.location)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4)
  const citesMissionCity = locationTokens.some((t) => mobility.includes(t))
  if (citesMissionCity) {
    return {
      ...base,
      applicable: true,
      normalizedScore: 90,
      confidence: 70,
      explanation: `Zone de mobilité (« ${profile.mobility} ») couvrant ${need.location}.`,
      positives: [`Basé/mobile sur ${need.location}.`],
      negatives: [],
    }
  }

  const isBroadlyMobile = /national|france|mobile|déplac|deplac|toute|partout/.test(mobility)
  if (isBroadlyMobile) {
    return {
      ...base,
      applicable: true,
      normalizedScore: 85,
      confidence: 60,
      explanation: `Mobilité déclarée large (« ${profile.mobility} ») compatible avec ${need.location}.`,
      positives: [`Mobilité large déclarée (${profile.mobility}).`],
      negatives: [],
    }
  }

  // Localisation connue des deux côtés mais pas de base de comparaison métrique :
  // score neutre, confiance basse (on ne prétend pas savoir).
  return {
    ...base,
    applicable: true,
    normalizedScore: 55,
    confidence: 30,
    explanation: `Localisation besoin ${need.location} vs mobilité « ${profile.mobility} » — compatibilité à confirmer manuellement.`,
    positives: [],
    negatives: ["Mobilité restreinte : compatibilité géographique à vérifier."],
  }
}

function isFullRemotePolicy(policy: string | null): boolean {
  if (!policy) return false
  // stripLower retire les accents : "télétravail" -> "teletravail".
  const s = stripLower(policy)
  return /full remote|100% remote|100 % remote|remote total|teletravail total|full remote|integral|distanciel total/.test(s)
}

function stripLower(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
}

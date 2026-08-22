// ADR-0019 — extrait, depuis `competitive_map_entries.profile_json`, le
// sous-ensemble de la fiche compte 05-comptes (blocs B2-B5) réutilisable dans
// le drawer CRM plein au-delà du drawer minimal `mapped` (cf.
// CompanyIdentityDrawerMappedView, qui pioche déjà quelques clés brutes).
// Lecture pure, aucune écriture : `profile_json` reste la source unique.

type ContratMajeur = {
  objet: string | null
  date: string | null
  montant: string | null
  source: string | null
}

type TriggerEvent = {
  date: string | null
  fait: string | null
  source: string | null
}

type TraductionCommerciale = {
  angle: string | null
  accroches: string[]
  aNePasDire: string | null
}

type MetierChaineValeur = {
  /** Texte avant le premier label reconnu, ou 1ère phrase à défaut de label. */
  intro: string | null
  /** Phrase labellisée "Valeur propre :", null si absente du texte. */
  valeurPropre: string | null
  /** Phrase labellisée "Clients :", null si absente du texte. */
  clients: string | null
}

export type AccountStudySnapshot = {
  metier: MetierChaineValeur | null
  trajectoire: string | null
  avantages: string | null
  vulnerabilitePrincipale: string | null
  contratsMajeurs: ContratMajeur[]
  traductionCommerciale: TraductionCommerciale | null
  triggerEvents: TriggerEvent[]
}

const LABEL_PATTERNS: Record<string, RegExp> = {
  "Fournisseurs amont": /Fournisseurs amont\s*:\s*/i,
  "Valeur propre": /Valeur propre\s*:\s*/i,
  "Clients": /Clients\s*:\s*/i,
}
const LABEL_ORDER = ["Fournisseurs amont", "Valeur propre", "Clients"] as const

function findLabelIndex(text: string, label: (typeof LABEL_ORDER)[number]): { start: number; contentStart: number } | null {
  const match = LABEL_PATTERNS[label].exec(text)
  if (!match) return null
  return { start: match.index, contentStart: match.index + match[0].length }
}

function captureFirstSentence(text: string): string | null {
  const match = text.match(/^[^.!?]+[.!?]/)
  const sentence = (match ? match[0] : text).trim().replace(/[.\s]+$/, "")
  return sentence || null
}

/**
 * Découpage par label explicite (canevas E5 "fournisseurs amont → valeur
 * propre → clients"), jamais par position. La phrase suivant "Clients :"
 * n'est pas fiablement la dernière du paragraphe — une phrase annexe suit
 * parfois, sous des formes non normalisées ("Autres métiers...", "Filiale
 * de..."). On capture donc UNE phrase après le label, jamais "jusqu'à la fin
 * du texte". Un compte sans canevas (rare, ~1/9 dans le corpus vivant)
 * retombe sur la 1ère phrase pour l'intro, et laisse valeurPropre/clients à null.
 */
function extractLabeledSentence(text: string, label: (typeof LABEL_ORDER)[number]): string | null {
  const found = findLabelIndex(text, label)
  if (!found) return null
  return captureFirstSentence(text.slice(found.contentStart))
}

function extractMetierChaineValeur(text: string | null | undefined): MetierChaineValeur | null {
  if (!text || !text.trim()) return null
  const trimmed = text.trim()

  const firstLabelIndex = LABEL_ORDER.reduce<number | null>((earliest, label) => {
    const found = findLabelIndex(trimmed, label)
    if (!found) return earliest
    return earliest === null ? found.start : Math.min(earliest, found.start)
  }, null)

  const intro =
    firstLabelIndex !== null
      ? trimmed.slice(0, firstLabelIndex).trim().replace(/[.\s]+$/, "") || null
      : captureFirstSentence(trimmed)

  return {
    intro,
    valeurPropre: extractLabeledSentence(trimmed, "Valeur propre"),
    clients: extractLabeledSentence(trimmed, "Clients"),
  }
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function extractContratsMajeurs(value: unknown): ContratMajeur[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      objet: toNullableString(item.objet),
      date: toNullableString(item.date),
      montant: toNullableString(item.montant),
      source: toNullableString(item.source),
    }))
    .filter((item) => item.objet !== null)
}

function extractTriggerEvents(value: unknown): TriggerEvent[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      date: toNullableString(item.date),
      fait: toNullableString(item.fait),
      source: toNullableString(item.source),
    }))
    .filter((item) => item.fait !== null)
}

function extractTraductionCommerciale(value: unknown): TraductionCommerciale | null {
  if (!value || typeof value !== "object") return null
  const obj = value as Record<string, unknown>
  const angle = toNullableString(obj.angle)
  const accroches = Array.isArray(obj.accroches)
    ? obj.accroches.filter((a): a is string => typeof a === "string" && a.trim() !== "")
    : []
  const aNePasDire = toNullableString(obj.a_ne_pas_dire)

  if (!angle && accroches.length === 0 && !aNePasDire) return null
  return { angle, accroches, aNePasDire }
}

export function extractAccountStudySnapshot(profileJson: Record<string, unknown> | null | undefined): AccountStudySnapshot {
  const grilles = (profileJson?.grilles && typeof profileJson.grilles === "object" ? profileJson.grilles : {}) as Record<string, unknown>

  return {
    metier: extractMetierChaineValeur(toNullableString(profileJson?.metier_chaine_valeur)),
    trajectoire: toNullableString(grilles.trajectoire),
    avantages: toNullableString(grilles.avantages),
    vulnerabilitePrincipale: toNullableString(grilles.vulnerabilite_principale),
    contratsMajeurs: extractContratsMajeurs(profileJson?.contrats_majeurs),
    traductionCommerciale: extractTraductionCommerciale(profileJson?.traduction_commerciale),
    triggerEvents: extractTriggerEvents(profileJson?.trigger_events),
  }
}

/** Un snapshot est affichable dès qu'au moins un bloc porte du contenu. */
export function hasAccountStudySnapshotContent(snapshot: AccountStudySnapshot): boolean {
  return !!(
    snapshot.metier ||
    snapshot.trajectoire ||
    snapshot.avantages ||
    snapshot.vulnerabilitePrincipale ||
    snapshot.contratsMajeurs.length > 0 ||
    snapshot.traductionCommerciale ||
    snapshot.triggerEvents.length > 0
  )
}

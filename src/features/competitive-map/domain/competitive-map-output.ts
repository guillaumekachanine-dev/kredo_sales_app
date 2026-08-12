/**
 * ADR-0019 Lot 5 — parsing défensif du livrable JSON d'une cartographie
 * concurrentielle (kit `docs/FEATURES/sector_intelligence/cartographie-
 * concurrentielle/01-prompt-generique.md` §7).
 *
 * Module PUR : aucune dépendance Supabase, aucune bibliothèque de validation
 * (le projet n'a ni zod ni équivalent — même doctrine que
 * `account-classification.ts`, des validateurs écrits à la main).
 *
 * Le schéma nominal du kit n'est pas ce que produit le skill en pratique :
 * lu contre `docs/FEATURES/sector_intelligence/livrables_etudes/
 * 2026-08-btp-travaux-publics/export.json` (livrable réel), plusieurs écarts
 * structurels apparaissent et sont absorbés ici plutôt que rejetés :
 *  - `identifiant_national`/`code_activite` (SIREN/NAF) sont quasiment
 *    toujours absents — cohérent avec la règle « le SIREN n'est jamais un
 *    prérequis de résolution » (chantier parallèle Socle Identité France).
 *  - `categorie` porte parfois des tirets (« mid-market ») alors que la
 *    colonne `competitive_map_entries.category` attend des underscores
 *    (« mid_market ») — normalisé ici.
 *  - `date_snapshot` est au format français `JJ/MM/AAAA`, pas ISO.
 *  - `empreinte_metier`/`maturite_numerique` peuvent porter des demi-points
 *    (4.5) alors que les colonnes SQL sont des `smallint` : arrondis ici,
 *    jamais côté SQL (une conversion texte->smallint sur "4.5" échoue).
 *  - Il n'existe pas de correspondance 1:1 vers `positioning`/`forces`/
 *    `vulnerabilite` : seul `positioning` a une source directe raisonnable
 *    (`justification_categorie`). Les deux autres restent vides par défaut,
 *    à compléter dans le bac d'arbitrage (étape 2 du wizard) — ce n'est pas
 *    un oubli, c'est décrit dans le handoff comme un mapping non mécanique.
 */

export const COMPETITIVE_MAP_CATEGORY_VALUES = [
  "leader",
  "challenger",
  "mid_market",
  "outsider_emergent",
  "outsider_niche",
] as const
export type CompetitiveMapCategory = (typeof COMPETITIVE_MAP_CATEGORY_VALUES)[number]

export const COMPETITIVE_MAP_CATEGORY_LABELS: Record<CompetitiveMapCategory, string> = {
  leader: "Leader",
  challenger: "Challenger",
  mid_market: "Mid-market",
  outsider_emergent: "Outsider émergent",
  outsider_niche: "Outsider de niche",
}

export const COMPETITIVE_MAP_CONFIANCE_VALUES = ["haute", "moyenne", "faible"] as const
export type CompetitiveMapConfiance = (typeof COMPETITIVE_MAP_CONFIANCE_VALUES)[number]

export type CompetitiveMapAccountInput = {
  nom: string
  identifiantNational: string | null
  categorie: CompetitiveMapCategory
  justificationCategorie: string | null
  caMeur: number | null
  exercice: number | null
  perimetreCa: string | null
  effectifFrance: number | null
  empreinteMetier: number | null
  maturiteNumerique: number | null
  appetenceScore: number | null
  angleEntree: string | null
  confiance: CompetitiveMapConfiance
}

export type CompetitiveMapOutput = {
  secteur: string
  /** Libellé brut de `meta.segment` — jamais résolu automatiquement en slug (§9 REFERENTIEL, aucune création de segment). L'utilisateur choisit le segment cible dans le référentiel existant. */
  segmentLabel: string
  /** ISO `AAAA-MM-JJ`, converti depuis `JJ/MM/AAAA` si besoin. */
  dateSnapshot: string
  compteEtalon: string | null
  comptes: CompetitiveMapAccountInput[]
}

export type CompetitiveMapParseError = { path: string; message: string }

function normalizeCategory(raw: unknown): CompetitiveMapCategory | null {
  if (typeof raw !== "string") return null
  const normalized = raw.trim().toLowerCase().replace(/-/g, "_")
  return (COMPETITIVE_MAP_CATEGORY_VALUES as readonly string[]).includes(normalized)
    ? (normalized as CompetitiveMapCategory)
    : null
}

function normalizeConfiance(raw: unknown): CompetitiveMapConfiance | null {
  if (typeof raw !== "string") return null
  const normalized = raw.trim().toLowerCase()
  return (COMPETITIVE_MAP_CONFIANCE_VALUES as readonly string[]).includes(normalized)
    ? (normalized as CompetitiveMapConfiance)
    : null
}

function toNullableString(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toNullableNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  return null
}

/** Colonnes `empreinte_metier`/`maturite_numerique` sont des `smallint` en base : les demi-points du livrable (4.5) sont arrondis ici, jamais envoyés tels quels au SQL. */
function toRoundedScale1To5(raw: unknown): number | null {
  const value = toNullableNumber(raw)
  if (value === null) return null
  const rounded = Math.round(value)
  return rounded >= 1 && rounded <= 5 ? rounded : null
}

/**
 * `JJ/MM/AAAA` (format réel du livrable) ou `AAAA-MM-JJ` (ISO, format nominal
 * du kit) -> ISO. `null` si aucun des deux formats ne matche.
 */
export function parseStudySnapshotDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return trimmed

  const frMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (frMatch) {
    const [, day, month, year] = frMatch
    return `${year}-${month}-${day}`
  }

  return null
}

function parseAccount(raw: unknown, index: number): CompetitiveMapAccountInput | CompetitiveMapParseError {
  const path = `comptes[${index}]`
  if (!raw || typeof raw !== "object") {
    return { path, message: "Entrée de compte invalide (attendu un objet)." }
  }
  const data = raw as Record<string, unknown>

  const nom = toNullableString(data.nom)
  if (!nom) return { path: `${path}.nom`, message: "Le nom du compte est obligatoire." }

  const categorie = normalizeCategory(data.categorie)
  if (!categorie) {
    return {
      path: `${path}.categorie`,
      message: `Catégorie « ${String(data.categorie)} » hors domaine (${COMPETITIVE_MAP_CATEGORY_VALUES.join(", ")}).`,
    }
  }

  const confiance = normalizeConfiance(data.confiance)
  if (!confiance) {
    return {
      path: `${path}.confiance`,
      message: `Confiance « ${String(data.confiance)} » hors domaine (${COMPETITIVE_MAP_CONFIANCE_VALUES.join(", ")}).`,
    }
  }

  const appetence = data.appetence && typeof data.appetence === "object"
    ? (data.appetence as Record<string, unknown>)
    : null

  return {
    nom,
    identifiantNational: toNullableString(data.identifiant_national),
    categorie,
    justificationCategorie: toNullableString(data.justification_categorie),
    caMeur: toNullableNumber(data.ca_meur),
    exercice: toNullableNumber(data.exercice),
    perimetreCa: toNullableString(data.perimetre_ca),
    effectifFrance: toNullableNumber(data.effectif_france),
    empreinteMetier: toRoundedScale1To5(data.empreinte_metier),
    maturiteNumerique: toRoundedScale1To5(data.maturite_numerique),
    appetenceScore: appetence ? toNullableNumber(appetence.total) : null,
    angleEntree: toNullableString(data.angle_entree),
    confiance,
  }
}

export function parseCompetitiveMapOutput(
  raw: unknown,
):
  | { data: CompetitiveMapOutput; warnings: string[] }
  | { errors: CompetitiveMapParseError[] } {
  if (!raw || typeof raw !== "object") {
    return { errors: [{ path: "", message: "Le fichier ne contient pas un objet JSON valide." }] }
  }
  const root = raw as Record<string, unknown>

  const meta = root.meta && typeof root.meta === "object" ? (root.meta as Record<string, unknown>) : null
  if (!meta) {
    return { errors: [{ path: "meta", message: "Bloc « meta » manquant." }] }
  }

  const errors: CompetitiveMapParseError[] = []
  const warnings: string[] = []

  const secteur = toNullableString(meta.secteur)
  if (!secteur) errors.push({ path: "meta.secteur", message: "meta.secteur est obligatoire." })

  const segmentLabel = toNullableString(meta.segment)
  if (!segmentLabel) errors.push({ path: "meta.segment", message: "meta.segment est obligatoire." })

  const dateSnapshot = parseStudySnapshotDate(meta.date_snapshot)
  if (!dateSnapshot) {
    errors.push({
      path: "meta.date_snapshot",
      message: "meta.date_snapshot doit être au format JJ/MM/AAAA ou AAAA-MM-JJ.",
    })
  }

  if (!Array.isArray(root.comptes) || root.comptes.length === 0) {
    errors.push({ path: "comptes", message: "Le tableau « comptes » est vide ou absent." })
  }

  if (errors.length > 0) return { errors }

  const comptes: CompetitiveMapAccountInput[] = []
  for (const [index, item] of (root.comptes as unknown[]).entries()) {
    const parsed = parseAccount(item, index)
    if ("message" in parsed) {
      errors.push(parsed)
    } else {
      comptes.push(parsed)
    }
  }

  if (errors.length > 0) return { errors }

  if (Array.isArray(root.ecartes) && root.ecartes.length > 0) {
    warnings.push(
      `${root.ecartes.length} compte(s) écarté(s) par l'étude (« ecartes ») — non importé(s), à traiter manuellement si besoin.`,
    )
  }

  return {
    data: {
      secteur: secteur as string,
      segmentLabel: segmentLabel as string,
      dateSnapshot: dateSnapshot as string,
      compteEtalon: toNullableString(meta.compte_etalon),
      comptes,
    },
    warnings,
  }
}

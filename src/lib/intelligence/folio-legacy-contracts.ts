// ─── FOLIO — contrats legacy en lecture seule ───────────────────────────────
// Lot 0. FOLIO est l'outil qui a précédé KREDO. Ses sorties vivent encore dans
// `companies.metadata` et restent affichables, MAIS :
//
//   1. elles ne portent AUCUNE source (vérifié en base : 0 ligne
//      `intelligence_sources` rattachée à FOLIO, et `analysis_data` ne contient
//      ni URL ni date par élément) ;
//   2. elles datent d'un import unique et ne sont plus rafraîchies ;
//   3. elles ne doivent JAMAIS être converties silencieusement en `Claim`
//      vérifié — un Claim exige des `source_refs`, que FOLIO ne peut pas fournir.
//
// Ce module type et lit le legacy. Il n'expose délibérément aucune fonction de
// conversion vers Claim : c'est la garantie mécanique qu'un artefact V2 ne peut
// pas être « rempli » avec du FOLIO en se faisant passer pour du sourcé.
//
// Phase 1 (« AGENT IA Business Analyst — Phase 1 ») → `metadata.analysis_data`
// Phase 2 (« AGENT IA Business Analyst — Phase 2 ») → `metadata.sector_analysis`

import type { SectorAnalysisData } from "@/features/legacy/folio/types"
import { isPlaceholderText } from "./intelligence-common-contracts"

// La Phase 2 est déjà typée pour l'affichage legacy — on la réutilise telle
// quelle plutôt que d'en dupliquer une variante qui divergerait.
export type FolioSectorAnalysis = SectorAnalysisData

// ─── Phase 1 — analyse d'entreprise ─────────────────────────────────────────
// Forme confirmée sur les 93 comptes porteurs : 5 sections, sous-clés
// identiques partout, `dirigeants` / `concurrents_identifies` /
// `actualites_recentes` en tableaux, tout le reste en chaînes.
// Tous les champs restent optionnels : le contrat décrit un import figé, pas
// une garantie de présence.

export type FolioAccountIdentity = {
  nom_complet?: string
  forme_juridique?: string
  code_naf?: string
  siege_social?: string
  date_creation?: string
  effectif_estime?: string
  ca_estime?: string
  dirigeants?: string[]
}

export type FolioAccountPositioning = {
  activite_principale?: string
  proposition_valeur?: string
  clients_types?: string
  zone_geographique?: string
}

export type FolioAccountSignals = {
  actualites_recentes?: string[]
  tendance_croissance?: string
  recrutements_recents?: string
  indices_maturite_digitale?: string
}

export type FolioAccountSectorContext = {
  secteur?: string
  concurrents_identifies?: string[]
  tendances_sectorielles?: string
}

export type FolioAccountAnalysisData = {
  identite?: FolioAccountIdentity
  positionnement?: FolioAccountPositioning
  signaux?: FolioAccountSignals
  contexte_sectoriel?: FolioAccountSectorContext
  synthese_consultant?: string
}

/**
 * Enveloppe explicite du legacy : un consommateur ne peut pas confondre ces
 * données avec un artefact moteur, le champ `provenance` étant figé.
 */
export type FolioLegacyPayload = {
  provenance: "folio_legacy"
  /** `null` si le compte n'a jamais été analysé par FOLIO. */
  accountAnalysis: FolioAccountAnalysisData | null
  /** `null` si aucune étude sectorielle FOLIO n'est attachée au compte. */
  sectorAnalysis: FolioSectorAnalysis | null
}

// ─── Parsers ────────────────────────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

/**
 * Chaîne exploitable, ou `undefined`. Écarte les marqueurs d'absence
 * (« Non trouvé ») pour qu'ils ne remontent jamais comme contenu métier.
 */
function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined
  if (isPlaceholderText(trimmed)) return undefined
  return trimmed
}

function cleanStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const cleaned = value
    .map((item) => cleanString(item))
    .filter((item): item is string => item !== undefined)
  return cleaned.length > 0 ? cleaned : undefined
}

/** Retire les clés `undefined` pour ne pas exposer de champs vides. */
function compact<T extends Record<string, unknown>>(record: T): T | undefined {
  const entries = Object.entries(record).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return undefined
  return Object.fromEntries(entries) as T
}

/**
 * Lit `companies.metadata.analysis_data`. Retourne `null` si absent ou
 * intégralement vide — un objet dont tous les champs sont « Non trouvé » ne
 * vaut pas mieux qu'une absence, et le signaler comme présent induirait en
 * erreur les futurs Lots (« ce compte a du FOLIO » alors qu'il n'a rien).
 */
export function parseFolioAccountAnalysis(raw: unknown): FolioAccountAnalysisData | null {
  const root = asRecord(raw)
  if (!root) return null

  const identite = asRecord(root.identite)
  const positionnement = asRecord(root.positionnement)
  const signaux = asRecord(root.signaux)
  const contexte = asRecord(root.contexte_sectoriel)

  const parsed: FolioAccountAnalysisData = {
    identite: identite
      ? compact<FolioAccountIdentity>({
          nom_complet: cleanString(identite.nom_complet),
          forme_juridique: cleanString(identite.forme_juridique),
          code_naf: cleanString(identite.code_naf),
          siege_social: cleanString(identite.siege_social),
          date_creation: cleanString(identite.date_creation),
          effectif_estime: cleanString(identite.effectif_estime),
          ca_estime: cleanString(identite.ca_estime),
          dirigeants: cleanStringArray(identite.dirigeants),
        })
      : undefined,
    positionnement: positionnement
      ? compact<FolioAccountPositioning>({
          activite_principale: cleanString(positionnement.activite_principale),
          proposition_valeur: cleanString(positionnement.proposition_valeur),
          clients_types: cleanString(positionnement.clients_types),
          zone_geographique: cleanString(positionnement.zone_geographique),
        })
      : undefined,
    signaux: signaux
      ? compact<FolioAccountSignals>({
          actualites_recentes: cleanStringArray(signaux.actualites_recentes),
          tendance_croissance: cleanString(signaux.tendance_croissance),
          recrutements_recents: cleanString(signaux.recrutements_recents),
          indices_maturite_digitale: cleanString(signaux.indices_maturite_digitale),
        })
      : undefined,
    contexte_sectoriel: contexte
      ? compact<FolioAccountSectorContext>({
          secteur: cleanString(contexte.secteur),
          concurrents_identifies: cleanStringArray(contexte.concurrents_identifies),
          tendances_sectorielles: cleanString(contexte.tendances_sectorielles),
        })
      : undefined,
    synthese_consultant: cleanString(root.synthese_consultant),
  }

  return compact(parsed) ?? null
}

/**
 * Lit `companies.metadata.sector_analysis` (Phase 2). Passthrough typé : la
 * structure est déjà consommée telle quelle par les vues legacy FOLIO, la
 * réécrire ici ferait diverger deux lectures de la même donnée. On se contente
 * d'exiger un minimum de substance.
 */
export function parseFolioSectorAnalysis(raw: unknown): FolioSectorAnalysis | null {
  const root = asRecord(raw)
  if (!root) return null
  const hasContent = Object.values(root).some((value) => {
    if (typeof value === "string") return cleanString(value) !== undefined
    if (Array.isArray(value)) return value.length > 0
    return asRecord(value) !== null
  })
  return hasContent ? (root as FolioSectorAnalysis) : null
}

/** Construit l'enveloppe legacy complète depuis un `companies.metadata` brut. */
export function parseFolioLegacyPayload(metadata: unknown): FolioLegacyPayload {
  const root = asRecord(metadata)
  return {
    provenance: "folio_legacy",
    accountAnalysis: parseFolioAccountAnalysis(root?.analysis_data),
    sectorAnalysis: parseFolioSectorAnalysis(root?.sector_analysis),
  }
}

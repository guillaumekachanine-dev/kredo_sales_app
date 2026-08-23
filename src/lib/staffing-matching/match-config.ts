import type { MatchComponentKey, MatchTier, SkillImportance } from "./types"

// Version du moteur — écrite dans match_scores.model_version, incrémentée à
// chaque changement de pondération/logique (traçabilité, comme SCORE_VERSION d'ADR-0011).
export const MATCH_VERSION = "matching-v1.1"

// Somme = 100. Ordre métier demandé : compétences > séniorité > disponibilité
// > tarif > localisation > practice. La renormalisation sur composantes
// applicables (cf. compute-match.ts) fait que ces poids sont relatifs, pas absolus.
export const BASE_WEIGHTS: Record<MatchComponentKey, number> = {
  C1_skills: 42,
  C2_seniority: 20,
  C3_rate: 10,
  C4_availability: 15,
  C5_location: 8,
  C6_practice: 5,
}

// Une compétence explicitement présente sur le profil ne doit pas valoir 0
// uniquement parce que son niveau n'a pas encore été qualifié. Si le besoin
// impose un minLevel mais que le profil n'a pas de level, on accorde une
// couverture partielle et prudente ; le niveau reste signalé comme à valider.
export const UNKNOWN_SKILL_LEVEL_COVERAGE = 0.6

// Politique d'affichage : le moteur peut calculer/persister tout le pool, mais
// l'UI ne propose que les meilleurs profils réellement actionnables.
export const MATCH_DISPLAY_MIN_SCORE = 60
export const MATCH_DISPLAY_MAX_PROFILES = 5

// Multiplicateur d'importance appliqué au poids d'une compétence requise dans C1.
// `opportunity_skills.importance` est peuplé à 100 %, contrairement au `weight`
// smallint dont l'échelle n'est pas garantie — on s'appuie donc sur l'importance.
export const IMPORTANCE_MULTIPLIER: Record<SkillImportance, number> = {
  indispensable: 3,
  souhaitee: 2,
  bonus: 1,
}

// Seuils de qualification globale (tier). insufficient_data est décidé en amont
// dans l'orchestrateur (couverture de poids applicable trop faible).
export const TIER_THRESHOLDS: { strong: number; moderate: number } = {
  strong: 70,
  moderate: 45,
}

export const MIN_CONFIDENCE_STRONG = 50

// Part minimale du poids total qui doit être "applicable" pour qu'un score soit
// jugé exploitable. En dessous, tier = insufficient_data (ex. seul C5 notable).
export const MIN_APPLICABLE_WEIGHT_RATIO = 0.4

// Gate compétences : en staffing, la couverture des compétences est LA porte
// d'entrée. Un profil dont C1 (applicable) tombe sous ce plancher ne peut pas
// être qualifié mieux que "weak", même si séniorité/dispo/TJM compensent — un
// senior disponible sans aucune compétence requise n'est pas un match "moyen".
export const SKILLS_GATE_FLOOR = 25

// ── Normaliseurs texte libre (valeurs réelles relevées en base 2026-07) ──────

// Rang de séniorité 1-5. Mots-clés insensibles casse/accents. Gère les libellés
// parenthésés ("Confirmé (3-5 ans)", "Lead / Expert (10+ ans)").
export function normalizeSeniorityRank(raw: string | null): number | null {
  if (!raw) return null
  const s = stripAccents(raw.toLowerCase())
  if (s.includes("principal") || s.includes("architect")) return 5
  if (s.includes("lead") || s.includes("expert")) return 4
  if (s.includes("senior")) return 3
  if (s.includes("confirm")) return 2
  if (s.includes("junior")) return 1
  return null
}

export const SENIORITY_RANK_LABEL: Record<number, string> = {
  1: "Junior",
  2: "Confirmé",
  3: "Senior",
  4: "Lead / Expert",
  5: "Principal / Architecte",
}

// Famille de practice (heuristique par mots-clés, même esprit que le mapping
// CASE de get_pitch_context). `null` = practice non reconnue -> C6 non applicable.
export type PracticeFamily =
  | "cloud"
  | "data_ai"
  | "cyber"
  | "qa"
  | "agile_delivery"
  | "product"
  | "digital_experience"
  | "mobile"
  | "dbs"
  | "digital_generic"

export function normalizePracticeFamily(raw: string | null): PracticeFamily | null {
  if (!raw) return null
  const s = stripAccents(raw.toLowerCase())
  if (s.includes("cyber") || s.includes("secops") || s.includes("securit")) return "cyber"
  if (s.includes("data") || s.includes("artificial intelligence") || /\bai\b/.test(s) || s.includes("machine learning")) return "data_ai"
  if (s.includes("cloud")) return "cloud"
  if (s.includes("qa") || s.includes("testing") || s.includes("quality")) return "qa"
  if (s.includes("agile") || s.includes("delivery") || s.includes("scrum")) return "agile_delivery"
  if (s.includes("product management") || s.includes("product")) return "product"
  if (s.includes("experience") || s.includes("design") || s.includes("ux") || s.includes("ui")) return "digital_experience"
  if (s.includes("mobile")) return "mobile"
  if (s.includes("business solution") || s.includes("dbs")) return "dbs"
  if (s.includes("digital")) return "digital_generic"
  return null
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "")
}

export function tierFromScore(score: number, confidence: number): MatchTier {
  if (score >= TIER_THRESHOLDS.strong && confidence >= MIN_CONFIDENCE_STRONG) return "strong"
  if (score >= TIER_THRESHOLDS.moderate) return "moderate"
  return "weak"
}

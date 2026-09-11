// ─── Registre de sources E3 1.1 d'une étude compte — module pur ─────────────
//
// Produit un fichier au format exact du registre Master Study
// (`docs/MASTER-STUDY/schemas/source-registry.schema.json`), importable tel quel par le
// wizard « Importer un corpus » (`SourceCorpusImportWizard`). Portée `account` et slug
// propre au compte : l'import ne touche jamais le corpus Master Study du segment.
//
// Une entrée par AUTORITÉ (domaine) — l'unité d'un registre E3 et d'un corpus — portant
// l'extension `documents` : chaque page citée par l'étude y figure, sans exception.
// Le verdict reste `pending` : il se calcule hors du contexte producteur (A10).

import {
  parseSourceRegistryOutput,
  SOURCE_REGISTRY_VERSION,
} from "@/features/source-management/domain/source-registry-output"

import { E3_FAMILIES } from "./study-conversion-plan"
import type { E3SourceQualification } from "./study-conversion-output"
import type { StudyAuthorityCandidate, StudySourceCandidate } from "./study-sources"

/** Une autorité (domaine) qualifiée, avec tous les documents de l'étude qui en viennent. */
export type QualifiedAuthority = StudyAuthorityCandidate & {
  qualification: E3SourceQualification
  qualifiedBy: "model" | "default"
  documents: StudySourceCandidate[]
}

export type StudySourceRegistryInput = {
  company: { id: string; name: string }
  segment: { slug: string; name: string | null } | null
  study: { id: string; title: string; snapshotDate: string }
  authorities: readonly QualifiedAuthority[]
}

export type StudySourceRegistryResult = {
  registry: Record<string, unknown>
  importable: boolean
  errors: string[]
}

export function slugifyCorpusPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

/** Slug du corpus d'un compte — suffixé de l'identifiant pour ne jamais collisionner deux homonymes. */
export function accountCorpusSlug(company: { id: string; name: string }): string {
  const base = slugifyCorpusPart(company.name) || "compte"
  return `sources-compte-${base}-${company.id.slice(0, 8).toLowerCase()}`
}

function utilityScore(detail: E3SourceQualification["utility_score_detail"]): number {
  return Object.values(detail).reduce((sum, value) => sum + value, 0)
}

export function buildStudySourceRegistry(input: StudySourceRegistryInput): StudySourceRegistryResult {
  const { company, segment, study, authorities } = input
  const sources = authorities

  const entries = authorities.map((source) => {
    const q = source.qualification
    // Document de référence de l'autorité : le plus cité. URL nettoyée des paramètres
    // de suivi : le registre dit où chercher, pas qui a cliqué.
    const main = [...source.documents].sort(
      (a, b) => b.cited_in_block_ids.length - a.cited_in_block_ids.length,
    )[0]
    const citations = source.documents.reduce((sum, document) => sum + document.citation_numbers.length, 0)
    return {
      src_id: source.id,
      publisher: q.publisher ?? source.domain,
      domain: source.domain,
      url: main?.normalized_url ?? `https://${source.domain}`,
      tier: q.tier,
      primary_role: q.primary_role,
      // Invariant arithmétique E3 §7 : le score est la somme de ses composantes, calculée ici.
      utility_score: utilityScore(q.utility_score_detail),
      utility_score_detail: q.utility_score_detail,
      automation_fit: q.automation_fit,
      collection_url: null,
      search_domain: source.domain,
      content_temporality: q.content_temporality,
      usage_scopes: q.usage_scopes,
      pack: q.pack,
      atteste: q.atteste ?? `Cité par l'étude « ${study.title} »`,
      familles_couvertes: q.familles_couvertes,
      consulted_at: study.snapshotDate,
      validation_status: "pending",
      conditions_utilisation: null,
      note_ajout: source.qualifiedBy === "default"
        ? "Qualification par défaut : la passe de qualification n'a pas rendu cette source."
        : `${source.documents.length} document(s) cité(s), ${citations} citation(s) dans l'étude.`,
      documents: source.documents.map((document) => ({
        doc_id: document.id,
        url: document.normalized_url,
        titre: document.label,
        citations: document.citation_numbers,
      })),
    }
  })

  const packMinimal = entries.filter((entry) => entry.pack === "minimal").map((entry) => entry.src_id)
  const packEnrichi = entries.filter((entry) => entry.pack === "enrichi").map((entry) => entry.src_id)

  const pickMandatory = (family: "presse_professionnelle" | "federation" | "regulateur"): string | null => {
    const candidates = sources
      .filter((source) => source.qualification.famille_obligatoire === family)
      .sort((a, b) => utilityScore(b.qualification.utility_score_detail) - utilityScore(a.qualification.utility_score_detail))
    return candidates[0]?.id ?? null
  }

  const matrice = E3_FAMILIES.map((famille) => ({
    famille,
    src_ids: sources.filter((source) => source.qualification.familles_couvertes.includes(famille)).map((source) => source.id),
  }))

  const registry: Record<string, unknown> = {
    meta: {
      segment_slug: segment?.slug ?? "",
      secteur: segment?.name ?? undefined,
      geographie: undefined,
      date_snapshot: study.snapshotDate,
      version: SOURCE_REGISTRY_VERSION,
      validation_status: "pending",
      corpus_scope: "account",
      corpus_slug: accountCorpusSlug(company),
      account: { company_id: company.id, name: company.name },
      study: { id: study.id, title: study.title },
    },
    besoins_information: matrice.map((entry) => ({
      famille: entry.famille,
      statut: entry.src_ids.length > 0 ? "couvert" : "non_couvert",
    })),
    familles_sectorielles_obligatoires: {
      presse_professionnelle: pickMandatory("presse_professionnelle"),
      federation: pickMandatory("federation"),
      regulateur: pickMandatory("regulateur"),
    },
    sources: entries,
    pack_minimal: packMinimal,
    pack_enrichi: packEnrichi,
    matrice_couverture: matrice.filter((entry) => entry.src_ids.length > 0),
    gaps: matrice
      .filter((entry) => entry.src_ids.length === 0)
      .map((entry) => ({ famille: entry.famille, motif: "Aucune source de l'étude ne couvre cette famille." })),
    compteurs: {
      sources: entries.length,
      pack_minimal: packMinimal.length,
      pack_enrichi: packEnrichi.length,
      requetes: 0,
    },
    note_normalisation:
      "Registre généré par KREDO depuis une étude ChatGPT Deep Research : toutes les URL citées par l'étude, " +
      "sans exception, dédoublonnées après retrait des paramètres de suivi (utm_*). Qualification E3 par modèle, " +
      "score d'utilité recalculé comme somme de ses composantes. Verdict à établir hors contexte producteur (A10).",
  }

  // JSON.stringify retire les `undefined` : le fichier n'a pas de clé vide.
  const serialized = JSON.parse(JSON.stringify(registry)) as Record<string, unknown>
  const errors: string[] = []
  if (!segment) errors.push("Compte sans segment : le wizard exige un segment pour rattacher le corpus.")
  const parsed = parseSourceRegistryOutput(serialized)
  if (!parsed.ok) errors.push(...parsed.errors.map((error) => `${error.path || "racine"} — ${error.message}`))

  return { registry: serialized, importable: errors.length === 0, errors }
}

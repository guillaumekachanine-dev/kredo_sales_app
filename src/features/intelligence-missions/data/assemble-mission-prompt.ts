/**
 * Assemblage du prompt d'une mission — ADR-0020 §5 et M-1.
 *
 * Fonction PURE : preset + corpus résolu → deux chaînes. Aucune I/O, aucune horloge,
 * aucun aléa — c'est ce qui rend le métier IA testable en Vitest, et c'est le cœur du
 * critère de succès du chantier (« ajouter une intention = une entrée de catalogue, un
 * test, un git push »). Ce module ne touche à aucun client Supabase : pas de
 * `server-only`, il reste importable partout, y compris par une prévisualisation.
 *
 * Le contrat de sortie décrit ici est `MissionReportV1` et rien d'autre (M-7) : le preset
 * ne configure ni `resultType`, ni schéma, ni règles QA.
 */

import type {
  Finding,
  MissionSpec,
  Recommendation,
  ResolvedCorpus,
} from "../domain/mission-contracts"

/**
 * Un `Record` sur l'union, donc exhaustivité vérifiée à la compilation : ajouter une
 * catégorie à `Finding` casse ce fichier plutôt que de produire un prompt muet sur la
 * nouvelle valeur. L'ordre des clés est l'ordre de rendu — stable, donc reproductible.
 */
const FINDING_CATEGORY_LABELS: Record<Finding["category"], string> = {
  tendance: "évolution structurante, installée et étayée",
  signal_faible: "indice précoce, encore peu étayé, mais porteur s'il se confirme",
  reglementaire: "évolution normative, légale ou de conformité",
  opportunite: "ouverture commerciale actionnable pour Kredo",
  risque: "menace, dépendance ou point de vigilance",
  autre: "constat utile n'entrant réellement dans aucune catégorie ci-dessus",
}

const RECOMMENDATION_HORIZON_LABELS: Record<NonNullable<Recommendation["horizon"]>, string> = {
  immediate: "à engager sans délai",
  "30_days": "à engager sous 30 jours",
  quarter: "à engager dans le trimestre",
}

function bulletList(entries: string[]): string {
  return entries.map((entry) => `- ${entry}`).join("\n")
}

function renderCategories(): string {
  return bulletList(
    Object.entries(FINDING_CATEGORY_LABELS).map(([key, label]) => `\`${key}\` — ${label}`),
  )
}

function renderHorizons(): string {
  return bulletList(
    Object.entries(RECOMMENDATION_HORIZON_LABELS).map(([key, label]) => `\`${key}\` — ${label}`),
  )
}

export function buildMissionSystemPrompt(spec: MissionSpec): string {
  return [
    "Tu es un analyste d'intelligence commerciale au service d'un manager de centre de profit en ESN.",
    "",
    "## Contraintes",
    bulletList(spec.constraints.rules),
    "",
    "## Sources et citations",
    bulletList([
      "Chaque source du corpus porte un triplet d'identification `kind`, `table`, `id`.",
      "Toute citation reprend ce triplet À L'IDENTIQUE, sans le reformuler ni l'inventer.",
      "Ne cite jamais une source absente du corpus, même si tu la connais par ailleurs.",
      "Un constat sans source du corpus n'a pas sa place dans `findings`.",
    ]),
    "",
    "## Format de sortie",
    "Réponds UNIQUEMENT par un objet JSON valide, sans texte avant ni après, sans bloc de code.",
    "",
    "```json",
    "{",
    '  "schemaVersion": 1,',
    '  "title": "titre court de l\'analyse",',
    '  "executiveSummary": "synthèse en quelques phrases",',
    '  "findings": [',
    '    { "category": "tendance", "statement": "le constat",',
    '      "evidence": [ { "ref": { "kind": "…", "table": "…", "id": "…" }, "title": "…", "provenance": "…" } ] }',
    "  ],",
    '  "recommendations": [',
    '    { "action": "l\'action", "rationale": "pourquoi", "horizon": "immediate",',
    '      "evidence": [ { "ref": { "kind": "…", "table": "…", "id": "…" }, "title": "…", "provenance": "…" } ] }',
    "  ],",
    '  "sourceRefs": [ { "ref": { "kind": "…", "table": "…", "id": "…" }, "title": "…", "provenance": "…" } ]',
    "}",
    "```",
    "",
    "`findings[].category` prend exactement l'une de ces valeurs :",
    renderCategories(),
    "",
    "`recommendations[].horizon` est facultatif ; s'il est présent, il vaut exactement :",
    renderHorizons(),
    "",
    "`sourceRefs` consolide, sans doublon, les sources effectivement mobilisées dans `findings` et `recommendations`.",
  ].join("\n")
}

function renderSource(item: ResolvedCorpus["items"][number], index: number): string {
  return [
    `### Source ${index + 1}`,
    `kind: ${item.ref.kind}`,
    `table: ${item.ref.table}`,
    `id: ${item.ref.id}`,
    `titre: ${item.title}`,
    `date: ${item.date ?? "inconnue"}`,
    `provenance: ${item.provenance}`,
    "",
    item.content,
  ].join("\n")
}

export function buildMissionUserPrompt(spec: MissionSpec, corpus: ResolvedCorpus): string {
  const { stats } = corpus

  const coverage = [
    `Sources retenues : ${stats.kept} sur ${stats.requested} considérées (${stats.totalChars} caractères).`,
  ]
  if (stats.dropped > 0) {
    coverage.push(
      `${stats.dropped} élément(s) ont été écartés (budget de corpus, archivage ou indisponibilité).`,
      "Ne suppose rien de leur contenu et ne signale pas leur absence comme un fait d'analyse.",
    )
  }

  const body =
    corpus.items.length > 0
      ? corpus.items.map(renderSource).join("\n\n")
      : "Aucune source n'a pu être hydratée."

  return [
    `## Mission — ${spec.label}`,
    spec.intent.preset,
    "",
    "## Couverture du corpus",
    bulletList(coverage),
    "",
    "## Consigne",
    spec.promptTemplate,
    "",
    "## Corpus",
    body,
  ].join("\n")
}

export function assembleMissionPrompt(
  spec: MissionSpec,
  corpus: ResolvedCorpus,
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: buildMissionSystemPrompt(spec),
    userPrompt: buildMissionUserPrompt(spec, corpus),
  }
}

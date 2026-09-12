// ─── Plan de conversion d'une étude — passes et prompts, module pur ─────────
//
// La conversion est découpée en passes indépendantes, exécutées en parallèle par
// `mission-001-run` (un appel au modèle par passe, 180 s maximum chacun) :
//   - passes « blocks »  : classer chaque bloc d'un lot + extraire les affirmations ;
//   - passes « sources » : qualifier chaque source au format Master Study E3.
//
// Le modèle ne reçoit JAMAIS la consigne de réécrire le texte : le texte restitué est
// celui des blocs, verbatim. Il classe, il extrait, il qualifie.

import { CITATION_MARKER } from "./pdf-reconstruction"
import {
  STUDY_CONVERSION_MODEL,
  STUDY_QUALIFICATIONS,
  STUDY_SECTION_DEFINITIONS,
  STUDY_SECTION_KEYS,
  STUDY_SOURCE_TYPES,
  type StudyConversionPartKind,
} from "./study-contracts"
import type { SegmentedBlock } from "./study-segmentation"
import { normalizeSourceUrl, plainLine, type StudyAuthorityCandidate, type StudySourceCandidate } from "./study-sources"

/** Budget de texte par passe « blocks » — dimensionné pour tenir sous 180 s de génération. */
export const BLOCKS_PART_MAX_CHARS = 5000
export const SOURCES_PART_MAX_AUTHORITIES = 12
export const BLOCKS_PART_MAX_OUTPUT_TOKENS = 9000
export const SOURCES_PART_MAX_OUTPUT_TOKENS = 7000

export const E3_FAMILIES = [
  "identite_juridique",
  "financier_trajectoire",
  "marche_concurrence",
  "contrats_clients",
  "reglementation_normes",
  "technologie_si",
  "emploi_competences",
  "achats_accessibilite",
  "trigger_events",
  "reputation_signaux",
  "ancrage_regional",
] as const

export type StudyConversionContext = {
  companyName: string
  segmentName: string | null
  studyTitle: string
}

export type StudyConversionPartPrompt = {
  key: string
  kind: StudyConversionPartKind
  block_ids: string[]
  source_ids: string[]
  systemPrompt: string
  userPrompt: string
  /** Schéma Anthropic qui contraint la réponse à rester un objet JSON parseable. */
  outputSchema: Record<string, unknown>
  maxOutputTokens: number
  model: string
}

const NULLABLE_STRING = { anyOf: [{ type: "string" }, { type: "null" }] }

// Les schémas limitent la forme syntaxique de la réponse. Les contrôles métier
// (identifiants connus, enums KREDO, bornes…) restent dans study-conversion-output.
const BLOCKS_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["classifications", "statements", "gaps", "entity"],
  properties: {
    classifications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["block_id", "section"],
        properties: { block_id: { type: "string" }, section: { type: "string" } },
      },
    },
    statements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "qualification", "confidence", "block_ids", "source_refs", "entity"],
        properties: {
          text: { type: "string" },
          qualification: { type: "string" },
          confidence: { type: "number" },
          block_ids: { type: "array", items: { type: "string" } },
          source_refs: { type: "array", items: { type: "string" } },
          entity: {
            anyOf: [
              {
                type: "object",
                additionalProperties: false,
                required: ["kind", "name"],
                properties: { kind: { type: "string" }, name: { type: "string" } },
              },
              { type: "null" },
            ],
          },
        },
      },
    },
    gaps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["section", "reason"],
        properties: { section: { type: "string" }, reason: { type: "string" } },
      },
    },
    entity: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["legal_name", "siren", "naf_code", "headquarters"],
          properties: {
            legal_name: NULLABLE_STRING,
            siren: NULLABLE_STRING,
            naf_code: NULLABLE_STRING,
            headquarters: NULLABLE_STRING,
          },
        },
        { type: "null" },
      ],
    },
  },
}

const SOURCES_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["sources"],
  properties: {
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id", "label", "publisher", "source_type", "tier", "primary_role",
          "utility_score_detail", "automation_fit", "content_temporality", "usage_scopes",
          "pack", "familles_couvertes", "famille_obligatoire", "atteste",
        ],
        properties: {
          id: { type: "string" },
          label: NULLABLE_STRING,
          publisher: NULLABLE_STRING,
          source_type: { type: "string" },
          tier: { type: "number" },
          primary_role: { type: "string" },
          utility_score_detail: {
            type: "object",
            additionalProperties: false,
            required: [
              "pertinence_sectorielle", "couverture_besoins", "valeur_commerciale",
              "fraicheur", "autorite_editoriale", "automation_access",
            ],
            properties: {
              pertinence_sectorielle: { type: "number" },
              couverture_besoins: { type: "number" },
              valeur_commerciale: { type: "number" },
              fraicheur: { type: "number" },
              autorite_editoriale: { type: "number" },
              automation_access: { type: "number" },
            },
          },
          automation_fit: { type: "string" },
          content_temporality: { type: "string" },
          usage_scopes: { type: "array", items: { type: "string" } },
          pack: { type: "string" },
          familles_couvertes: { type: "array", items: { type: "string" } },
          famille_obligatoire: NULLABLE_STRING,
          atteste: NULLABLE_STRING,
        },
      },
    },
  },
}

const MARKDOWN_LINK = /\[((?:\\.|[^\]\\])*)\]\((https?:\/\/[^)\s]+)\)/g

/**
 * Texte d'un bloc tel que le voit le modèle : les liens deviennent des identifiants
 * de document `[DOC-001]`, lisibles et sans ambiguïté. Le texte stocké, lui, garde ses URL.
 */
export function blockTextForPrompt(text: string, idByNormalizedUrl: Map<string, string>): string {
  return text.replace(MARKDOWN_LINK, (_whole, linkText: string, url: string) => {
    const id = idByNormalizedUrl.get(normalizeSourceUrl(url))
    const label = linkText.replace(/\\(.)/g, "$1")
    const isPill = label === CITATION_MARKER || /^\d{1,3}$/.test(label)
    if (!id) return isPill ? "" : label
    return isPill ? `[${id}]` : `${label} [${id}]`
  })
}

function chunkBlocks(blocks: readonly SegmentedBlock[], rendered: Map<string, string>): SegmentedBlock[][] {
  const chunks: SegmentedBlock[][] = []
  let current: SegmentedBlock[] = []
  let size = 0
  for (const block of blocks) {
    const length = (rendered.get(block.id) ?? block.text).length
    if (current.length > 0 && size + length > BLOCKS_PART_MAX_CHARS) {
      chunks.push(current)
      current = []
      size = 0
    }
    current.push(block)
    size += length
  }
  if (current.length) chunks.push(current)
  return chunks
}

const BLOCKS_SYSTEM_PROMPT = `Tu structures une étude de recherche sur une entreprise, produite par un moteur de recherche approfondie. Tu travailles pour une ESN française qui prépare sa relation commerciale avec cette entreprise.

Tu reçois un LOT de blocs de l'étude, numérotés (B0001…). Le texte des blocs est conservé tel quel par ailleurs : tu ne le réécris pas, tu ne le résumes pas.

TÂCHE 1 — CLASSEMENT. Chaque bloc du lot reçoit exactement UNE section parmi :
${STUDY_SECTION_KEYS.map((key) => `- ${key} : ${STUDY_SECTION_DEFINITIONS[key]}`).join("\n")}
Un bloc de titre va dans la section du contenu qu'il annonce. Aucun bloc du lot ne doit être oublié.

TÂCHE 2 — AFFIRMATIONS. Extrais TOUTES les informations distinctes des blocs, une affirmation par information : chaque chiffre, date, nom, relation, fait, constat, analyse, risque ou recommandation. L'exhaustivité prime sur la concision : une information absente de tes affirmations est perdue pour l'utilisateur.
- Le texte d'une affirmation reprend fidèlement l'étude : aucun chiffre, aucune date, aucun nom modifié ; rien d'ajouté. Une phrase autonome, compréhensible hors contexte.
- block_ids : le ou les blocs d'où vient l'affirmation (au moins un, pris dans le lot).
- source_refs : les identifiants [DOC-xxx] que l'étude cite À L'APPUI de cette information, et eux seuls. Aucune source inventée ; liste vide si l'étude n'en cite pas.
- qualification :
  - established : fait vérifiable attesté par une source citée (registre, texte officiel, chiffre publié, document) ;
  - declared : ce que l'entreprise dit d'elle-même (site, communication, positionnement revendiqué) ;
  - inferred : déduction, comparaison ou analyse présentée par l'étude ;
  - hypothesis : piste, supposition, point non vérifié ou recommandation à explorer présentés comme tels.
- confidence : entre 0 et 1, la solidité que l'étude elle-même accorde à l'information.
- entity : { "kind", "name" } si l'affirmation porte principalement sur une entité nommée autre que l'entreprise étudiée (concurrent, organisme, personne), sinon null.
N'extrais aucune affirmation d'un sommaire, d'une légende d'image ou d'une liste de sources.

TÂCHE 3 — LACUNES. Chaque information que l'étude déclare introuvable, non vérifiable ou à obtenir devient une lacune { "section", "reason" }, formulée fidèlement.

TÂCHE 4 — IDENTITÉ. Si le lot contient l'identité légale de l'entreprise étudiée : raison sociale, SIREN (9 chiffres), code NAF/APE, siège. Sinon null pour chaque champ.

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour ni balise de code :
{"classifications":[{"block_id":"B0001","section":"synthesis"}],"statements":[{"text":"…","qualification":"established","confidence":0.9,"block_ids":["B0001"],"source_refs":["DOC-001"],"entity":null}],"gaps":[{"section":"identity","reason":"…"}],"entity":{"legal_name":null,"siren":null,"naf_code":null,"headquarters":null}}
Qualifications autorisées : ${STUDY_QUALIFICATIONS.join(", ")}.`

const SOURCES_SYSTEM_PROMPT = `Tu qualifies les sources citées par une étude de recherche sur une entreprise, au format du registre de sources KREDO (standard Master Study E3 1.1). Une source, au sens de ce registre, est une AUTORITÉ : un domaine éditeur, avec les documents de l'étude qui en proviennent. Tu ne décides pas si une source existe : elles existent toutes, tu les qualifies toutes.

Pour CHAQUE source reçue (identifiant SRC-xxx), à partir de ses documents et des passages qui les citent, rends :
- label : nom lisible de la source (l'éditeur ou le site) ; publisher : l'éditeur réel, cohérent avec le domaine (jamais un éditeur plus prestigieux que le domaine) ;
- source_type : ${STUDY_SOURCE_TYPES.join(" | ")} (company_official = site ou document de l'entreprise étudiée ou d'un concurrent sur lui-même) ;
- tier : 1 (source primaire officielle : registre, régulateur, texte de loi, statistique publique) · 2 (fédération, organisme professionnel, presse de référence) · 3 (presse, site d'entreprise, étude secondaire) · 4 (agrégateur, avis, annuaire). Une source secondaire qui cite une source primaire reste secondaire ;
- primary_role : proof | corroboration | discovery | watch ;
- utility_score_detail : entiers — pertinence_sectorielle (0-20), couverture_besoins (0-20), valeur_commerciale (0-15), fraicheur (0-15), autorite_editoriale (0-20), automation_access (0-10) ;
- automation_fit : high | medium | low | manual_only ;
- content_temporality : static (page fixe) | periodic (mise à jour périodique) | continuous (flux d'actualité) ;
- usage_scopes : sous-ensemble de ["study","account_watch","news"] — "study" toujours ;
- pack : minimal (sources fortes, décisives) | enrichi (complément) ;
- familles_couvertes : sous-ensemble de ${JSON.stringify(E3_FAMILIES)} ;
- famille_obligatoire : "presse_professionnelle" | "federation" | "regulateur" | null ;
- atteste : ce que la source atteste dans l'étude, une phrase.

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour ni balise de code :
{"sources":[{"id":"SRC-001","label":"…","publisher":"…","source_type":"regulatory_filing","tier":1,"primary_role":"proof","utility_score_detail":{"pertinence_sectorielle":15,"couverture_besoins":15,"valeur_commerciale":10,"fraicheur":10,"autorite_editoriale":18,"automation_access":6},"automation_fit":"medium","content_temporality":"periodic","usage_scopes":["study"],"pack":"minimal","familles_couvertes":["identite_juridique"],"famille_obligatoire":null,"atteste":"…"}]}`

function contextHeader(context: StudyConversionContext): string {
  return [
    `Entreprise étudiée : ${context.companyName}`,
    context.segmentName ? `Segment KREDO : ${context.segmentName}` : null,
    `Étude : ${context.studyTitle}`,
  ].filter(Boolean).join("\n")
}

/** Extraits de contexte d'un document : les phrases qui le citent, deux au plus. */
function documentContexts(
  source: StudySourceCandidate,
  blocksById: Map<string, SegmentedBlock>,
): string[] {
  const snippets: string[] = []
  for (const blockId of source.cited_in_block_ids) {
    const block = blocksById.get(blockId)
    if (!block) continue
    for (const line of block.text.split("\n")) {
      if (![...line.matchAll(MARKDOWN_LINK)].some((m) => normalizeSourceUrl(m[2]) === source.normalized_url)) continue
      const plain = plainLine(line)
      if (plain && !/^https?:\/\//.test(plain)) snippets.push(plain.slice(0, 220))
      if (snippets.length >= 2) return snippets
    }
  }
  return snippets
}

export function planStudyConversion(input: {
  context: StudyConversionContext
  blocks: readonly SegmentedBlock[]
  sources: readonly StudySourceCandidate[]
  authorities: readonly StudyAuthorityCandidate[]
  blockSourceRefs: Map<string, string[]>
}): StudyConversionPartPrompt[] {
  const { context, blocks, sources, authorities, blockSourceRefs } = input
  const idByNormalizedUrl = new Map(sources.map((source) => [source.normalized_url, source.id]))
  const sourceById = new Map(sources.map((source) => [source.id, source]))
  const blocksById = new Map(blocks.map((block) => [block.id, block]))

  const rendered = new Map(blocks.map((block) => [block.id, blockTextForPrompt(block.text, idByNormalizedUrl)]))
  const parts: StudyConversionPartPrompt[] = []

  chunkBlocks(blocks, rendered).forEach((chunk, index) => {
    const refIds = Array.from(new Set(chunk.flatMap((block) => blockSourceRefs.get(block.id) ?? [])))
    const sourceIndex = refIds
      .map((id) => sourceById.get(id))
      .filter((source): source is StudySourceCandidate => Boolean(source))
      .map((source) => `${source.id} — ${source.domain} — ${source.label}`)
    const blockLines = chunk.map((block) => {
      const header = [block.id, block.page ? `page ${block.page}` : null, block.heading_path.join(" > ") || null]
        .filter(Boolean)
        .join(" | ")
      return `<<${header}>>\n${rendered.get(block.id) ?? block.text}`
    })
    parts.push({
      key: `blocks-${String(index + 1).padStart(2, "0")}`,
      kind: "blocks",
      block_ids: chunk.map((block) => block.id),
      source_ids: refIds,
      systemPrompt: BLOCKS_SYSTEM_PROMPT,
      userPrompt: [
        contextHeader(context),
        "",
        `Sources citées dans ce lot :\n${sourceIndex.length ? sourceIndex.join("\n") : "(aucune)"}`,
        "",
        `Blocs du lot (${chunk.length}) — chacun doit être classé :`,
        blockLines.join("\n\n"),
      ].join("\n"),
      outputSchema: BLOCKS_OUTPUT_SCHEMA,
      maxOutputTokens: BLOCKS_PART_MAX_OUTPUT_TOKENS,
      model: STUDY_CONVERSION_MODEL,
    })
  })

  for (let start = 0; start < authorities.length; start += SOURCES_PART_MAX_AUTHORITIES) {
    const slice = authorities.slice(start, start + SOURCES_PART_MAX_AUTHORITIES)
    const lines = slice.map((authority) => {
      const documents = authority.document_ids
        .map((id) => sourceById.get(id))
        .filter((source): source is StudySourceCandidate => Boolean(source))
      return [
        `${authority.id} — domaine : ${authority.domain}`,
        ...documents.flatMap((document) => [
          `  document ${document.id} : ${document.label}`,
          `    url : ${document.normalized_url}`,
          ...documentContexts(document, blocksById).map((snippet) => `    cité pour : « ${snippet} »`),
        ]),
      ].join("\n")
    })
    parts.push({
      key: `sources-${String(start / SOURCES_PART_MAX_AUTHORITIES + 1).padStart(2, "0")}`,
      kind: "sources",
      block_ids: [],
      source_ids: slice.map((authority) => authority.id),
      systemPrompt: SOURCES_SYSTEM_PROMPT,
      userPrompt: [contextHeader(context), "", `Sources à qualifier (${slice.length}) — toutes :`, lines.join("\n\n")].join("\n"),
      outputSchema: SOURCES_OUTPUT_SCHEMA,
      maxOutputTokens: SOURCES_PART_MAX_OUTPUT_TOKENS,
      model: STUDY_CONVERSION_MODEL,
    })
  }

  return parts
}

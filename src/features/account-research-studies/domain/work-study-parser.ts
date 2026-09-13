// ─── Parseurs et validation croisée des livrables ChatGPT Work — module pur ───
//
// Parsing défensif pur : aucune dépendance Supabase, aucune bibliothèque externe.
// Les fonctions acceptent `unknown`, ne lèvent jamais d'exception non contrôlée,
// et retournent des résultats discriminés avec le chemin exact des erreurs constatées.

import {
  STUDY_QUALIFICATIONS,
  STUDY_SECTION_KEYS,
  type StudyQualification,
  type StudySectionKey,
} from "./study-contracts"
import type {
  WorkAccountIntelligence,
  WorkBundleValidationIssue,
  WorkBundleValidationResult,
  WorkCorpusMeta,
  WorkDocumentUsed,
  WorkEntityResolution,
  WorkKnowledgeGap,
  WorkSection,
  WorkSourceAuthority,
  WorkSourceCorpus,
  WorkSourceReference,
  WorkStatement,
  WorkStudyParseIssue,
  WorkStudyParseResult,
} from "./work-study-contracts"

const SECTION_SET = new Set<string>(STUDY_SECTION_KEYS)
const QUALIFICATION_SET = new Set<string>(STUDY_QUALIFICATIONS)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  return null
}

function parseRoot(raw: unknown): { root: Record<string, unknown> } | { error: WorkStudyParseIssue } {
  let candidate: unknown = raw
  if (typeof raw === "string") {
    try {
      candidate = JSON.parse(raw)
    } catch (cause) {
      return {
        error: {
          path: "",
          message: `Le texte fourni n'est pas un JSON valide (${cause instanceof Error ? cause.message : "erreur de syntaxe"}).`,
        },
      }
    }
  }
  if (!isRecord(candidate)) {
    return { error: { path: "", message: "Le contenu fourni doit être un objet JSON." } }
  }
  return { root: candidate }
}

function isValidHttpUrl(candidate: string): boolean {
  try {
    const url = new URL(candidate)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

// ─── 1. Parsing Account Intelligence ────────────────────────────────────────

export function parseWorkAccountIntelligence(raw: unknown): WorkStudyParseResult<WorkAccountIntelligence> {
  const rootResult = parseRoot(raw)
  if ("error" in rootResult) return { ok: false, issues: [rootResult.error] }
  const root = rootResult.root

  const issues: WorkStudyParseIssue[] = []

  // schema_version
  const schemaVersion = toNullableNumber(root.schema_version)
  if (schemaVersion === null) {
    issues.push({ path: "schema_version", message: "schema_version numérique requis." })
  }

  // entity_resolution
  if (!isRecord(root.entity_resolution)) {
    issues.push({ path: "entity_resolution", message: "Bloc entity_resolution requis." })
  }
  const er = isRecord(root.entity_resolution) ? root.entity_resolution : {}
  const legalName = toNullableString(er.legal_name)
  if (!legalName) {
    issues.push({ path: "entity_resolution.legal_name", message: "legal_name requis." })
  }
  const entityResolution: WorkEntityResolution = {
    decision: toNullableString(er.decision) ?? "resolved",
    method: toNullableString(er.method) ?? "unknown",
    legal_name: legalName ?? "",
    siren: toNullableString(er.siren),
    naf_code: toNullableString(er.naf_code),
    hq_location: toNullableString(er.hq_location),
    reasons: Array.isArray(er.reasons)
      ? er.reasons.filter((r): r is string => typeof r === "string" && r.trim().length > 0)
      : undefined,
  }

  // sections
  if (!Array.isArray(root.sections) || root.sections.length === 0) {
    issues.push({ path: "sections", message: "Tableau sections requis avec au moins une section." })
  }
  const rawSections = Array.isArray(root.sections) ? root.sections : []
  const parsedSections: WorkSection[] = []

  rawSections.forEach((sectionRaw, sIndex) => {
    const sPath = `sections[${sIndex}]`
    if (!isRecord(sectionRaw)) {
      issues.push({ path: sPath, message: "Section invalide (objet attendu)." })
      return
    }

    const rawKey = toNullableString(sectionRaw.key)
    if (!rawKey || !SECTION_SET.has(rawKey)) {
      issues.push({
        path: `${sPath}.key`,
        message: `Clé de section « ${String(sectionRaw.key)} » inconnue (${STUDY_SECTION_KEYS.join(", ")}).`,
      })
    }
    const key = (rawKey && SECTION_SET.has(rawKey) ? rawKey : "appendix") as StudySectionKey

    const title = toNullableString(sectionRaw.title) ?? key

    // narrative
    if (!Array.isArray(sectionRaw.narrative)) {
      issues.push({ path: `${sPath}.narrative`, message: "narrative doit être un tableau de textes." })
    }
    const narrative: string[] = []
    if (Array.isArray(sectionRaw.narrative)) {
      sectionRaw.narrative.forEach((nItem, nIndex) => {
        if (typeof nItem !== "string" || !nItem.trim()) {
          issues.push({ path: `${sPath}.narrative[${nIndex}]`, message: "Paragraphe de narrative vide ou invalide." })
        } else {
          narrative.push(nItem)
        }
      })
    }

    // statements
    if (!Array.isArray(sectionRaw.statements)) {
      issues.push({ path: `${sPath}.statements`, message: "statements doit être un tableau." })
    }
    const statements: WorkStatement[] = []
    if (Array.isArray(sectionRaw.statements)) {
      sectionRaw.statements.forEach((stmtRaw, stmtIndex) => {
        const stmtPath = `${sPath}.statements[${stmtIndex}]`
        if (!isRecord(stmtRaw)) {
          issues.push({ path: stmtPath, message: "Statement invalide (objet attendu)." })
          return
        }
        const text = toNullableString(stmtRaw.text)
        if (!text) {
          issues.push({ path: `${stmtPath}.text`, message: "Texte de l'affirmation requis." })
        }
        const rawQual = toNullableString(stmtRaw.qualification)
        if (!rawQual || !QUALIFICATION_SET.has(rawQual)) {
          issues.push({
            path: `${stmtPath}.qualification`,
            message: `Qualification « ${String(stmtRaw.qualification)} » inconnue (${STUDY_QUALIFICATIONS.join(", ")}).`,
          })
        }
        const qualification = (rawQual && QUALIFICATION_SET.has(rawQual) ? rawQual : "hypothesis") as StudyQualification

        const confidence = toNullableNumber(stmtRaw.confidence) ?? 0.5
        if (confidence < 0 || confidence > 1) {
          issues.push({ path: `${stmtPath}.confidence`, message: `confidence hors bornes [0, 1] (${confidence}).` })
        }

        const sourceRefs: string[] = []
        if (Array.isArray(stmtRaw.source_refs)) {
          for (const ref of stmtRaw.source_refs) {
            if (typeof ref === "string" && ref.trim()) {
              sourceRefs.push(ref.trim())
            }
          }
        }

        statements.push({
          text: text ?? "",
          qualification,
          confidence,
          source_refs: sourceRefs,
        })
      })
    }

    const sectionSourceRefs: string[] = []
    if (Array.isArray(sectionRaw.source_refs)) {
      for (const ref of sectionRaw.source_refs) {
        if (typeof ref === "string" && ref.trim()) sectionSourceRefs.push(ref.trim())
      }
    }

    parsedSections.push({
      key,
      title,
      narrative,
      statements,
      source_refs: sectionSourceRefs.length ? sectionSourceRefs : undefined,
    })
  })

  // sources
  if (!Array.isArray(root.sources)) {
    issues.push({ path: "sources", message: "Tableau sources requis." })
  }
  const parsedSources: WorkSourceReference[] = []
  const seenSourceIds = new Set<string>()

  if (Array.isArray(root.sources)) {
    root.sources.forEach((sourceRaw, sIndex) => {
      const sPath = `sources[${sIndex}]`
      if (!isRecord(sourceRaw)) {
        issues.push({ path: sPath, message: "Source invalide (objet attendu)." })
        return
      }
      const id = toNullableString(sourceRaw.id)
      if (!id) {
        issues.push({ path: `${sPath}.id`, message: "id de source requis." })
      } else if (seenSourceIds.has(id)) {
        issues.push({ path: `${sPath}.id`, message: `id de source « ${id} » dupliqué.` })
      } else {
        seenSourceIds.add(id)
      }

      const url = toNullableString(sourceRaw.url)
      if (!url) {
        issues.push({ path: `${sPath}.url`, message: "url de source requise." })
      } else if (!isValidHttpUrl(url)) {
        issues.push({ path: `${sPath}.url`, message: `url de source invalide (« ${url} »).` })
      }

      const label = toNullableString(sourceRaw.label) ?? id ?? "Source"
      const sourceType = toNullableString(sourceRaw.source_type) ?? "other"
      const consultedAt = toNullableString(sourceRaw.consulted_at)

      if (id && url) {
        parsedSources.push({
          id,
          label,
          source_type: sourceType,
          url,
          consulted_at: consultedAt,
        })
      }
    })
  }

  // knowledge_gaps
  const parsedGaps: WorkKnowledgeGap[] = []
  if (Array.isArray(root.knowledge_gaps)) {
    root.knowledge_gaps.forEach((gapRaw, gIndex) => {
      const gPath = `knowledge_gaps[${gIndex}]`
      if (!isRecord(gapRaw)) return
      const rawSectionKey = toNullableString(gapRaw.section_key)
      const sectionKey = (rawSectionKey && SECTION_SET.has(rawSectionKey) ? rawSectionKey : "appendix") as StudySectionKey
      const gap = toNullableString(gapRaw.gap)
      if (gap) {
        parsedGaps.push({ section_key: sectionKey, gap })
      } else {
        issues.push({ path: `${gPath}.gap`, message: "Texte de la lacune requis." })
      }
    })
  }

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  // Preservation non destructive des champs annexes
  const extraFields: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(root)) {
    if (!["schema_version", "entity_resolution", "sections", "sources", "knowledge_gaps", "generated_at"].includes(key)) {
      extraFields[key] = val
    }
  }

  return {
    ok: true,
    data: {
      schema_version: schemaVersion ?? 4,
      entity_resolution: entityResolution,
      sections: parsedSections,
      sources: parsedSources,
      knowledge_gaps: parsedGaps,
      generated_at: toNullableString(root.generated_at) ?? undefined,
      extra_fields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
    },
  }
}

// ─── 2. Parsing Source Corpus ───────────────────────────────────────────────

export function parseWorkSourceCorpus(raw: unknown): WorkStudyParseResult<WorkSourceCorpus> {
  const rootResult = parseRoot(raw)
  if ("error" in rootResult) return { ok: false, issues: [rootResult.error] }
  const root = rootResult.root

  const issues: WorkStudyParseIssue[] = []

  const schemaVersion = toNullableNumber(root.schema_version)
  if (schemaVersion === null) {
    issues.push({ path: "schema_version", message: "schema_version numérique requis." })
  }

  if (!isRecord(root.corpus)) {
    issues.push({ path: "corpus", message: "Bloc corpus requis." })
  }
  const c = isRecord(root.corpus) ? root.corpus : {}
  const accountName = toNullableString(c.account_name)
  if (!accountName) {
    issues.push({ path: "corpus.account_name", message: "corpus.account_name requis." })
  }
  const corpusMeta: WorkCorpusMeta = {
    name: toNullableString(c.name) ?? accountName ?? "Corpus",
    account_name: accountName ?? "",
    scope: toNullableString(c.scope) ?? "Global",
    geography: toNullableString(c.geography) ?? "International",
    generated_at: toNullableString(c.generated_at) ?? undefined,
  }

  if (!Array.isArray(root.sources) || root.sources.length === 0) {
    issues.push({ path: "sources", message: "Tableau sources requis avec au moins une autorité/domaine." })
  }

  const rawSources = Array.isArray(root.sources) ? root.sources : []
  const parsedAuthorities: WorkSourceAuthority[] = []
  const seenDomains = new Set<string>()
  const seenDocRefs = new Set<string>()

  rawSources.forEach((authRaw, aIndex) => {
    const aPath = `sources[${aIndex}]`
    if (!isRecord(authRaw)) {
      issues.push({ path: aPath, message: "Autorité de source invalide (objet attendu)." })
      return
    }

    const domain = toNullableString(authRaw.domain)?.toLowerCase().replace(/^www\./, "")
    if (!domain) {
      issues.push({ path: `${aPath}.domain`, message: "domain requis." })
    } else if (seenDomains.has(domain)) {
      issues.push({
        path: `${aPath}.domain`,
        message: `Domaine « ${domain} » en doublon dans le Source Corpus : une seule autorité par domaine exigée.`,
      })
    } else {
      seenDomains.add(domain)
    }

    const name = toNullableString(authRaw.name) ?? domain ?? `Source ${aIndex + 1}`

    if (!Array.isArray(authRaw.documents_used) || authRaw.documents_used.length === 0) {
      issues.push({ path: `${aPath}.documents_used`, message: "documents_used requis avec au moins un document." })
    }

    const rawDocs = Array.isArray(authRaw.documents_used) ? authRaw.documents_used : []
    const parsedDocs: WorkDocumentUsed[] = []

    rawDocs.forEach((docRaw, dIndex) => {
      const dPath = `${aPath}.documents_used[${dIndex}]`
      if (!isRecord(docRaw)) {
        issues.push({ path: dPath, message: "Document invalide (objet attendu)." })
        return
      }
      const ref = toNullableString(docRaw.source_ref)
      if (!ref) {
        issues.push({ path: `${dPath}.source_ref`, message: "source_ref de document requis." })
      } else if (seenDocRefs.has(ref)) {
        issues.push({ path: `${dPath}.source_ref`, message: `source_ref « ${ref} » dupliqué dans le corpus.` })
      } else {
        seenDocRefs.add(ref)
      }

      const url = toNullableString(docRaw.url)
      if (!url) {
        issues.push({ path: `${dPath}.url`, message: "url de document requise." })
      } else if (!isValidHttpUrl(url)) {
        issues.push({ path: `${dPath}.url`, message: `url de document invalide (« ${url} »).` })
      }

      const title = toNullableString(docRaw.title) ?? ref ?? "Document"

      parsedDocs.push({
        source_ref: ref ?? "",
        title,
        url: url ?? "",
        published_at: toNullableString(docRaw.published_at),
        consulted_at: toNullableString(docRaw.consulted_at),
        used_in_sections: Array.isArray(docRaw.used_in_sections)
          ? docRaw.used_in_sections.filter((s): s is string => typeof s === "string")
          : undefined,
      })
    })

    parsedAuthorities.push({
      name,
      domain: domain ?? "",
      publisher: toNullableString(authRaw.publisher),
      source_type: toNullableString(authRaw.source_type),
      description: toNullableString(authRaw.description),
      information_types: Array.isArray(authRaw.information_types)
        ? authRaw.information_types.filter((t): t is string => typeof t === "string")
        : undefined,
      primary_language: toNullableString(authRaw.primary_language),
      primary_geography: toNullableString(authRaw.primary_geography),
      confidence: toNullableNumber(authRaw.confidence),
      documents_used: parsedDocs,
    })
  })

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  const extraFields: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(root)) {
    if (!["schema_version", "corpus", "sources"].includes(key)) {
      extraFields[key] = val
    }
  }

  return {
    ok: true,
    data: {
      schema_version: schemaVersion ?? 1,
      corpus: corpusMeta,
      sources: parsedAuthorities,
      extra_fields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
    },
  }
}

// ─── 3. Validation croisée du bundle ────────────────────────────────────────

function normalizeCompanyName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

export function validateWorkStudyBundle(
  accountIntelligence: WorkAccountIntelligence,
  sourceCorpus: WorkSourceCorpus,
  context?: { companyName?: string; companyId?: string },
): WorkBundleValidationResult {
  const issues: WorkBundleValidationIssue[] = []

  // 1. Identité du compte
  const aiLegalName = accountIntelligence.entity_resolution.legal_name
  const corpusAccountName = sourceCorpus.corpus.account_name

  const normAi = normalizeCompanyName(aiLegalName)
  const normCorpus = normalizeCompanyName(corpusAccountName)

  if (!normAi.includes(normCorpus) && !normCorpus.includes(normAi)) {
    issues.push({
      path: "identity",
      message: `Incohérence d'identité entre l'Account Intelligence (« ${aiLegalName} ») et le Source Corpus (« ${corpusAccountName} »).`,
      severity: "error",
    })
  }

  if (context?.companyName) {
    const normContext = normalizeCompanyName(context.companyName)
    if (!normAi.includes(normContext) && !normContext.includes(normAi)) {
      issues.push({
        path: "identity.context",
        message: `L'entreprise ciblée (« ${context.companyName} ») diffère de l'entité résolue (« ${aiLegalName} »).`,
        severity: "warning",
      })
    }
  }

  // 2. Indexation et résolution des documents du Source Corpus
  const corpusDocByRef = new Map<string, WorkDocumentUsed>()
  const corpusAuthByDomain = new Map<string, WorkSourceAuthority>()
  const corpusDomainByDocRef = new Map<string, string>()

  for (const auth of sourceCorpus.sources) {
    corpusAuthByDomain.set(auth.domain, auth)
    for (const doc of auth.documents_used) {
      corpusDocByRef.set(doc.source_ref, doc)
      corpusDomainByDocRef.set(doc.source_ref, auth.domain)
    }
  }

  // Vérifier la liste des sources dans Account Intelligence
  for (const aiSource of accountIntelligence.sources) {
    if (!corpusDocByRef.has(aiSource.id)) {
      issues.push({
        path: `account_intelligence.sources[${aiSource.id}]`,
        message: `La source « ${aiSource.id} » de l'Account Intelligence n'existe pas dans les documents du Source Corpus.`,
        severity: "error",
      })
    }
  }

  // Vérifier chaque source_ref citée dans les statements
  const citedDocRefs = new Set<string>()

  accountIntelligence.sections.forEach((section) => {
    // Section-level source_refs
    for (const ref of section.source_refs ?? []) {
      citedDocRefs.add(ref)
      if (!corpusDocByRef.has(ref)) {
        issues.push({
          path: `sections[${section.key}].source_refs`,
          message: `Référence de source orpheline « ${ref} » dans la section « ${section.title} ».`,
          severity: "error",
        })
      }
    }

    // Statement-level source_refs
    section.statements.forEach((statement, stmtIndex) => {
      for (const ref of statement.source_refs) {
        citedDocRefs.add(ref)
        if (!corpusDocByRef.has(ref)) {
          issues.push({
            path: `sections[${section.key}].statements[${stmtIndex}].source_refs`,
            message: `Référence orpheline « ${ref} » citée par l'affirmation « ${statement.text.slice(0, 50)}… ».`,
            severity: "error",
          })
        }
      }
    })
  })

  // 3. Exhaustivité et traçabilité des documents non cités
  for (const [ref, doc] of corpusDocByRef.entries()) {
    if (!citedDocRefs.has(ref)) {
      issues.push({
        path: `source_corpus.documents_used[${ref}]`,
        message: `Document « ${ref} » (${doc.title}) présent dans le corpus mais non cité dans l'étude narrative ou les affirmations.`,
        severity: "warning",
      })
    }
  }

  const hasErrors = issues.some((issue) => issue.severity === "error")

  return {
    ok: !hasErrors,
    issues,
  }
}

import {
  parseWorkAccountIntelligence,
  parseWorkSourceCorpus,
} from "./work-study-parser"
import type { WorkAccountIntelligence, WorkSourceCorpus } from "./work-study-contracts"

export type WorkBundleRole = "account_intelligence" | "source_corpus"

export type WorkFileDetectionResult<T = unknown> =
  | {
      ok: true
      role: "account_intelligence"
      parsed: WorkAccountIntelligence
      raw: T
    }
  | {
      ok: true
      role: "source_corpus"
      parsed: WorkSourceCorpus
      raw: T
    }
  | {
      ok: false
      error: string
      aiIssues?: string[]
      corpusIssues?: string[]
    }

export type WorkBundleDetectionSuccess<T = unknown> = {
  ok: true
  accountIntelligence: {
    slot: "file_a" | "file_b"
    data: WorkAccountIntelligence
    raw: T
  }
  sourceCorpus: {
    slot: "file_a" | "file_b"
    data: WorkSourceCorpus
    raw: T
  }
}

export type WorkBundleDetectionFailure = {
  ok: false
  error: string
}

export type WorkBundleDetectionResult<T = unknown> =
  | WorkBundleDetectionSuccess<T>
  | WorkBundleDetectionFailure

/**
 * Détecte le rôle d'un fichier JSON isolé (Account Intelligence vs Source Corpus).
 * Un fichier doit satisfaire l'un des contrats SANS ambiguïté.
 */
export function detectWorkFileRole<T = unknown>(fileContent: T): WorkFileDetectionResult<T> {
  const aiResult = parseWorkAccountIntelligence(fileContent)
  const corpusResult = parseWorkSourceCorpus(fileContent)

  if (aiResult.ok && corpusResult.ok) {
    return {
      ok: false,
      error: "Structure ambiguë : le fichier correspond simultanément aux contrats Account Intelligence et Source Corpus.",
    }
  }

  if (aiResult.ok) {
    return {
      ok: true,
      role: "account_intelligence",
      parsed: aiResult.data,
      raw: fileContent,
    }
  }

  if (corpusResult.ok) {
    return {
      ok: true,
      role: "source_corpus",
      parsed: corpusResult.data,
      raw: fileContent,
    }
  }

  const aiIssues = aiResult.issues.map((i) => i.message)
  const corpusIssues = corpusResult.issues.map((i) => i.message)

  return {
    ok: false,
    error: "Fichier non reconnu : ni un JSON Account Intelligence, ni un JSON Source Corpus valide.",
    aiIssues,
    corpusIssues,
  }
}

/**
 * Détecte sans ambiguïté les rôles respectifs des deux fichiers du bundle ChatGPT Work.
 * Doit trouver exactement 1 fichier Account Intelligence et 1 fichier Source Corpus.
 */
export function detectWorkBundleRoles<TA = unknown, TB = unknown>(
  fileA: TA,
  fileB: TB,
): WorkBundleDetectionResult<TA | TB> {
  const detA = detectWorkFileRole(fileA)
  const detB = detectWorkFileRole(fileB)

  if (!detA.ok && !detB.ok) {
    return {
      ok: false,
      error: `Aucun des deux fichiers n'est reconnu comme un livrable ChatGPT Work valide. Fichier A : ${detA.error} | Fichier B : ${detB.error}`,
    }
  }

  if (!detA.ok) {
    return {
      ok: false,
      error: `Le premier fichier n'est pas reconnu : ${detA.error}`,
    }
  }

  if (!detB.ok) {
    return {
      ok: false,
      error: `Le second fichier n'est pas reconnu : ${detB.error}`,
    }
  }

  if (detA.role === detB.role) {
    if (detA.role === "account_intelligence") {
      return {
        ok: false,
        error: "Deux fichiers Account Intelligence ont été sélectionnés. Veuillez sélectionner 1 fichier Account Intelligence et 1 fichier Source Corpus.",
      }
    }
    return {
      ok: false,
      error: "Deux fichiers Source Corpus ont été sélectionnés. Veuillez sélectionner 1 fichier Account Intelligence et 1 fichier Source Corpus.",
    }
  }

  if (detA.role === "account_intelligence" && detB.role === "source_corpus") {
    return {
      ok: true,
      accountIntelligence: {
        slot: "file_a",
        data: detA.parsed as WorkAccountIntelligence,
        raw: fileA,
      },
      sourceCorpus: {
        slot: "file_b",
        data: detB.parsed as WorkSourceCorpus,
        raw: fileB,
      },
    }
  }

  return {
    ok: true,
    accountIntelligence: {
      slot: "file_b",
      data: detB.parsed as WorkAccountIntelligence,
      raw: fileB,
    },
    sourceCorpus: {
      slot: "file_a",
      data: detA.parsed as WorkSourceCorpus,
      raw: fileA,
    },
  }
}

/**
 * Vérifie la cohérence d'identité entre le compte Kredo sélectionné et
 * le nom d'entreprise détecté dans le bundle ChatGPT Work.
 */
export function checkCompanyIdentityMatch(
  kredoCompanyName: string,
  detectedCompanyName: string,
): { match: boolean; reason?: string } {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()

  const stopWords = new Set([
    "sas", "sarl", "sa", "sci", "inc", "ltd", "gmbh", "groupe", "group",
    "laboratoires", "laboratoire", "france", "holding", "cie", "compagnie",
  ])

  const clean = (s: string) =>
    norm(s)
      .split(/\s+/)
      .filter((t) => t.length > 2 && !stopWords.has(t))

  const tokensKredo = clean(kredoCompanyName)
  const tokensDetected = clean(detectedCompanyName)

  if (tokensKredo.length === 0 || tokensDetected.length === 0) {
    const rawK = norm(kredoCompanyName)
    const rawD = norm(detectedCompanyName)
    const match = rawK.includes(rawD) || rawD.includes(rawK)
    return {
      match,
      reason: match
        ? undefined
        : `L'entreprise détectée (${detectedCompanyName}) ne correspond pas au compte Kredo (${kredoCompanyName}).`,
    }
  }

  const hasOverlap = tokensKredo.some((tk) =>
    tokensDetected.some((td) => td.includes(tk) || tk.includes(td)),
  )

  return {
    match: hasOverlap,
    reason: hasOverlap
      ? undefined
      : `L'entreprise détectée (${detectedCompanyName}) ne correspond pas au compte Kredo (${kredoCompanyName}).`,
  }
}

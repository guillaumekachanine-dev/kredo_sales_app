/**
 * Contrat de lancement d'un digest — ADR-0022 §3.4.
 *
 * Module PUR : validation de FORME uniquement. Même doctrine que
 * `mission-selectors.ts` (ADR-0020 M-5) — « ne dit jamais si l'entité existe,
 * c'est le rôle du résolveur, sous RLS ».
 *
 * Le navigateur n'envoie que deux identifiants. Ni URL de source, ni prompt, ni
 * liste de sources : tout le reste est imposé ou revalidé côté serveur.
 */

export const DIGEST_LAUNCH_SCHEMA_VERSION = 2 as const

/** Ce que le navigateur poste dans `input` sur /api/n8n/trigger. */
export type DigestLaunchInputV2 = {
  schemaVersion: typeof DIGEST_LAUNCH_SCHEMA_VERSION
  triggerMode: "manual"
  /** Clé du registre `DIGEST_PRESETS`, ou slug d'un segment `sector_intelligence`. */
  topicKey: string
  /** `null` = mode par défaut : le socle éditorial via `v_effective_watch_sources`. */
  corpusId: string | null
}

export type DigestLaunchValidation<T> = { ok: true; value: T } | { ok: false; error: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/**
 * Forme d'une clé de sujet. Couvre à la fois les clés du registre (`ia`, `llm`)
 * et les slugs de segment (`seg-parfumerie-compositions-b2b`), qui partagent la
 * même grammaire. L'appartenance réelle au registre ou à `sector_intelligence`
 * n'est PAS vérifiée ici.
 */
const TOPIC_KEY_RE = /^[a-z0-9][a-z0-9-]{0,80}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function parseDigestLaunchInput(raw: unknown): DigestLaunchValidation<DigestLaunchInputV2> {
  if (!isRecord(raw)) return { ok: false, error: "Payload de lancement invalide." }

  if (raw.schemaVersion !== DIGEST_LAUNCH_SCHEMA_VERSION) {
    return { ok: false, error: `schemaVersion doit valoir ${DIGEST_LAUNCH_SCHEMA_VERSION}.` }
  }
  if (raw.triggerMode !== "manual") {
    return { ok: false, error: "triggerMode doit valoir \"manual\"." }
  }

  const topicKey = typeof raw.topicKey === "string" ? raw.topicKey.trim() : ""
  if (!topicKey) return { ok: false, error: "topicKey est requis." }
  if (!TOPIC_KEY_RE.test(topicKey)) {
    return { ok: false, error: `topicKey « ${topicKey} » n'a pas une forme de clé de sujet.` }
  }

  const rawCorpusId = raw.corpusId
  if (rawCorpusId === undefined || rawCorpusId === null || rawCorpusId === "") {
    return {
      ok: true,
      value: {
        schemaVersion: DIGEST_LAUNCH_SCHEMA_VERSION,
        triggerMode: "manual",
        topicKey,
        corpusId: null,
      },
    }
  }
  if (typeof rawCorpusId !== "string" || !UUID_RE.test(rawCorpusId)) {
    return { ok: false, error: "corpusId doit être un identifiant de corpus valide." }
  }

  return {
    ok: true,
    value: {
      schemaVersion: DIGEST_LAUNCH_SCHEMA_VERSION,
      triggerMode: "manual",
      topicKey,
      corpusId: rawCorpusId,
    },
  }
}

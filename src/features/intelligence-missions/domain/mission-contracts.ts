/**
 * Contrats des missions d'intelligence — ADR-0020 (Accepté le 2026-08-18).
 *
 * Ces types sont consommés par les lots L1 (résolveur de corpus), L2 (enveloppe n8n),
 * L3 (validateur de sortie + callback) et L5 (pilote). Les commentaires portent les
 * décisions normatives : ne pas les « simplifier » sans relire l'ADR.
 *
 * Module de TYPES pur : les deux imports ci-dessous sont `import type`, effacés à la
 * compilation. Aucun runtime, donc aucune garde `server-only` à porter ici.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

/**
 * ADR-0020 §5.1 — trois origines, nommées par le MÉTIER.
 * `rpc_context` est délibérément absent : faire remonter un nom de RPC PostgreSQL dans
 * le contrat de mission ferait fuir l'infrastructure dans le modèle métier et créerait
 * de fait un dispatcher de RPC générique. Une mission ne connaît jamais une RPC.
 */
export type CorpusKind =
  | "veille_period"
  | "intelligence_document"
  | "account_context"
  | "delivery_period"
  | "prospection_window"

export type CorpusSelector =
  | { kind: "veille_period"; periodStart: string; periodEnd: string }
  | { kind: "intelligence_document"; ids: string[] }
  | { kind: "account_context"; companyId: string }
  | { kind: "delivery_period"; periodStart: string; periodEnd: string }
  | { kind: "prospection_window"; periodStart: string; periodEnd: string }

/** Élément normalisé — jamais une copie durable : hydraté à l'exécution. */
export type CorpusItem = {
  ref: { kind: CorpusKind; table: string; id: string }
  title: string
  date: string | null
  provenance: string
  content: string
  chars: number
}

export type CorpusBudget = {
  maxTotalChars: number
  maxCharsPerItem: number
  maxItems: number
}

export type ResolvedCorpus = {
  items: CorpusItem[]
  stats: {
    requested: number
    kept: number
    dropped: number
    totalChars: number
  }
  /**
   * Écrite dans `ai_intelligence_runs.input_snapshot`. Références et titres,
   * JAMAIS de contenu copié. Elle doit rester suffisante pour que le callback (L3)
   * puisse reconstituer un `SourceRef` à partir du seul identifiant rendu par le LLM.
   */
  trace: Array<{
    ref: CorpusItem["ref"]
    title: string
    provenance: string
    kept: boolean
    reason?: CorpusTraceReason
  }>
}

/**
 * Pourquoi un élément a été tronqué ou écarté. ADR-0020 §4.4 exige que rien ne soit
 * silencieux ; les trois dernières valeurs sont ajoutées par L1 parce que l'écart peut
 * naître AVANT le budget :
 *  - `archived`       : document `intelligence_documents.archived_at` non nul, ignoré ;
 *  - `not_found`      : référence demandée qui ne résout aucune ligne LISIBLE par
 *                       l'utilisateur (inexistante, ou hors de son workspace) ;
 *  - `provider_limit` : borne dure de requête atteinte côté provider (garde de volume,
 *                       pas une règle métier) — tracée pour ne jamais tronquer en silence.
 */
export type CorpusTraceReason =
  | "budget_total"
  | "budget_items"
  | "truncated"
  | "archived"
  | "not_found"
  | "provider_limit"

/** Élément écarté par un provider, avant même l'application du budget. */
export type CorpusExclusion = {
  ref: CorpusItem["ref"]
  title: string
  provenance: string
  reason: Extract<CorpusTraceReason, "archived" | "not_found" | "provider_limit">
}

/**
 * Un provider rend ce qu'il a hydraté ET ce qu'il a délibérément écarté : sans le
 * second, un document archivé ou une référence illisible disparaîtrait sans trace,
 * ce qu'ADR-0020 §4.4 interdit.
 */
export type CorpusProviderResult = {
  items: CorpusItem[]
  exclusions: CorpusExclusion[]
}

export type CorpusResolveContext = {
  /**
   * TOUJOURS résolu côté serveur depuis `profiles.workspace_id` de la session —
   * JAMAIS lu dans le corps de la requête. C'est l'invariant qui rend la garde de
   * workspace des providers non contournable.
   */
  workspaceId: string
  /** Client Supabase de l'utilisateur : RLS active. */
  supabase: SupabaseClient<Database>
}

export type CorpusProvider<S extends CorpusSelector = CorpusSelector> = {
  kind: CorpusKind
  /**
   * ADR-0020 M-5 — le mode d'exécution est DÉCLARÉ, jamais supposé :
   *  - "user_rls"     : client Supabase de l'utilisateur, RLS active. Cas nominal.
   *  - "service_role" : nécessaire quand la source n'est pas exécutable par
   *                     `authenticated` (4 des 16 RPC). Le provider DOIT alors
   *                     revérifier explicitement l'appartenance au workspace,
   *                     et ce contrôle porte un test dédié.
   */
  execution: "user_rls" | "service_role"
  resolve(ctx: CorpusResolveContext, selector: S): Promise<CorpusProviderResult>
  /** Priorité de conservation quand le budget est dépassé. */
  weight: number
}

/** Bornes de la mission, séparées de l'intention : des règles, pas un DSL. */
export type MissionConstraintSpec = {
  rules: string[]
}

export type SourceRef = {
  ref: CorpusItem["ref"]
  title: string
  provenance: string
}

/**
 * ADR-0020 §5.3 — `category` est le SEUL discriminant. Il existe parce que le pilote
 * `intel-021` produit six sections typées : sans lui, la comparaison ancien/nouveau
 * perdrait sa structure et la preuve du pilote dégénérerait en « ça a produit quelque
 * chose ». C'est un champ, pas un schéma par mission.
 */
export type Finding = {
  category:
    | "tendance"
    | "signal_faible"
    | "reglementaire"
    | "opportunite"
    | "risque"
    | "autre"
  statement: string
  evidence: SourceRef[]
}

export type Recommendation = {
  action: string
  rationale: string
  /** Transposition de `priorityActions[].horizon` d'intel-021 — requis par la preuve L5. */
  horizon?: "immediate" | "30_days" | "quarter"
  evidence: SourceRef[]
}

/**
 * Contrat de sortie UNIQUE (ADR-0020 M-7 / §5.3) — un validateur écrit à la main en L3,
 * pas de moteur de schéma. Aucune mission ne configure son contrat de sortie.
 */
export type MissionReportV1 = {
  schemaVersion: 1
  title: string
  executiveSummary: string
  findings: Finding[]
  recommendations: Recommendation[]
  sourceRefs: SourceRef[]
}

export type MissionSpec = {
  /** Clé stable, sert de suffixe au `run_type` (`mission:<slug>`). */
  slug: string
  /** Incrémenté à toute modification de prompt ou de contraintes. */
  version: number
  label: string
  description: string

  /** A — CORPUS : sur quoi la mission a le droit de travailler. */
  corpus: {
    /** Sélecteurs figés, connus sans contexte de lancement. */
    base: CorpusSelector[]
    /**
     * Kinds que le contexte de lancement DOIT fournir (une période de veille, un
     * compte…). Le résolveur L1 refuse le lancement si l'un d'eux n'a pas de sélecteur :
     * sans ce champ, un preset à `base: []` décrirait une mission sans corpus.
     */
    requiredAtLaunch: CorpusKind[]
    /** Le champ libre utilisateur est une soupape, pas le produit. */
    userAddition: { allowed: boolean; kinds: CorpusKind[] }
    budget: CorpusBudget
  }

  /** B — INTENTION : ce que l'on cherche à obtenir. */
  intent: {
    preset: string
    userEditable: boolean
  }

  /** C — CONTRAINTES : bornes, séparées de l'intention. */
  constraints: MissionConstraintSpec

  /**
   * D — LIVRABLE. Le preset ne configure RIEN du contrat de sortie : ni `resultType`,
   * ni `outputSchema`, ni règles QA (ADR-0020 M-7). Toutes les missions produisent
   * `MissionReportV1`, et le callback impose lui-même
   * resultType = documentType = "mission_report".
   */
  promptTemplate: string

  model: { provider: "anthropic"; model: string; maxOutputTokens: number }
}

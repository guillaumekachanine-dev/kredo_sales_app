// ─── Catalogue des IDs de workflows n8n ──────────────────────────────────────
// Correspond aux IDs stables de la cartographie KREDO_Cartographie_Workflows_n8n.html
// Ces IDs = noms des webhooks dans n8n (chemin après /webhook/)

export type N8nWorkflowId =
  // Fondations (CORE)
  | "core-003-run-lifecycle"        // CORE-003 : sous-workflow cycle de vie
  // Intelligence commerciale
  | "intel-010-refresh"             // INTEL-010 : client_intelligence_refresh
  | "intel-011-sector"              // INTEL-011 : étude sectorielle mutualisée
  | "intel-020-pitch-mail"          // INTEL-020 : génération pitch/mail
  | "intel-021-client-summary"      // INTEL-021 : synthèse client
  | "intel-022-campaign"            // INTEL-022 : création campagne
  // Sales
  | "sales-001-interaction-enrich"  // SALES-001 : enrichissement interaction (preuve E2E)
  // Recrutement
  | "rec-001-cv-parsing"            // REC-001 : ingestion & parsing CV
  | "rec-002-vectorize"             // REC-002 : vectorisation pgvector
  | "rec-003-matching"              // REC-003 : matching IA scoring

// ─── Payload envoyé par Next.js vers n8n (CORE-001) ─────────────────────────

export type N8nTriggerPayload = {
  // Traçabilité — permet à n8n de mettre à jour le bon run
  runId: string
  workflowId: N8nWorkflowId
  // Contexte de l'entité concernée
  entityType: "company" | "opportunity" | "candidate" | "interaction"
  entityId: string
  workspaceId: string
  userId: string
  // Données métier spécifiques au workflow
  input: Record<string, unknown>
  // URL absolue du callback — n8n postera ici ses résultats
  callbackUrl: string
}

// ─── Payload envoyé par n8n vers /api/n8n/callback (CORE-002) ───────────────

export type N8nCallbackPayload = {
  runId: string
  phase: number                        // 1=analyse · 2=sectorielle · 3=diagnostic · 4=roadmap · 5=pitch
  resultType: string                   // ex: "pitch", "sector_analysis", "client_summary"
  status: "succeeded" | "failed"
  // Le contenu réel — toujours dans content_json (source unique, pas de html)
  contentJson: Record<string, unknown>
  contentText?: string                 // Version texte brut optionnelle (pour recherche)
  title?: string
  // Métriques LLM (pour contrôle des coûts via CORE-004)
  modelProvider?: string
  modelUsed?: string
  tokensInput?: number
  tokensOutput?: number
  costEstimate?: number
  durationMs?: number
  // En cas d'échec
  errorMessage?: string
}

// ─── Réponse de /api/n8n/trigger vers le front ───────────────────────────────

export type TriggerResponse = {
  runId: string
  status: "queued"
}

export type TriggerErrorResponse = {
  error: string
}

#!/usr/bin/env python3
"""
Patch `n8n/workflows/veille-hebdomadaire-kredo.json` pour lui ajouter :
1. un DEUXIÈME déclencheur — webhook `veille-ia-marche-on-demand` (lancement manuel) ;
2. la rétrocompatibilité V1 + contrat V2 « Sujet × Corpus » (ADR-0022 Lot 2A) ;
3. le routage de sources V1 / V2 sans relire les sources globales en V2 ;
4. la déduplication jointe sur `veille_digests.topic_key` ;
5. l'upsert à 3 colonnes `(workspace_id, digest_date, topic_key)` sur `veille_digests` ;
6. la correction DEF-1 / H-2 des métriques de sources (dataflow post-boucle).

Après patch, le workflow (nommé « KREDO — Veille IA & Marché ») porte :
  - le `scheduleTrigger` cron `0 6 * * 1` existant (inchangé, topicKey='global', scheduled) ;
  - le webhook POST /webhook/veille-ia-marche-on-demand vérifiant HMAC `X-KREDO-Signature` ;
  - support V1 (`schemaVersion: 1`, topicKey='global', manual, sources effectives) ;
  - support V2 (`schemaVersion: 2`, topicKey résolu, manual, sources pré-résolues, framing) ;
  - point de convergence unique `Explode Sources` → boucle → dédup → analyse → digest.

IDEMPOTENT : relancer met à niveau le workflow sans duplication.
STRUCTUREL : repérage par nom de nœud.
À REJOUER contre le JSON réconcilié avec le VPS (cf. SETUP §Import).

Usage :
    python3 scripts/patch-veille-on-demand.py
    python3 scripts/patch-veille-on-demand.py --check   # n'écrit rien, code retour 1 si patch V2 manquant
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WF_PATH = ROOT / "n8n" / "workflows" / "veille-hebdomadaire-kredo.json"

WORKFLOW_NAME = "KREDO — Veille IA & Marché"
WEBHOOK_PATH = "veille-ia-marche-on-demand"
RESULT_TYPE = "watch_digest_generation"
SECRET_PLACEHOLDER = "REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET"
CRON_WORKSPACE_ID = "98dcd39d-f87b-4f9d-add9-ce76d635953a"
SUPABASE_REST = "https://jvzgmhvwirsbdkjpmvla.supabase.co/rest/v1"

SCHEDULE_NODE = "Lundi 6h Europe Paris"
PIPELINE_ENTRY = "Récupérer Secteurs Actifs"
BUILD_CONTEXT = "Build Contexte KREDO"
ROUTER_SOURCES = "Router Résolution Sources"
CHARGER_SOURCES = "Charger Sources Effectives (Supabase)"
VERIFIER_SOURCES = "Vérifier et Normaliser Sources"
EXPLODE_SOURCES = "Explode Sources"
IGNORER_ERREUR = "Ignorer Source En Erreur"
RECUPERER_HASH = "Récupérer Hash Articles Vus"
CREER_DIGEST = "Créer Digest"
DIGEST_TAIL = "Remplacer Articles Digest (RPC)"
PREPARER_METRIQUES = "Préparer Métriques Sources"
ECRIRE_METRIQUES = "Écrire Métriques Sources"
CTX_NODE = "Résoudre Contexte Déclenchement"

FAILURE_GUARDED = [
    "Appel Claude Haiku — Classement",
    "Appel Claude Sonnet — Analyse",
    "Créer Digest",
    "Remplacer Articles Digest (RPC)",
    "Parser Digest Final",
    "Valider Convergences",
]


def node(name, ntype, params, pos, type_version=1, extra=None):
    n = {
        "parameters": params,
        "id": f"vod-{name.lower().replace(' ', '-').replace('—', '').replace('&', '').replace('  ', ' ')[:40]}",
        "name": name,
        "type": ntype,
        "typeVersion": type_version,
        "position": pos,
    }
    if extra:
        n.update(extra)
    return n


VALIDER_SIGNATURE_JS = f"""
const item = $input.first().json;
const body = item.body || {{}};
const headers = item.headers || {{}};

const receivedSignature = headers['x-kredo-signature'] || headers['X-KREDO-Signature'] || '';
const expectedSignature = 'sha256=' + (item.computedSignature || '');
if (!receivedSignature || receivedSignature !== expectedSignature) {{
  throw new Error('Signature HMAC invalide (X-KREDO-Signature) — requete rejetee');
}}

const required = ['runId', 'workflowId', 'entityType', 'workspaceId', 'userId', 'callbackUrl'];
for (const field of required) {{
  if (!body[field]) throw new Error(`Champ requis manquant dans le payload : ${{field}}`);
}}
if (body.workflowId !== '{WEBHOOK_PATH}') {{
  throw new Error(`workflowId inattendu : ${{body.workflowId}}`);
}}
const input = body.input || {{}};
if (input.triggerMode !== 'manual') {{
  throw new Error('triggerMode doit valoir "manual"');
}}

if (input.schemaVersion === 1) {{
  return [{{
    json: {{
      __trigger: 'webhook',
      runId: body.runId,
      workspaceId: body.workspaceId,
      userId: body.userId,
      callbackUrl: body.callbackUrl,
      triggerMode: 'manual',
      schemaVersion: 1,
      topicKey: 'global',
      topicSectorId: null,
      sourceCorpusId: null,
      generationMode: 'manual',
      framing: null,
      sources: null,
      stats: null,
    }}
  }}];
}}

if (input.schemaVersion === 2) {{
  const topicKey = typeof input.topicKey === 'string' ? input.topicKey.trim() : '';
  if (!topicKey) {{
    throw new Error('Payload V2 invalide : topicKey est requis');
  }}
  if (topicKey === 'segment') {{
    throw new Error('Payload V2 invalide : topicKey ne doit jamais valoir "segment"');
  }}

  const framing = typeof input.framing === 'string' ? input.framing.trim() : '';
  if (!framing) {{
    throw new Error('Payload V2 invalide : framing est requis');
  }}

  if (!Array.isArray(input.sources)) {{
    throw new Error('Payload V2 invalide : tableau de sources requis');
  }}
  if (input.sources.length === 0) {{
    throw new Error('Payload V2 invalide : tableau de sources vide');
  }}

  for (const s of input.sources) {{
    if (!s || typeof s !== 'object' || Array.isArray(s)) {{
      throw new Error('Payload V2 invalide : source mal formée');
    }}
    const sourceId = s.sourceId || s.source_id;
    const sourceName = s.sourceName || s.source_name;
    const searchDomain = s.searchDomain || s.search_domain;
    const collectionMode = s.collectionMode || s.collection_mode;
    if (!sourceId || typeof sourceId !== 'string' ||
        !sourceName || typeof sourceName !== 'string' ||
        !searchDomain || typeof searchDomain !== 'string' ||
        (collectionMode !== 'rss' && collectionMode !== 'site_search')) {{
      throw new Error(`Payload V2 invalide : source mal formée (${{JSON.stringify(s)}})`);
    }}
  }}

  const topicSectorId = input.topicSectorId || input.sectorId || null;
  const sourceCorpusId = input.corpusId || input.sourceCorpusId || null;

  return [{{
    json: {{
      __trigger: 'webhook',
      runId: body.runId,
      workspaceId: body.workspaceId,
      userId: body.userId,
      callbackUrl: body.callbackUrl,
      triggerMode: 'manual',
      schemaVersion: 2,
      topicKey,
      topicSectorId,
      sourceCorpusId,
      generationMode: 'manual',
      framing,
      sources: input.sources,
      stats: input.stats || null,
    }}
  }}];
}}

throw new Error('input doit valoir {{ schemaVersion: 1 | 2, triggerMode: "manual", ... }}');
""".strip()


CONTEXTE_CRON_JS = f"""
// Branche cron uniquement : aucun run KREDO a tracer, workspace mono-tenant.
// Le mode manuel NE PASSE JAMAIS ici — il lit `workspaceId` dans le payload webhook.
return [{{
  json: {{
    __trigger: 'schedule',
    runId: null,
    workspaceId: '{CRON_WORKSPACE_ID}',
    userId: null,
    callbackUrl: null,
    triggerMode: 'scheduled',
    schemaVersion: 1,
    topicKey: 'global',
    topicSectorId: null,
    sourceCorpusId: null,
    generationMode: 'scheduled',
    framing: null,
    sources: null,
    stats: null,
  }}
}}];
""".strip()


RESOUDRE_CONTEXTE_JS = """
// Nœud COMMUN aux deux declencheurs : source de verite unique pour tout l'aval.
// Un seul declencheur s'execute par run, donc un seul item arrive ici.
const src = $input.first().json || {};
const isWebhook = src.__trigger === 'webhook';
const schemaVersion = src.schemaVersion ?? 1;
const triggerMode = isWebhook ? 'manual' : 'scheduled';
const generationMode = src.generationMode || (isWebhook ? 'manual' : 'scheduled');

return [{
  json: {
    triggerMode,
    generationMode,
    schemaVersion,
    runId: isWebhook ? (src.runId || null) : null,
    workspaceId: src.workspaceId,
    userId: isWebhook ? (src.userId || null) : null,
    callbackUrl: isWebhook ? (src.callbackUrl || null) : null,
    digestDate: new Date().toISOString().slice(0, 10),
    topicKey: src.topicKey || 'global',
    topicSectorId: src.topicSectorId || null,
    sourceCorpusId: src.sourceCorpusId || null,
    framing: src.framing || null,
    sources: src.sources || null,
    stats: src.stats || null,
  }
}];
""".strip()


BUILD_CONTEXTE_JS = """
const items = $input.all();
const secteurs = items.map(i => i.json.name).filter(Boolean);
const secteursActifs = secteurs.length ? secteurs.join(', ') : 'transverse';

const blocContexteKredo = `# CONTEXTE — Veille commerciale KREDO

Tu opères au sein de KREDO, une plateforme de CRM et d'intelligence commerciale
destinée aux fonctions commerciales d'une ESN (Entreprise de Services du Numérique).

## Ton lecteur
Un commercial / avant-vente d'ESN, profil "pont commerce-technique" : il n'est pas
ingénieur, mais il doit paraître crédible et pertinent face à un DSI ou un décideur
métier. Il vend des prestations intellectuelles (conseil, intégration, IA, data).
Il n'a PAS besoin d'actualité pour dirigeants d'ESN (M&A, book-to-bill, salaires).
Il a besoin de MUNITIONS COMMERCIALES.

## Ses cibles (ICP)
DSI et décideurs métiers d'ETI et de grands comptes, sur les secteurs actuellement
couverts par KREDO : ${secteursActifs}.

## La question à laquelle toute ton analyse doit répondre
"En quoi cette information donne-t-elle à un commercial d'ESN une RAISON D'AGIR :
un angle d'ouverture, un déclencheur de prise de contact, un argument de crédibilité,
ou une preuve de ROI qu'il peut réutiliser dans un pitch ?"

## Est PERTINENT
- Un cas d'usage IA concret en entreprise, avec impact business chiffrable.
- Une tendance qui va faire réagir un DSI (agents IA, souveraineté, coûts, sécurité).
- Une évolution réglementaire qui crée un besoin de service (audit, mise en conformité).
- Un signal touchant un des secteurs de ${secteursActifs} (acteur, tendance, chiffre).
- Une annonce d'un grand acteur (OpenAI, Anthropic, Mistral...) que le prospect aura vue.

## N'est PAS pertinent (à écarter ou noter faible)
- La recherche académique pure, les détails techniques sans traduction business.
- Le buzz sans substance, les listes d'outils, les annonces produit mineures.
- L'actualité "dirigeant d'ESN" (fusions, valorisations, politique salariale).
- Ce qui ne se transforme en AUCUN angle commercial exploitable.

## Posture éditoriale
Reste factuel et neutre. Ne prends pas parti dans les rivalités entre acteurs
(fournisseurs, éditeurs, modèles). Une veille commerciale crédible informe, elle ne
milite pas. N'invente aucun chiffre ni citation : si une information n'est pas dans
le contenu fourni, ne l'ajoute pas.`;

let ctx = {};
try {
  ctx = $('Résoudre Contexte Déclenchement').first().json || {};
} catch (e) {
  ctx = {};
}

return [{
  json: {
    secteursActifs,
    blocContexteKredo: ctx.framing || blocContexteKredo,
    workspaceId: $('Résoudre Contexte Déclenchement').first().json.workspaceId,
    digestDate: $('Résoudre Contexte Déclenchement').first().json.digestDate,
  }
}];
""".strip()


VERIFIER_SOURCES_JS = """
// LOT 2 & ADR-0022 — Point de convergence des sources V1 et V2.
// V1 / cron : consomme les lignes brutes de v_effective_watch_sources ($input.all()).
// V2 : consomme directement les sources pré-résolues côté serveur par resolveDigestLaunch().
let ctx = {};
try {
  ctx = $('Résoudre Contexte Déclenchement').first().json || {};
} catch (e) {
  ctx = {};
}

let sources;
if (ctx.schemaVersion === 2) {
  sources = ctx.sources;
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error("Payload V2 invalide : tableau de sources vide ou manquant.");
  }
  for (const s of sources) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) {
      throw new Error("Payload V2 invalide : source mal formée.");
    }
    const sId = s.sourceId || s.source_id;
    const sName = s.sourceName || s.source_name;
    const sDomain = s.searchDomain || s.search_domain;
    const sMode = s.collectionMode || s.collection_mode;
    if (!sId || !sName || !sDomain || (sMode !== 'rss' && sMode !== 'site_search')) {
      throw new Error(`Payload V2 invalide : source mal formée (${JSON.stringify(s)})`);
    }
  }
} else {
  const rows = $input.all().map((i) => i.json);

  if (!rows.length) {
    throw new Error(
      "v_effective_watch_sources (usage_scope=news) a retourné 0 ligne : run interrompu, aucun digest ne sera créé."
    );
  }

  const sorted = [...rows].sort((a, b) => {
    const pa = a.priority ?? 0;
    const pb = b.priority ?? 0;
    if (pa !== pb) return pa - pb;
    return (b.utility_score ?? 0) - (a.utility_score ?? 0);
  });

  sources = sorted.map((r) => ({
    sourceId: r.source_id,
    sourceKey: r.source_key,
    sourceName: r.source_name,
    publisher: r.publisher,
    domain: r.domain,
    searchDomain: r.search_domain,
    collectionUrl: r.collection_url,
    collectionMode: r.collection_mode,
    family: r.family,
    kredoCategory: r.kredo_category,
    origin: r.origin,
    corpusId: r.corpus_id,
  }));
}

return [{ json: { sources } }];
""".strip()


IGNORER_ERREUR_JS = """
const source = $("Loop Over Items — 1 Source").item.json;
const err = $input.first().json.error || $input.first().json;
const cible = source.collectionUrl || source.searchDomain || "url inconnue";

console.log(
  `[Veille KREDO] Flux en erreur, source ignorée : ${source.sourceName} (${cible}) — ${JSON.stringify(err).slice(0, 300)}`
);

// IMPORTANT : ne jamais retourner un tableau vide ici. n8n arrête l'exécution
// du workflow entier quand un nœud ne produit aucun item en sortie (sauf à
// activer 'Always Output Data' dans les Settings du nœud). On retourne donc
// un item factice pour que la boucle B3 reçoive un signal et continue vers
// la source suivante.
return [{ json: { skipped: true, error: true, sourceId: source.sourceId, sourceName: source.sourceName, sourceUrl: cible } }];
""".strip()


PREPARER_METRIQUES_JS = """
// Instrumentation Lot 6 & Correction DEF-1 (H-2) — métriques de collecte fiables.
function safeNodeItems(nodeName) {
  try {
    return $(nodeName).all().map((i) => i.json);
  } catch (e) {
    return [];
  }
}

// 1. Sources interrogées : depuis Vérifier et Normaliser Sources (couvre V1, V2 et cron).
// Repli sur Charger Sources Effectives pour les harnais de tests unitaires isolés.
let loadedSources = [];
try {
  const norm = $('Vérifier et Normaliser Sources').first().json;
  if (norm && Array.isArray(norm.sources) && norm.sources.length > 0) {
    loadedSources = norm.sources.map((s) => ({
      source_id: s.sourceId || s.source_id,
      corpus_id: s.corpusId || s.corpus_id || null,
    }));
  }
} catch (e) {}

if (!loadedSources.length) {
  loadedSources = safeNodeItems('Charger Sources Effectives (Supabase)').filter((s) => s && s.source_id);
}

// 2. Articles collectés : solution dataflow post-boucle.
// $input.all() en sortie de Loop Over Items contient TOUTES les itérations de la boucle (corrige DEF-1).
// Repli sur Enrichir avec Métadonnées Source pour les harnais qui mockent ce nœud directement.
const loopItems = $input.all().map((i) => i.json).filter((it) => it && (it.sourceId || it.source_id));
const enrichedItems = loopItems.length > 0
  ? loopItems
  : safeNodeItems('Enrichir avec Métadonnées Source').filter((it) => it && it.sourceId);

const errorItems = safeNodeItems('Ignorer Source En Erreur').filter((it) => it && (it.sourceId || it.source_id) && it.error);
const loopErrorItems = loopItems.filter((it) => it && (it.skipped || it.error));
const failedSourceIds = new Set([
  ...errorItems.map((it) => it.sourceId || it.source_id),
  ...loopErrorItems.map((it) => it.sourceId || it.source_id),
]);

const dedupCandidateItems = safeNodeItems('Dédup + Filtre Récence + Préfiltre Qualité').filter((it) => it && (it.sourceId || it.source_id || it.sourceCatalogId));
const retainedArticles = safeNodeItems('Préparer Lignes Articles').flatMap((p) => {
  if (p && Array.isArray(p.p_articles)) return p.p_articles;
  if (p && (p.source_catalog_id || p.sourceId)) return [p];
  return [];
});

let workspaceId = null;
try {
  workspaceId = $('Résoudre Contexte Déclenchement').first().json.workspaceId || null;
} catch (e) {
  try {
    workspaceId = $('Build Contexte KREDO').first().json.workspaceId || null;
  } catch (e2) {}
}

if (!workspaceId) {
  return [];
}

const runKey = typeof $execution !== 'undefined' && $execution && $execution.id ? $execution.id : ('run-' + Date.now());

const collectedBySource = new Map();
for (const it of enrichedItems) {
  if (it.placeholder || it.skipped || it.error) continue;
  const sId = it.sourceId || it.source_id;
  if (!sId) continue;
  collectedBySource.set(sId, (collectedBySource.get(sId) || 0) + 1);
}

const dedupBySource = new Map();
for (const it of dedupCandidateItems) {
  const sId = it.sourceId || it.source_id || it.sourceCatalogId;
  if (!sId) continue;
  dedupBySource.set(sId, (dedupBySource.get(sId) || 0) + 1);
}

const retainedBySource = new Map();
for (const a of retainedArticles) {
  const sId = a.source_catalog_id || a.sourceId;
  if (!sId) continue;
  retainedBySource.set(sId, (retainedBySource.get(sId) || 0) + 1);
}

const metrics = loadedSources.map((s) => {
  const sourceCatalogId = s.source_id;
  const corpusId = s.corpus_id || null;
  const isError = failedSourceIds.has(sourceCatalogId);
  const querySucceeded = !isError;
  const itemsCollected = querySucceeded ? (collectedBySource.get(sourceCatalogId) || 0) : 0;
  const itemsAfterDedup = dedupBySource.get(sourceCatalogId) || 0;
  const itemsRetained = retainedBySource.get(sourceCatalogId) || 0;

  return {
    workspace_id: workspaceId,
    source_catalog_id: sourceCatalogId,
    corpus_id: corpusId,
    workflow_id: 'veille-hebdomadaire-kredo',
    workflow_run_key: runKey,
    usage_scope: 'news',
    company_id: null,
    query_succeeded: querySucceeded,
    items_collected: itemsCollected,
    items_after_dedup: itemsAfterDedup,
    items_retained: itemsRetained,
  };
});

if (metrics.length === 0) {
  return [];
}

return metrics.map((m) => ({ json: m }));
""".strip()


PREPARER_CALLBACK_OK_JS = f"""
const ctx = $('{CTX_NODE}').first().json;

const digestResp = $('Créer Digest').first().json;
const digest = Array.isArray(digestResp) ? digestResp[0] : digestResp;

const articles = $('{DIGEST_TAIL}').all()
  .map((i) => i.json)
  .filter((a) => a && a.id);

const dedup = $('Dédup + Filtre Récence + Préfiltre Qualité').first().json || {{}};

const callbackBody = {{
  n8nExecutionId: $execution.id,
  n8nWorkflowId: $workflow.id,
  runId: ctx.runId,
  phase: 1,
  resultType: '{RESULT_TYPE}',
  status: 'succeeded',
  contentJson: {{
    digestId: digest && digest.id ? digest.id : null,
    digestDate: ctx.digestDate,
    articlesCount: articles.length,
    candidatesCount: $('Dédup + Filtre Récence + Préfiltre Qualité').all().length,
    sourcesCount: dedup.sourcesContributrices != null ? dedup.sourcesContributrices : null,
  }},
  title: (digest && digest.titre_digest) ? digest.titre_digest : `Veille IA & Marché — ${{ctx.digestDate}}`,
}};

return [{{ json: {{ callbackUrl: ctx.callbackUrl, rawBody: JSON.stringify(callbackBody) }} }}];
""".strip()


PREPARER_CALLBACK_FAIL_JS = f"""
let ctx = {{}};
try {{ ctx = $('{CTX_NODE}').first().json || {{}}; }} catch (e) {{ ctx = {{}}; }}
// Declenchement programme (pas de runId) : rien a notifier.
if (!ctx.runId) return [];

const err = $input.first().json || {{}};
let errorMessage = 'Echec du workflow Veille IA & Marche';
if (err.error) {{
  errorMessage = typeof err.error === 'string' ? err.error : (err.error.message || JSON.stringify(err.error));
}} else if (err.message) {{
  errorMessage = err.message;
}}

const callbackBody = {{
  n8nExecutionId: $execution.id,
  n8nWorkflowId: $workflow.id,
  runId: ctx.runId,
  phase: 1,
  resultType: '{RESULT_TYPE}',
  status: 'failed',
  contentJson: {{}},
  errorMessage: String(errorMessage).slice(0, 1500),
}};

return [{{ json: {{ callbackUrl: ctx.callbackUrl, rawBody: JSON.stringify(callbackBody) }} }}];
""".strip()


def _supabase_credential(wf: dict):
    for n in wf["nodes"]:
        cred = (n.get("credentials") or {}).get("supabaseApi")
        if cred:
            return {"supabaseApi": cred}
    return {}


def build_new_nodes(wf: dict):
    hmac_params = lambda data_prop, value=None, binary=False: {
        "action": "hmac",
        "type": "SHA256",
        "dataPropertyName": data_prop,
        "secret": SECRET_PLACEHOLDER,
        "encoding": "hex",
        **({"binaryData": True, "binaryPropertyName": "data"} if binary else {"binaryData": False, "value": value}),
    }
    http_callback = lambda: {
        "method": "POST",
        "url": "={{ $json.callbackUrl }}",
        "sendHeaders": True,
        "headerParameters": {"parameters": [
            {"name": "Content-Type", "value": "application/json"},
            {"name": "x-kredo-signature", "value": "=sha256={{ $json.signature }}"},
        ]},
        "sendBody": True,
        "contentType": "raw",
        "rawContentType": "application/json",
        "body": "={{ $json.rawBody }}",
        "options": {"timeout": 20000},
    }

    return [
        node("Webhook Veille On-Demand", "n8n-nodes-base.webhook",
             {"httpMethod": "POST", "path": WEBHOOK_PATH, "authentication": "none",
              "responseMode": "onReceived", "options": {"rawBody": True, "responseCode": 202}},
             [3616, 1104], type_version=2, extra={"webhookId": WEBHOOK_PATH}),

        node("Vérifier Signature", "n8n-nodes-base.crypto",
             hmac_params("computedSignature", binary=True), [3872, 1104], type_version=1),

        node("Valider Signature & Payload", "n8n-nodes-base.code",
             {"jsCode": VALIDER_SIGNATURE_JS}, [4128, 1104], type_version=2),

        node("Contexte Déclenchement Programmé", "n8n-nodes-base.code",
             {"jsCode": CONTEXTE_CRON_JS}, [3872, 1328], type_version=2),

        node(CTX_NODE, "n8n-nodes-base.code",
             {"jsCode": RESOUDRE_CONTEXTE_JS}, [4128, 1216], type_version=2),

        node("Router Run Manuel", "n8n-nodes-base.if",
             {"conditions": {"options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                             "conditions": [{"id": "vod-if-runmanuel-0001",
                                             "leftValue": "={{ $json.triggerMode }}", "rightValue": "manual",
                                             "operator": {"type": "string", "operation": "equals"}}],
                             "combinator": "and"},
              "options": {}},
             [4384, 1040], type_version=2),

        node("Marquer Run Running", "n8n-nodes-base.httpRequest",
             {"method": "PATCH",
              "url": f"={SUPABASE_REST}/ai_intelligence_runs?id=eq.{{{{ $json.runId }}}}",
              "authentication": "predefinedCredentialType", "nodeCredentialType": "supabaseApi",
              "sendHeaders": True,
              "headerParameters": {"parameters": [{"name": "Prefer", "value": "return=minimal"}]},
              "sendBody": True, "specifyBody": "json",
              "jsonBody": "={{ { status: \"running\", started_at: new Date().toISOString() } }}",
              "options": {"timeout": 15000}},
             [4640, 1040], type_version=4.2,
              extra={"credentials": _supabase_credential(wf)}),

        node(ROUTER_SOURCES, "n8n-nodes-base.if",
             {"conditions": {"options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                             "conditions": [{"id": "vod-if-sources-v2",
                                             "leftValue": f"={{{{ $('{CTX_NODE}').first().json.schemaVersion }}}}",
                                             "rightValue": 2,
                                             "operator": {"type": "number", "operation": "equals"}}],
                             "combinator": "and"},
              "options": {}},
             [4896, 1152], type_version=2),

        node("Router Callback Digest", "n8n-nodes-base.if",
             {"conditions": {"options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                             "conditions": [{"id": "vod-if-cbdigest-0001",
                                             "leftValue": f"={{{{ $('{CTX_NODE}').first().json.triggerMode }}}}",
                                             "rightValue": "manual",
                                             "operator": {"type": "string", "operation": "equals"}}],
                             "combinator": "and"},
              "options": {}},
             [7680, 1536], type_version=2),

        node("Préparer Callback Digest", "n8n-nodes-base.code",
             {"jsCode": PREPARER_CALLBACK_OK_JS}, [7936, 1536], type_version=2),

        node("Signer Callback Digest", "n8n-nodes-base.crypto",
             hmac_params("signature", value="={{ $json.rawBody }}"), [8192, 1536], type_version=1),

        node("Envoyer Callback Digest", "n8n-nodes-base.httpRequest",
             http_callback(), [8448, 1536], type_version=4.2),

        node("Préparer Callback Échec", "n8n-nodes-base.code",
             {"jsCode": PREPARER_CALLBACK_FAIL_JS}, [7936, 1792], type_version=2),

        node("Signer Callback Échec", "n8n-nodes-base.crypto",
             hmac_params("signature", value="={{ $json.rawBody }}"), [8192, 1792], type_version=1),

        node("Envoyer Callback Échec", "n8n-nodes-base.httpRequest",
             http_callback(), [8448, 1792], type_version=4.2),
    ]


def patch(wf: dict) -> dict:
    names = {n["name"] for n in wf["nodes"]}

    for required in (SCHEDULE_NODE, PIPELINE_ENTRY, BUILD_CONTEXT, CHARGER_SOURCES,
                     VERIFIER_SOURCES, EXPLODE_SOURCES, IGNORER_ERREUR, RECUPERER_HASH,
                     CREER_DIGEST, DIGEST_TAIL, PREPARER_METRIQUES, ECRIRE_METRIQUES):
        if required not in names:
            raise SystemExit(f"Nœud d'ancrage introuvable : « {required} » — JSON réconcilié ?")

    wf["name"] = WORKFLOW_NAME

    # 1. Upsert des nœuds gérés (ajoute les manquants, met à niveau les existants)
    new_nodes = build_new_nodes(wf)
    node_map = {n["name"]: n for n in wf["nodes"]}
    for n in new_nodes:
        if n["name"] in node_map:
            # Met à niveau les paramètres sans dupliquer
            target = node_map[n["name"]]
            target["parameters"] = n["parameters"]
            target["typeVersion"] = n.get("typeVersion", target.get("typeVersion", 1))
        else:
            wf["nodes"].append(n)
            node_map[n["name"]] = n

    # 2. Mise à niveau des nœuds du socle
    node_map[BUILD_CONTEXT]["parameters"]["jsCode"] = BUILD_CONTEXTE_JS
    node_map[VERIFIER_SOURCES]["parameters"]["jsCode"] = VERIFIER_SOURCES_JS
    node_map[IGNORER_ERREUR]["parameters"]["jsCode"] = IGNORER_ERREUR_JS
    node_map[PREPARER_METRIQUES]["parameters"]["jsCode"] = PREPARER_METRIQUES_JS
    node_map[ECRIRE_METRIQUES]["continueOnFail"] = True

    # 3. Récupérer Hash Articles Vus : jointure sur veille_digests.topic_key
    recup_hash = node_map[RECUPERER_HASH]
    recup_hash["parameters"]["sendQuery"] = True
    recup_hash["parameters"]["queryParameters"] = {
        "parameters": [
            {"name": "select", "value": "url_hash,veille_digests!inner(topic_key)"},
            {"name": "veille_digests.topic_key", "value": f"=eq.{{{{ $('{CTX_NODE}').first().json.topicKey }}}}"},
            {"name": "created_at", "value": "=gte.{{ $now.minus({ days: 21 }).toISO() }}"},
        ]
    }

    # 4. Créer Digest : clé d'upsert à 3 colonnes et 4 champs ADR-0022
    creer_dig = node_map[CREER_DIGEST]
    creer_dig["parameters"]["url"] = f"{SUPABASE_REST}/veille_digests?on_conflict=workspace_id,digest_date,topic_key"
    creer_dig["parameters"]["jsonBody"] = (
        f"={{ {{ "
        f"workspace_id: $('{CTX_NODE}').first().json.workspaceId, "
        f"digest_date: $('{CTX_NODE}').first().json.digestDate, "
        f"topic_key: $('{CTX_NODE}').first().json.topicKey, "
        f"topic_sector_id: $('{CTX_NODE}').first().json.topicSectorId, "
        f"source_corpus_id: $('{CTX_NODE}').first().json.sourceCorpusId, "
        f"generation_mode: $('{CTX_NODE}').first().json.generationMode, "
        f"titre_digest: $json.titreDigest, "
        f"resume_hebdo: $json.resumeHebdo, "
        f"super_short_summary: $json.superShortSummary, "
        f"model_classement: 'claude-haiku-4-5-20251001', "
        f"model_analyse: 'claude-sonnet-5', "
        f"nb_candidats_evalues: $('Dédup + Filtre Récence + Préfiltre Qualité').all().length, "
        f"nb_sources_actives: $('Dédup + Filtre Récence + Préfiltre Qualité').first().json.sourcesContributrices "
        f"}} }}"
    )

    # 5. Câblage des connexions (idempotent, sans doublons)
    c = wf["connections"]

    def set_wire(src, dst_list, src_index=0):
        c.setdefault(src, {}).setdefault("main", [])
        while len(c[src]["main"]) <= src_index:
            c[src]["main"].append([])
        c[src]["main"][src_index] = [{"node": dst, "type": "main", "index": 0} for dst in dst_list]

    def add_wire(src, dst, src_index=0):
        c.setdefault(src, {}).setdefault("main", [])
        while len(c[src]["main"]) <= src_index:
            c[src]["main"].append([])
        if not any(conn.get("node") == dst for conn in c[src]["main"][src_index]):
            c[src]["main"][src_index].append({"node": dst, "type": "main", "index": 0})

    # Déclencheurs -> Résoudre Contexte
    set_wire(SCHEDULE_NODE, ["Contexte Déclenchement Programmé"])
    set_wire("Contexte Déclenchement Programmé", [CTX_NODE])
    set_wire("Webhook Veille On-Demand", ["Vérifier Signature"])
    set_wire("Vérifier Signature", ["Valider Signature & Payload"])
    set_wire("Valider Signature & Payload", [CTX_NODE])

    # Résoudre Contexte -> pipeline + router run manuel
    set_wire(CTX_NODE, [PIPELINE_ENTRY, "Router Run Manuel"])
    set_wire("Router Run Manuel", ["Marquer Run Running"], src_index=0)  # true

    # Pipeline amont -> Router Résolution Sources
    set_wire(PIPELINE_ENTRY, [BUILD_CONTEXT])
    set_wire(BUILD_CONTEXT, [ROUTER_SOURCES])

    # Router Résolution Sources :
    # output 0 (true, V2) -> Vérifier et Normaliser Sources
    # output 1 (false, V1 / cron) -> Charger Sources Effectives (Supabase)
    set_wire(ROUTER_SOURCES, [VERIFIER_SOURCES], src_index=0)
    set_wire(ROUTER_SOURCES, [CHARGER_SOURCES], src_index=1)

    # Charger Sources Effectives -> Vérifier et Normaliser Sources
    set_wire(CHARGER_SOURCES, [VERIFIER_SOURCES])

    # Vérifier et Normaliser Sources -> Explode Sources
    set_wire(VERIFIER_SOURCES, [EXPLODE_SOURCES])

    # Callback succès
    add_wire(DIGEST_TAIL, "Router Callback Digest")
    set_wire("Router Callback Digest", ["Préparer Callback Digest"], src_index=0)
    set_wire("Préparer Callback Digest", ["Signer Callback Digest"])
    set_wire("Signer Callback Digest", ["Envoyer Callback Digest"])

    # Callback échec sur nœuds sensibles
    for guarded in FAILURE_GUARDED:
        if guarded in node_map:
            node_map[guarded]["onError"] = "continueErrorOutput"
            c.setdefault(guarded, {}).setdefault("main", [[]])
            while len(c[guarded]["main"]) < 2:
                c[guarded]["main"].append([])
            if not any(conn.get("node") == "Préparer Callback Échec" for conn in c[guarded]["main"][1]):
                c[guarded]["main"][1].append({"node": "Préparer Callback Échec", "type": "main", "index": 0})

    set_wire("Préparer Callback Échec", ["Signer Callback Échec"])
    set_wire("Signer Callback Échec", ["Envoyer Callback Échec"])

    return wf


def is_v2_ready(wf: dict) -> bool:
    names = {n["name"] for n in wf["nodes"]}
    if "Webhook Veille On-Demand" not in names:
        return False
    if ROUTER_SOURCES not in names:
        return False

    node_map = {n["name"]: n for n in wf["nodes"]}

    creer_dig = node_map.get(CREER_DIGEST)
    if not creer_dig or "on_conflict=workspace_id,digest_date,topic_key" not in creer_dig.get("parameters", {}).get("url", ""):
        return False

    recup_hash = node_map.get(RECUPERER_HASH)
    if not recup_hash or "veille_digests!inner(topic_key)" not in json.dumps(recup_hash.get("parameters", {})):
        return False

    valider = node_map.get("Valider Signature & Payload")
    if not valider or "schemaVersion === 2" not in valider.get("parameters", {}).get("jsCode", ""):
        return False

    return True


def main() -> int:
    check_only = "--check" in sys.argv
    wf = json.loads(WF_PATH.read_text(encoding="utf-8"))
    ready = is_v2_ready(wf)

    if check_only:
        if ready:
            print("OK — workflow V2 prêt (webhook, routage V1/V2, dédup par topic, upsert 3 colonnes).")
            return 0
        print("MANQUANT — le workflow n'est pas encore au niveau V2 attendu. Lancer : python3 scripts/patch-veille-on-demand.py")
        return 1

    patched = patch(wf)
    WF_PATH.write_text(json.dumps(patched, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Patché / Mis à niveau V2 : {WF_PATH.relative_to(ROOT)} ({len(patched['nodes'])} nœuds, name='{patched['name']}')")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

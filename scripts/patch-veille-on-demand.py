#!/usr/bin/env python3
"""
Patch `n8n/workflows/veille-hebdomadaire-kredo.json` pour lui ajouter un
DEUXIÈME déclencheur — un webhook `veille-ia-marche-on-demand` — SANS dupliquer
le pipeline métier (collecte → classement → analyse → digest).

Après patch, le workflow (renommé « KREDO — Veille IA & Marché ») porte :
  - le `scheduleTrigger` cron `0 6 * * 1` existant (inchangé) ;
  - un `webhook` POST /webhook/veille-ia-marche-on-demand, vérification HMAC
    `X-KREDO-Signature`, contrat de gateway KREDO standard ;
  - un nœud commun `Résoudre Contexte Déclenchement` : source de vérité de
    `workspaceId` / `runId` / `callbackUrl` / `digestDate` pour tout l'aval —
    le mode manuel prend `workspaceId` DANS LE PAYLOAD (jamais la constante) ;
  - cycle de vie du run : `Marquer Run Running` au départ, callback signé
    `succeeded` (resultType `watch_digest_generation`, phase 1) en fin, et
    callback signé `failed` sur erreur des nœuds LLM / écriture digest.

IDEMPOTENT : relancer ne fait rien si le webhook est déjà présent.
STRUCTUREL : repérage par nom de nœud — survit à la dérive du milieu de chaîne.
À REJOUER contre le JSON réconcilié avec le VPS (cf. SETUP §Import).

Usage :
    python3 scripts/patch-veille-on-demand.py
    python3 scripts/patch-veille-on-demand.py --check   # n'écrit rien, code retour 1 si patch manquant
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
# Mono-workspace : utilisé UNIQUEMENT par la branche cron (le mode manuel lit le payload).
CRON_WORKSPACE_ID = "98dcd39d-f87b-4f9d-add9-ce76d635953a"
SUPABASE_REST = "https://jvzgmhvwirsbdkjpmvla.supabase.co/rest/v1"

SCHEDULE_NODE = "Lundi 6h Europe Paris"
PIPELINE_ENTRY = "Récupérer Secteurs Actifs"
BUILD_CONTEXT = "Build Contexte KREDO"
DIGEST_TAIL = "Remplacer Articles Digest (RPC)"
CTX_NODE = "Résoudre Contexte Déclenchement"

# Nœuds dont une erreur doit produire un callback `failed` (les plus probables).
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
if (input.schemaVersion !== 1 || input.triggerMode !== 'manual') {{
  throw new Error('input doit valoir {{ schemaVersion: 1, triggerMode: "manual" }}');
}}

return [{{
  json: {{
    __trigger: 'webhook',
    runId: body.runId,
    workspaceId: body.workspaceId,
    userId: body.userId,
    callbackUrl: body.callbackUrl,
    triggerMode: 'manual',
  }}
}}];
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
  }}
}}];
""".strip()


RESOUDRE_CONTEXTE_JS = """
// Nœud COMMUN aux deux declencheurs : source de verite unique pour tout l'aval.
// Un seul declencheur s'execute par run, donc un seul item arrive ici.
const src = $input.first().json || {};
const isWebhook = src.__trigger === 'webhook';

return [{
  json: {
    triggerMode: isWebhook ? 'manual' : 'scheduled',
    runId: isWebhook ? (src.runId || null) : null,
    workspaceId: src.workspaceId,
    userId: isWebhook ? (src.userId || null) : null,
    callbackUrl: isWebhook ? (src.callbackUrl || null) : null,
    digestDate: new Date().toISOString().slice(0, 10),
  }
}];
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
    """Réutilise l'ID de credential `supabaseApi` déjà câblé sur un nœud existant,
    pour que `Marquer Run Running` se lie automatiquement à l'import (comme les
    autres nœuds Supabase) au lieu d'exiger une sélection manuelle."""
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


def conn(node_name, target, index=0):
    return {"node_name": node_name, "target": target, "index": index}


def patch(wf: dict) -> dict:
    names = {n["name"] for n in wf["nodes"]}
    if "Webhook Veille On-Demand" in names:
        return wf  # déjà patché

    for required in (SCHEDULE_NODE, PIPELINE_ENTRY, BUILD_CONTEXT, DIGEST_TAIL):
        if required not in names:
            raise SystemExit(f"Nœud d'ancrage introuvable : « {required} » — JSON réconcilié ?")

    wf["name"] = WORKFLOW_NAME
    wf["nodes"].extend(build_new_nodes(wf))

    c = wf["connections"]

    def wire(src, dst, src_index=0):
        c.setdefault(src, {}).setdefault("main", [])
        while len(c[src]["main"]) <= src_index:
            c[src]["main"].append([])
        c[src]["main"][src_index].append({"node": dst, "type": "main", "index": 0})

    # ── Entrée : les deux déclencheurs convergent vers `Résoudre Contexte` ──
    c[SCHEDULE_NODE] = {"main": [[{"node": "Contexte Déclenchement Programmé", "type": "main", "index": 0}]]}
    wire("Contexte Déclenchement Programmé", CTX_NODE)
    wire("Webhook Veille On-Demand", "Vérifier Signature")
    wire("Vérifier Signature", "Valider Signature & Payload")
    wire("Valider Signature & Payload", CTX_NODE)

    # ── `Résoudre Contexte` alimente le pipeline + la branche cycle de vie ──
    wire(CTX_NODE, PIPELINE_ENTRY)
    wire(CTX_NODE, "Router Run Manuel")
    wire("Router Run Manuel", "Marquer Run Running", src_index=0)  # sortie "true"

    # ── Fin de pipeline : callback succès ──
    c.setdefault(DIGEST_TAIL, {}).setdefault("main", [[]])
    if not c[DIGEST_TAIL]["main"]:
        c[DIGEST_TAIL]["main"] = [[]]
    c[DIGEST_TAIL]["main"][0].append({"node": "Router Callback Digest", "type": "main", "index": 0})
    wire("Router Callback Digest", "Préparer Callback Digest", src_index=0)  # sortie "true"
    wire("Préparer Callback Digest", "Signer Callback Digest")
    wire("Signer Callback Digest", "Envoyer Callback Digest")

    # ── Callback échec : sortie d'erreur des nœuds sensibles ──
    for guarded in FAILURE_GUARDED:
        if guarded not in names:
            continue
        target_node = next(n for n in wf["nodes"] if n["name"] == guarded)
        target_node["onError"] = "continueErrorOutput"
        c.setdefault(guarded, {}).setdefault("main", [[]])
        while len(c[guarded]["main"]) < 2:
            c[guarded]["main"].append([])
        c[guarded]["main"][1].append({"node": "Préparer Callback Échec", "type": "main", "index": 0})
    wire("Préparer Callback Échec", "Signer Callback Échec")
    wire("Signer Callback Échec", "Envoyer Callback Échec")

    # ── `Build Contexte KREDO` : workspace/date depuis le nœud commun ──
    bc = next(n for n in wf["nodes"] if n["name"] == BUILD_CONTEXT)
    js = bc["parameters"]["jsCode"]
    js = js.replace(
        f"workspaceId: '{CRON_WORKSPACE_ID}',",
        f"workspaceId: $('{CTX_NODE}').first().json.workspaceId,",
    ).replace(
        "digestDate: new Date().toISOString().slice(0, 10),",
        f"digestDate: $('{CTX_NODE}').first().json.digestDate,",
    )
    if CRON_WORKSPACE_ID in js:
        raise SystemExit("Échec du remplacement du workspace en dur dans Build Contexte KREDO")
    bc["parameters"]["jsCode"] = js

    return wf


def main() -> int:
    check_only = "--check" in sys.argv
    wf = json.loads(WF_PATH.read_text(encoding="utf-8"))
    already = any(n["name"] == "Webhook Veille On-Demand" for n in wf["nodes"])

    if check_only:
        if already:
            print("OK — patch déjà appliqué.")
            return 0
        print("MANQUANT — le patch webhook n'est pas appliqué. Lancer : python3 scripts/patch-veille-on-demand.py")
        return 1

    if already:
        print("Rien à faire — patch déjà appliqué.")
        return 0

    patched = patch(wf)
    WF_PATH.write_text(json.dumps(patched, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Patché : {WF_PATH.relative_to(ROOT)} ({len(patched['nodes'])} nœuds, name='{patched['name']}')")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

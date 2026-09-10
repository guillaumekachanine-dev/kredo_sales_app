#!/usr/bin/env python3
"""Lot 0.7 — INTEL-030 V4 devient un pur CONSOMMATEUR de corpus.

La branche V4 ne découvre ni ne récupère plus rien. INTEL-035 constitue le corpus,
l'utilisateur le valide, et V4 se contente de lire les documents approuvés.

Ce que ça règle, et qui ne se règle pas autrement :

  * **Le plafond d'exécution.** Les runs V4 réussis mesuraient 404-425 s contre un
    task runner n8n qui coupe à 300 s ; deux runs sont morts exactement là. Le fetch
    (12 recherches SerpAPI puis 6 requêtes HTTP parallèles) était le poste lourd. Sorti
    du run d'analyse, il repasse largement sous le plafond — ce qui débloque L3 et L4.

  * **Le mode dégradé silencieux.** V4 ne peut plus produire un rapport en ayant lu
    zéro page : il n'a plus la capacité de lire. Soit le corpus contient des documents,
    soit `research_status` vaut honnêtement `internal_only`.

Retirés   : V4 Build SerpAPI Requests · V4 SerpAPI Search · V4 Normalize SerpAPI
            Discovery · V4 Fetch Selected Pages
Ajoutés   : V4 Load Source Documents (httpRequest) · V4 Normalize Source Documents (Code)
Modifiés  : Validate Entity (accepte sourceDocumentIds/sourcePolicy)
            V4 Build Source Catalogue (lit le nouveau nœud amont)
            V4 Prepare Callback (diagnostics de corpus au lieu de diagnostics de fetch)

    python3 scripts/patch-intel-030-consume-source-plan.py
"""

from __future__ import annotations

import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
TARGET = ROOT / "n8n" / "workflows" / "intel-030-account-knowledge.json"
SUPABASE_URL = "https://jvzgmhvwirsbdkjpmvla.supabase.co"
SUPABASE_CRED = {"supabaseApi": {"id": "GBrm2aWU0dDf85QS", "name": "Supabase_Service_Role_KREDO"}}

REMOVED = [
    "V4 Build SerpAPI Requests",
    "V4 SerpAPI Search",
    "V4 Normalize SerpAPI Discovery",
    "V4 Fetch Selected Pages",
]

# UUID sentinelle : PostgREST refuse `id=in.()`. Plutôt qu'un branchement IF — dont le
# mode d'échec « zéro item coupe la chaîne » est déjà documenté sur ce workflow — on
# interroge une valeur qui ne matche jamais. Le nœud rend alors [] sans erreur.
SENTINEL = "00000000-0000-0000-0000-000000000000"

NORMALIZE_DOCUMENTS = r"""
// Lot 0.7 — les documents viennent du corpus approuvé, jamais d'un fetch.
//
// On reconstruit ici EXACTEMENT la forme `fetchedPages` que `V4 Build Source Catalogue`
// consommait auparavant ({ link, title, text, consulted_at }). Le nœud aval reste donc
// inchangé dans sa logique : seule la provenance de la matière change.
const requested = $('Validate Entity').first().json.sourceDocumentIds || [];
const upstream = $('V4 Resolve Entity').first().json;

const rows = $input.all()
  .map((item) => item.json)
  .filter((row) => row && row.id && row.status === 'retrieved' && row.extracted_text);

const fetchedPages = rows.map((row) => ({
  link: row.canonical_url || row.url,
  title: row.title || row.url,
  text: row.extracted_text,
  consulted_at: row.fetched_at,
  document_id: row.id,
  kind: row.kind,
  serves_modules: row.serves_modules || [],
}));

// `selectedPages` conserve sa sémantique pour `V4 Parse & Guard` : ce qui était CENSÉ
// être lu. La distinction avec `fetchedPages` est ce qui permet de distinguer
// `degraded` (on attendait des documents, on n'en a aucun) de `internal_only`
// (on n'en attendait aucun) — les confondre est ce qui rendait le défaut invisible.
const selectedPages = requested.map((id) => ({ document_id: id }));

const missing = requested.filter((id) => !rows.some((row) => row.id === id));

return [{ json: {
  ...upstream,
  fetchedPages,
  selectedPages,
  fetchFailures: [],
  discovery: [],
  corpusDiagnostics: {
    requested: requested.length,
    loaded: fetchedPages.length,
    // Un document approuvé introuvable en base est une anomalie de cohérence, pas un
    // échec de collecte : il est tracé, jamais silencieux.
    missing,
    sourcePolicy: $('Validate Entity').first().json.sourcePolicy || 'approved_only',
  },
} }];
"""


def patch_validate_entity(code: str) -> str:
    old = """// Lot correctif V3 (remediation volume) — sujets inclus demandes par l'UI"""
    new = """// Lot 0.7 — corpus approuvé. V4 ne découvre ni ne récupère plus rien : il consomme
// les documents que l'utilisateur a validés dans le plan produit par INTEL-035.
// Une liste vide n'est PAS une erreur : c'est une analyse sur base interne seule,
// que l'artefact déclarera honnêtement en `research_status: internal_only`.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const rawSourceDocumentIds = body.input?.sourceDocumentIds;
const sourceDocumentIds = Array.isArray(rawSourceDocumentIds)
  ? Array.from(new Set(rawSourceDocumentIds.filter((id) => UUID_RE.test(String(id))))).slice(0, 40)
  : [];
const sourcePolicy = body.input?.sourcePolicy === 'allow_gap_discovery'
  ? 'allow_gap_discovery'
  : 'approved_only';

// Lot correctif V3 (remediation volume) — sujets inclus demandes par l'UI"""
    assert old in code
    code = code.replace(old, new, 1)

    old = """    accountKnowledgeSchemaVersion,
    includedSubjects,
  }
}];"""
    new = """    accountKnowledgeSchemaVersion,
    includedSubjects,
    sourceDocumentIds,
    sourcePolicy,
  }
}];"""
    assert old in code
    return code.replace(old, new, 1)


def patch_catalogue(code: str) -> str:
    old = """try { namedInput = $('V4 Fetch Selected Pages').first().json || {}; } catch (_) {}"""
    new = """try { namedInput = $('V4 Normalize Source Documents').first().json || {}; } catch (_) {}"""
    assert old in code
    return code.replace(old, new, 1)


def patch_prepare_callback(code: str) -> str:
    old = """const discoveryCount = Array.isArray(data.discovery) ? data.discovery.reduce((n, s) => n + ((s && s.organic) || []).length, 0) : 0;"""
    new = """// Lot 0.7 — plus aucune découverte dans ce workflow. Le compteur est conservé à zéro
// pour ne pas casser les consommateurs du contextSnapshot, et les diagnostics utiles
// sont désormais ceux du CORPUS, pas ceux d'un fetch qui n'a plus lieu ici.
const discoveryCount = 0;
const corpusDiagnostics = data.corpusDiagnostics || null;"""
    assert old in code
    code = code.replace(old, new, 1)

    old = """    urlSelectionDiagnostics: data.urlSelectionDiagnostics || null,"""
    new = """    urlSelectionDiagnostics: null,
    corpusDiagnostics,
    sourcePolicy: data.sourcePolicy || 'approved_only',"""
    assert old in code
    code = code.replace(old, new, 1)

    old = """    externalResearchStatus: data.externalResearchStatus || (discoveryCount > 0 && fetchedPages.length === 0 ? 'external_research_degraded' : 'nominal'),"""
    new = """    externalResearchStatus: fetchedPages.length > 0
      ? 'nominal'
      : (selectedPages.length > 0 ? 'external_research_degraded' : 'internal_only'),"""
    assert old in code
    return code.replace(old, new, 1)


def main() -> int:
    workflow = json.loads(TARGET.read_text(encoding="utf-8"))
    nodes = {node["name"]: node for node in workflow["nodes"]}

    for name in REMOVED:
        if name not in nodes:
            print(f"Déjà retiré : {name}")
    workflow["nodes"] = [node for node in workflow["nodes"] if node["name"] not in REMOVED]

    # ── Nœuds de lecture du corpus ──────────────────────────────────────────
    load_node = {
        "parameters": {
            "method": "GET",
            "url": (
                f"={SUPABASE_URL}/rest/v1/account_source_documents"
                "?select=id,url,canonical_url,title,kind,serves_modules,status,fetched_at,extracted_text"
                "&status=eq.retrieved"
                "&id=in.({{ ($('Validate Entity').first().json.sourceDocumentIds || []).length > 0"
                f" ? $('Validate Entity').first().json.sourceDocumentIds.join(',') : '{SENTINEL}' }}}})"
                "&workspace_id=eq.{{ $('Validate Entity').first().json.workspaceId }}"
            ),
            "options": {"timeout": 30000},
            "authentication": "predefinedCredentialType",
            "nodeCredentialType": "supabaseApi",
        },
        "id": "v4-load-source-documents",
        "name": "V4 Load Source Documents",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [1180, -140],
        "credentials": SUPABASE_CRED,
        "alwaysOutputData": True,
        "onError": "continueErrorOutput",
    }

    normalize_node = {
        "parameters": {"jsCode": NORMALIZE_DOCUMENTS.strip("\n")},
        "id": "v4-normalize-source-documents",
        "name": "V4 Normalize Source Documents",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [1380, -140],
        "onError": "continueErrorOutput",
    }

    anchor = next(i for i, n in enumerate(workflow["nodes"]) if n["name"] == "V4 Build Source Catalogue")
    workflow["nodes"][anchor:anchor] = [load_node, normalize_node]

    # ── Code patché ─────────────────────────────────────────────────────────
    nodes = {node["name"]: node for node in workflow["nodes"]}
    nodes["Validate Entity"]["parameters"]["jsCode"] = patch_validate_entity(
        nodes["Validate Entity"]["parameters"]["jsCode"]
    )
    nodes["V4 Build Source Catalogue"]["parameters"]["jsCode"] = patch_catalogue(
        nodes["V4 Build Source Catalogue"]["parameters"]["jsCode"]
    )
    nodes["V4 Prepare Callback"]["parameters"]["jsCode"] = patch_prepare_callback(
        nodes["V4 Prepare Callback"]["parameters"]["jsCode"]
    )

    # ── Recâblage ───────────────────────────────────────────────────────────
    connections = workflow["connections"]
    for name in REMOVED:
        connections.pop(name, None)

    def to(target: str) -> dict:
        return {"main": [
            [{"node": target, "type": "main", "index": 0}],
            [{"node": "Prepare Failure Callback", "type": "main", "index": 0}],
        ]}

    connections["V4 Resolve Entity"] = to("V4 Load Source Documents")
    connections["V4 Load Source Documents"] = to("V4 Normalize Source Documents")
    connections["V4 Normalize Source Documents"] = to("V4 Build Source Catalogue")

    TARGET.write_text(json.dumps(workflow, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # ── Contrôles ───────────────────────────────────────────────────────────
    blob = json.dumps(workflow, ensure_ascii=False)
    assert "serpapi.com" not in blob.lower(), "Une référence SerpAPI subsiste dans le workflow"
    assert not any(n["name"] in REMOVED for n in workflow["nodes"])

    failures = 0
    for node in workflow["nodes"]:
        if node["type"] != "n8n-nodes-base.code":
            continue
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as handle:
            handle.write("(async () => {\n" + node["parameters"]["jsCode"] + "\n})()")
            path = handle.name
        result = subprocess.run(["node", "--check", path], capture_output=True, text=True)
        if result.returncode != 0:
            failures += 1
            print(f"SYNTAXE KO — {node['name']}\n{result.stderr}", file=sys.stderr)

    print(f"Retirés : {', '.join(REMOVED)}")
    print("Ajoutés : V4 Load Source Documents, V4 Normalize Source Documents")
    print(f"{len(workflow['nodes'])} nœuds au total · {failures} erreur(s) de syntaxe")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())

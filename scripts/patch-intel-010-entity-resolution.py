#!/usr/bin/env python3
"""Lot 1 (suite) — pose la résolution d'entité dans intel-010-refresh-account-infos.

`intel-010` porte le même défaut que `intel-030` et produit six fois plus de
propositions d'identité (124 runs contre 18). Son nœud `Resolve Entity` scorait déjà
les candidats (Jaccard sur les tokens + bonus de localisation), mais :

  - une seule requête, `per_page=5` — la bonne entité peut être hors du champ ;
  - le bonus de localisation vaut 0 ou +0,25, **jamais une pénalité** : un candidat
    situé dans le mauvais département n'était pas écarté, seulement moins récompensé.
    C'est ainsi que « D-Orbit » (spatial) a été résolu en `ORBIT`, SIREN 400276754,
    NAF 56.10C, restauration parisienne — sur le seul nom ;
  - aucun contrôle d'activité (section NAF vs secteur KREDO) ni d'état administratif ;
  - `selectedSiren` court-circuitait **tout** contrôle : le compte « MMV » a reçu
    l'identité de « DEPIL TECH » — un autre compte du CRM — parce qu'un humain avait
    confirmé ce SIREN dans une liste rendue sans score.

Modifications, aucune modification de topologie :

  1. `Search Legal Registry` : `per_page` 5 → 10.
  2. `Resolve Entity` : scoring remplacé par la transcription partagée de
     `src/lib/intelligence/entity-resolution.ts`, avec des requêtes supplémentaires
     sur les variantes de raison sociale. `selectedSiren` reste souverain — un humain
     a tranché — mais une contradiction produit désormais un **avertissement** visible
     dans le résultat de scan au lieu d'un silence.

Le contrat de sortie (`resolution.status` / `siren` / `matchMethod` / `candidates`)
est inchangé : `needs_human_confirmation` se projette sur `ambiguous`, qui est déjà
un état produit géré par l'interface (`AccountScanDialog` phase `information_ambiguous`).

    python3 scripts/patch-intel-010-entity-resolution.py
"""

from __future__ import annotations

import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / "n8n" / "workflows" / "INTEL-010 — intel-010-refresh-account-infos.json"
SHARED_HELPERS = ROOT / "scripts" / "entity-resolution-node.js"

RESOLVE_ENTITY_BODY = r"""
// ── Résolution d'entité légale ──────────────────────────────────────────────
// Le scoring d'origine (Jaccard + bonus de localisation) ne pénalisait jamais une
// géographie incompatible et ignorait l'activité : « D-Orbit » a été résolu en
// `ORBIT` (SIREN 400276754, NAF 56.10C, restauration, Paris) sur le seul nom.
const account = {
  name: ctx.knownCompany.name || ctx.company.name,
  legalName: ctx.knownCompany.legalName || ctx.company.legal_name,
  hqLocation: ctx.locationHint || ctx.company.hq_location,
  sector: ctx.company.sector,
  employeeCount: (typeof ctx.company.employee_count === 'number') ? ctx.company.employee_count : null,
  knownSiren: null,
  knownNafCode: ctx.knownCompany.nafCode || ctx.company.naf_code || null,
};

function toOutputCandidate(scored) {
  const c = scored.candidate;
  return {
    siren: c.siren,
    legalName: c.legalName || c.siren,
    nafCode: c.nafCode,
    hqLocation: [c.hqPostalCode, c.hqCommune].filter(Boolean).join(' ') || null,
    matchScore: Math.round(Math.max(0, Math.min(1, scored.score / 8)) * 1000) / 1000,
    coherent: scored.blockers.length === 0 && !scored.signals.some((s) => ['geography', 'known_naf', 'activity_section'].indexOf(s.key) !== -1 && s.value <= -0.5),
    reason: (scored.signals.filter((s) => s.value < 0).map((s) => s.detail)[0]) || null,
  };
}

// Candidats : la réponse déjà obtenue, complétée par les variantes de raison sociale.
const bySiren = new Map();
for (const raw of results) { const c = erNormalizeResult(raw); if (c && !bySiren.has(c.siren)) bySiren.set(c.siren, c); }

if (!hadError && !ctx.selectedSiren) {
  const queries = [];
  for (const v of erVariants(account.legalName, account.name)) {
    if (queries.length < 3 && queries.indexOf(v) === -1) queries.push(v);
  }
  for (const query of queries) {
    if (bySiren.size >= 20) break;
    try {
      const data = await this.helpers.httpRequest({
        method: 'GET',
        url: 'https://recherche-entreprises.api.gouv.fr/search?q=' + encodeURIComponent(query) + '&per_page=' + REGISTRY_PER_PAGE + '&page=1',
        json: true,
        timeout: 10000,
      });
      const extra = Array.isArray(data && data.results) ? data.results : [];
      for (const raw of extra) { const c = erNormalizeResult(raw); if (c && !bySiren.has(c.siren)) bySiren.set(c.siren, c); }
    } catch (e) {
      warnings.push('Requête registre « ' + query + ' » en échec.');
    }
  }
}
const allCandidates = Array.from(bySiren.values());

let resolution;

if (hadError) {
  warnings.push('Le registre officiel (recherche-entreprises.api.gouv.fr) était indisponible pendant ce scan.');
  resolution = { status: 'not_found', siren: null, matchMethod: null, candidates: [] };
} else if (ctx.selectedSiren) {
  // Un humain a tranché : son choix est souverain. Mais il a pu se tromper — le
  // compte MMV a reçu l'identité de « DEPIL TECH » par ce chemin. On contrôle donc
  // la cohérence et on la dit, sans bloquer.
  const exact = allCandidates.filter((c) => erSiren(c.siren) === erSiren(ctx.selectedSiren))[0];
  if (exact) {
    const scored = erScoreCandidate(account, exact);
    const contradictions = scored.signals
      .filter((s) => ['geography', 'known_naf', 'activity_section'].indexOf(s.key) !== -1 && s.value <= -0.5)
      .map((s) => s.detail);
    if (scored.nameScore < RESOLVED_MIN_NAME_SCORE) {
      contradictions.push("La raison sociale de l'entité choisie s'éloigne de celle du compte (" + scored.nameScore.toFixed(2) + ').');
    }
    for (const detail of scored.blockers) contradictions.push(detail);
    if (contradictions.length > 0) {
      warnings.push(
        'Entité confirmée manuellement (SIREN ' + ctx.selectedSiren + ' — ' + (exact.legalName || '?') +
        ') malgré des signaux contradictoires : ' + contradictions.join(' ')
      );
    }
  }
  resolution = {
    status: 'resolved',
    siren: ctx.selectedSiren,
    matchMethod: 'selected_siren',
    candidates: [],
    _winner: exact || { siren: ctx.selectedSiren, legalName: ctx.knownCompany.legalName || ctx.company.legal_name || ctx.company.name, nafCode: null, hqLocation: null, employeeCountEstimate: null, raw: null },
  };
} else {
  const resolved = erResolve(account, allCandidates);
  if (resolved.decision === 'resolved' && resolved.chosen) {
    const c = resolved.chosen;
    resolution = {
      status: 'resolved',
      siren: c.siren,
      matchMethod: 'name_location_match',
      candidates: [],
      _winner: {
        siren: c.siren,
        legalName: c.legalName || c.siren,
        nafCode: c.nafCode ? String(c.nafCode).toUpperCase().replace(/\./g, '') : null,
        hqLocation: [c.hqAddress, c.hqPostalCode, c.hqCommune].filter(Boolean).join(', ') || null,
        employeeCountEstimate: Object.prototype.hasOwnProperty.call(TRANCHE_MIDPOINT, String(c.employeeTrancheCode || '')) ? TRANCHE_MIDPOINT[String(c.employeeTrancheCode)] : null,
        raw: null,
      },
    };
  } else {
    const shortlist = (resolved.candidates || []).map(toOutputCandidate);
    if (shortlist.length === 0) {
      resolution = { status: 'not_found', siren: null, matchMethod: null, candidates: [] };
    } else {
      warnings.push("Entité juridique non tranchée automatiquement : " + resolved.reasons.join(' '));
      resolution = { status: 'ambiguous', siren: null, matchMethod: null, candidates: shortlist };
    }
  }
}
"""


def build_resolve_entity_code() -> str:
    helpers = SHARED_HELPERS.read_text(encoding="utf-8")
    # Le fichier partagé porte son propre en-tête de documentation : on ne garde que
    # le code, l'en-tête du nœud est écrit ici.
    helpers = helpers[helpers.index("const LEGAL_FORM_TOKENS"):].rstrip()

    return "\n".join([
        "// INTEL-010 — résolution de l'entité légale du compte scanné.",
        "//",
        "// Le bloc de helpers ci-dessous est la transcription de",
        "// `src/lib/intelligence/entity-resolution.ts` (source de vérité, testée). Il est",
        "// partagé mot pour mot avec `intel-030-account-knowledge` via",
        "// `scripts/entity-resolution-node.js` : toute évolution passe par le module",
        "// TypeScript, puis par les scripts de patch.",
        "const ctx = $('Build Scan Plan').first().json;",
        "const registryResponse = $input.first().json;",
        "",
        "const hadError = !!(registryResponse && registryResponse.error);",
        "const results = (!hadError && registryResponse && Array.isArray(registryResponse.results)) ? registryResponse.results : [];",
        "const warnings = [];",
        "",
        helpers,
        RESOLVE_ENTITY_BODY,
        "",
        "return [{",
        "  json: {",
        "    ...ctx,",
        "    resolution: {",
        "      status: resolution.status,",
        "      siren: resolution.siren || null,",
        "      matchMethod: resolution.matchMethod || null,",
        "      candidates: resolution.candidates || [],",
        "    },",
        "    resolutionWinner: resolution._winner || null,",
        "    warnings,",
        "  }",
        "}];",
        "",
    ])


def patch_registry_fetch(workflow: dict) -> None:
    for node in workflow["nodes"]:
        if node["name"] != "Search Legal Registry":
            continue
        url = node["parameters"]["url"]
        if "per_page=5" not in url:
            raise SystemExit("Search Legal Registry : per_page=5 introuvable, workflow déjà patché ?")
        node["parameters"]["url"] = url.replace("per_page=5", "per_page=10")
        return
    raise SystemExit("Nœud « Search Legal Registry » introuvable")


def patch_resolve_entity(workflow: dict) -> None:
    for node in workflow["nodes"]:
        if node["name"] != "Resolve Entity":
            continue
        node["parameters"]["jsCode"] = build_resolve_entity_code()
        return
    raise SystemExit("Nœud « Resolve Entity » introuvable")


def check_syntax(workflow: dict) -> None:
    for node in workflow["nodes"]:
        if node["name"] != "Resolve Entity":
            continue
        wrapped = "(async () => {\n" + node["parameters"]["jsCode"] + "\n})();"
        with tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False, encoding="utf-8") as handle:
            handle.write(wrapped)
            path = handle.name
        result = subprocess.run(["node", "--check", path], capture_output=True, text=True)
        if result.returncode != 0:
            sys.stderr.write(f"Syntaxe invalide dans « Resolve Entity » :\n{result.stderr}\n")
            raise SystemExit(1)
        print(f"  node --check OK — Resolve Entity ({len(node['parameters']['jsCode'])} caractères)")


def main() -> None:
    workflow = json.loads(WORKFLOW.read_text(encoding="utf-8"))
    patch_registry_fetch(workflow)
    patch_resolve_entity(workflow)
    check_syntax(workflow)
    WORKFLOW.write_text(json.dumps(workflow, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Écrit : {WORKFLOW.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

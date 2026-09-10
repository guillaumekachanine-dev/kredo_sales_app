#!/usr/bin/env python3
"""Génère `n8n/workflows/intel-035-account-source-preflight.json`.

INTEL-035 — preflight de sources d'Account Intelligence (corpus, document 05).

Le workflow ne propose QUE ce qu'il a réellement lu. Il découvre, récupère, extrait,
et transmet à l'application, qui écrit `account_source_documents` et publie le plan.
Aucune écriture directe en base par le workflow : la doctrine ADR-0020 place le métier
en TypeScript et n8n en exécuteur.

Deux blocs sont RÉUTILISÉS, jamais recopiés à la main :

  * la résolution d'entité déterministe (`scripts/entity-resolution-node.js`), source
    de vérité transcrite de `src/lib/intelligence/entity-resolution.ts`. C'est
    l'axiome A1 : mieux vaut une étude partielle de la bonne entreprise qu'une étude
    parfaite d'un homonyme ;
  * le garde SSRF `parseUrl` (`scripts/url-guard-node.js`), durci et testé (IPv4
    privées, .local/.internal, moteurs de recherche, aucun recours au global `URL`).

Les extraire à l'exécution plutôt que les dupliquer garantit qu'ils ne divergent
jamais ; le harnais asserte cette identité.

    python3 scripts/build-intel-035.py
"""

from __future__ import annotations

import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
INTEL_030 = ROOT / "n8n" / "workflows" / "intel-030-account-knowledge.json"
ENTITY_MODULE = ROOT / "scripts" / "entity-resolution-node.js"
URL_GUARD_MODULE = ROOT / "scripts" / "url-guard-node.js"
TARGET = ROOT / "n8n" / "workflows" / "intel-035-account-source-preflight.json"

SUPABASE_URL = "https://jvzgmhvwirsbdkjpmvla.supabase.co"
SUPABASE_CRED = {"supabaseApi": {"id": "GBrm2aWU0dDf85QS", "name": "Supabase_Service_Role_KREDO"}}
SERPAPI_CRED = {"serpApi": {"id": "4FHmaQGaAytZHN4w", "name": "SerpAPI_KREDO"}}
HMAC_SECRET = "REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET"


# Le garde SSRF vit dans son propre module partagé depuis le Lot 0.7 : son nœud
# d'origine (`V4 Fetch Selected Pages`) a été supprimé quand INTEL-030 a cessé de
# récupérer des pages, mais le code reste la référence — durci et testé.
URL_GUARD = URL_GUARD_MODULE.read_text(encoding="utf-8").rstrip()
ENTITY_RESOLUTION = ENTITY_MODULE.read_text(encoding="utf-8").rstrip()


# ─── Nœuds Code ─────────────────────────────────────────────────────────────

VALIDATE_INPUT = r"""
// Lot 0 — validation d'entrée. Toute incohérence est rejetée AVANT la moindre
// écriture ou le moindre appel externe, exactement comme intel-030.
const item = $input.first().json;
const body = item.body || {};
const headers = item.headers || {};

const receivedSignature = headers['x-kredo-signature'] || headers['X-KREDO-Signature'] || '';
const expectedSignature = 'sha256=' + (item.computedSignature || '');
if (!receivedSignature || receivedSignature !== expectedSignature) {
  throw new Error('Signature HMAC invalide (X-KREDO-Signature) — requête rejetée');
}

const required = ['runId', 'workflowId', 'entityType', 'entityId', 'workspaceId', 'userId', 'callbackUrl'];
for (const field of required) {
  if (!body[field]) throw new Error('Champ requis manquant dans le payload : ' + field);
}
if (body.entityType !== 'company') {
  throw new Error('intel-035-account-source-preflight requiert entityType="company"');
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
for (const field of ['runId', 'entityId', 'workspaceId']) {
  if (!UUID.test(String(body[field]))) throw new Error('UUID invalide pour ' + field);
}

const input = body.input || {};

// Les 20 modules canoniques — MÊME liste que `src/lib/intelligence/account-intelligence-modules.ts`.
// Un libellé d'interface n'est jamais accepté : c'est la régression V3 (SUBJECT_TO_SEGMENTS
// indexé sur des chaînes françaises) qu'on refuse de rejouer.
const MODULES = ['entity_resolution','identity','size_and_financials','ownership','business_and_offering',
  'business_model','customers_and_market','history','news','ambitions','sector_dynamics','competition',
  'value_chain','technology_trends','regulatory','organisation','dependencies','it_intensity',
  'kredo_relation','issues'];

const targetLevel = [1, 2, 3, 4].includes(Number(input.targetLevel)) ? Number(input.targetLevel) : 2;

const requestedModules = Array.isArray(input.includedModules)
  ? input.includedModules.filter((m) => MODULES.includes(m))
  : [];
if (Array.isArray(input.includedModules) && input.includedModules.length > 0 && requestedModules.length === 0) {
  // On ne retombe PAS silencieusement sur « tous les modules » : un vocabulaire non
  // reconnu est une erreur d'appelant, pas une raison de rechercher plus large.
  throw new Error('Aucun module canonique reconnu dans includedModules');
}

// URL ajoutées à la main par l'utilisateur. Elles sont fetchées comme les autres :
// si elles sont inaccessibles, elles apparaissent `unreachable`. Aucune exception.
const additionalUrls = Array.isArray(input.additionalUrls)
  ? input.additionalUrls.filter((u) => typeof u === 'string' && u.trim().length > 0).slice(0, 20)
  : [];

const corpusIds = Array.isArray(input.corpusIds)
  ? input.corpusIds.filter((id) => UUID.test(String(id))).slice(0, 10)
  : [];

return [{
  json: {
    runId: body.runId,
    workflowId: body.workflowId,
    workspaceId: body.workspaceId,
    userId: body.userId,
    companyId: body.entityId,
    callbackUrl: body.callbackUrl,
    startedAtMs: Date.now(),
    targetLevel,
    requestedModules,
    additionalUrls,
    corpusIds,
  }
}];
"""


PREPARE_DOSSIER = r"""
// Inventaire de l'ACQUIS avant toute recherche : ce que KREDO sait déjà n'est pas
// racheté (axiome A7). Le contexte vient de `get_account_understanding_context`,
// la même RPC que la V4 d'intel-030 — aucune nouvelle hydratation à maintenir.
const validated = $('Validate Preflight Input').first().json;
const raw = $input.first().json;
const ctx = (Array.isArray(raw) ? raw[0] : raw) || {};
const company = ctx.company || {};

// Noms de champs alignés sur `get_account_understanding_context` (`company.sector`,
// `company.segment`, `accountFacts`, `sectorKnowledge`). Les lire sous d'autres noms
// (`sector_name`, `facts`, `ctx.sector`) donnait `null` en silence — et sans `sector`,
// `Resolve Entity` ne peut plus départager une société de son propre holding
// homonyme et rend `needs_human_confirmation` (incident Tournaire, Étape B).
const canonical = {
  name: company.name || null,
  legal_name: company.legal_name || null,
  website: company.website || null,
  siren: company.siren || null,
  naf_code: company.naf_code || null,
  hq_location: company.hq_location || null,
  sector: company.sector || null,
  segment: company.segment || null,
  employee_count: company.employee_count || null,
  description: company.description || null,
};
if (!canonical.name) throw new Error('Compte sans raison sociale : préflight impossible');

// Faits COURANTS et non périmés uniquement. Un fait expiré ne compte pas comme acquis :
// c'est précisément ce qu'il faut re-chercher.
const nowMs = Date.now();
const currentFacts = (ctx.accountFacts || []).filter((f) => {
  if (!f || f.is_current === false) return false;
  if (!f.expires_at) return true;
  return new Date(f.expires_at).getTime() > nowMs;
});

return [{ json: {
  ...validated,
  canonical,
  currentFacts,
  existingSignals: ctx.signals || [],
  sectorContext: ctx.sectorKnowledge || null,
  dataCutoffAt: new Date().toISOString(),
} }];
"""


RESOLVE_ENTITY_TAIL = r"""

const data = $('Prepare Dossier').first().json;
const c = data.canonical;
const variants = erVariants(c.legal_name, c.name);
if (c.siren) variants.unshift(c.siren);
const urls = Array.from(new Set(variants.slice(0, 4))).map((q) =>
  'https://recherche-entreprises.api.gouv.fr/search?q=' + encodeURIComponent(q) + '&per_page=' + REGISTRY_PER_PAGE
);
const responses = await Promise.all(urls.map(async (url) => {
  try { return await this.helpers.httpRequest({ method: 'GET', url, json: true, timeout: 20000 }); }
  catch (error) { return { results: [], _error: String(error.message || error) }; }
}));
const rawCandidates = responses.flatMap((r) => Array.isArray(r && r.results) ? r.results : []);
const candidates = [];
const seen = new Set();
for (const raw of rawCandidates) {
  const normalized = erNormalizeResult(raw);
  if (normalized && !seen.has(normalized.siren)) { seen.add(normalized.siren); candidates.push(normalized); }
}
const resolution = erResolve({
  name: c.name, legalName: c.legal_name, hqLocation: c.hq_location, sector: c.sector,
  segment: c.segment, employeeCount: c.employee_count, knownSiren: c.siren, knownNafCode: c.naf_code,
}, candidates);

// A1 — sans entité résolue, on ne cherche PAS. Une recherche sur un homonyme coûte
// autant qu'une bonne et produit un corpus entièrement faux : c'est l'incident
// Tournaire, où V3 a étudié une société de construction lyonnaise homonyme.
if (resolution.decision !== 'resolved') {
  throw new Error('Entité non résolue (' + resolution.decision + ') — préflight interrompu avant toute recherche');
}

return [{ json: { ...data, entityResolution: resolution, resolvedSiren: resolution.siren || c.siren } }];
"""


DERIVE_GAPS = r"""
// Dérivation des gaps : on ne cherche QUE ce qui manque ou a périmé.
// C'est ici que la modulation par niveau devient réelle plutôt que déclarative.
const data = $('Resolve Entity').first().json;

// Modules par niveau — miroir de `modulesForLevel()` côté TypeScript.
const LEVEL_MODULES = {
  1: ['entity_resolution','identity','size_and_financials','kredo_relation'],
  2: ['business_and_offering','business_model','customers_and_market','history','news','ambitions','ownership'],
  3: ['sector_dynamics','competition','value_chain','technology_trends'],
  4: ['regulatory','organisation','dependencies','it_intensity','issues'],
};
function modulesForLevel(level) {
  const out = [];
  for (let l = 1; l <= level; l++) for (const m of LEVEL_MODULES[l]) if (!out.includes(m)) out.push(m);
  return out;
}

const requested = data.requestedModules && data.requestedModules.length > 0
  ? data.requestedModules
  : modulesForLevel(data.targetLevel);

// A7 — ces modules lisent la connaissance KREDO existante avant le web. Si le compte
// porte un segment documenté, ils ne déclenchent AUCUNE recherche externe : dix comptes
// d'un même secteur n'achètent pas dix analyses de marché.
const INTERNAL_FIRST = ['sector_dynamics','competition','value_chain','regulatory'];
const hasSectorKnowledge = Boolean(data.sectorContext && (data.sectorContext.segment_id || data.sectorContext.slug));

// `kredo_relation` est purement relationnel : jamais de recherche.
const NEVER_SEARCHED = ['kredo_relation','entity_resolution'];

const factTypes = new Set((data.currentFacts || []).map((f) => String(f.fact_type || '')));
// Un module déjà couvert par un fait courant non périmé n'est pas re-cherché.
const COVERED_BY_FACT = {
  identity: ['legal_id','legal_form','headquarters'],
  size_and_financials: ['employee_count','revenue'],
  ownership: ['ownership','shareholder'],
};

const company = data.canonical.name;
const QUERIES = {
  identity: [company + ' siège social société'],
  size_and_financials: [company + ' chiffre d\'affaires effectif'],
  ownership: [company + ' actionnaire capital rachat'],
  business_and_offering: [company + ' métiers produits', company + ' site officiel'],
  business_model: [company + ' modèle économique activité'],
  customers_and_market: [company + ' clients marchés secteurs'],
  history: [company + ' histoire création'],
  news: [company + ' actualité'],
  ambitions: [company + ' stratégie ambitions investissements'],
  sector_dynamics: [company + ' secteur marché tendances'],
  competition: [company + ' concurrents'],
  value_chain: [company + ' fournisseurs chaîne de valeur'],
  technology_trends: [company + ' technologies numérique'],
  regulatory: [company + ' réglementation conformité'],
  organisation: [company + ' organisation direction DSI'],
  dependencies: [company + ' dépendances risques'],
  it_intensity: [company + ' recrutement informatique SI', company + ' transformation digitale'],
  issues: [company + ' enjeux défis'],
};

const gaps = [];
const skipped = [];
for (const moduleId of requested) {
  if (NEVER_SEARCHED.includes(moduleId)) { skipped.push({ module: moduleId, reason: 'module_interne' }); continue; }
  if (INTERNAL_FIRST.includes(moduleId) && hasSectorKnowledge) {
    skipped.push({ module: moduleId, reason: 'connaissance_sectorielle_disponible' });
    continue;
  }
  const coveringTypes = COVERED_BY_FACT[moduleId] || [];
  if (coveringTypes.length > 0 && coveringTypes.every((t) => factTypes.has(t))) {
    skipped.push({ module: moduleId, reason: 'faits_courants_suffisants' });
    continue;
  }
  for (const query of (QUERIES[moduleId] || [])) gaps.push({ module: moduleId, query });
}

// Budget de recherche borné par niveau : L1 reste volontairement léger.
const MAX_QUERIES = { 1: 2, 2: 8, 3: 10, 4: 14 };
const budget = MAX_QUERIES[data.targetLevel] || 8;
const plannedQueries = gaps.slice(0, budget);

return [{ json: {
  ...data,
  requestedModules: requested,
  plannedQueries,
  skippedModules: skipped,
  hasSectorKnowledge,
} }];
"""


BUILD_SERPAPI = r"""
const data = $('Derive Research Gaps').first().json;
return data.plannedQueries.map((entry, index) => ({
  json: { ...data, query: entry.query, module: entry.module, index, gl: 'fr', hl: 'fr', num: 10 }
}));
"""


NORMALIZE_DISCOVERY = r"""
// Agrège les réponses SerpAPI en une liste plate de candidats, en conservant le
// module qui a motivé chaque requête : c'est ce qui permettra de dire, document par
// document, à quoi il sert (`serves_modules`).
const items = $input.all().map((i) => i.json);
const requests = [];
try { requests.push(...$('Build SerpAPI Requests').all().map((i) => i.json)); } catch (_) {}
const base = $('Derive Research Gaps').first().json;

const discovery = items.map((res, i) => {
  const req = requests[i] || {};
  const organic = Array.isArray(res && res.organic_results) ? res.organic_results : [];
  return {
    query: req.query || (res && res.search_parameters && res.search_parameters.q) || '',
    module: req.module || null,
    index: i,
    organic: organic.map((r) => ({ link: r.link || r.url || '', title: r.title || '', snippet: r.snippet || '', date: r.date || null })),
  };
});

return [{ json: { ...base, discovery } }];
"""


SKIP_DISCOVERY = r"""
// Aucun gap à couvrir : le plan se construit sur les seules URL manuelles éventuelles.
// Ce n'est PAS un échec — c'est le cas nominal d'un L3 sur un segment déjà documenté,
// ou d'un L1 sur un compte bien renseigné.
const data = $('Derive Research Gaps').first().json;
return [{ json: { ...data, discovery: [] } }];
"""


FETCH_DOCUMENTS = (
    r"""
// ─── Le cœur d'INTEL-035 : on ne propose que ce qu'on a LU ────────────────────
//
// Le défaut que ce nœud corrige : `V4 Fetch Selected Pages` d'intel-030 tentait
// 6 requêtes parallèles à timeout 6000 ms, échouait intégralement contre Cloudflare
// et les paywalls, et le pipeline CONTINUAIT en produisant un rapport. Sur les
// 4 runs V4 réussis en production, `external_pages_fetched` valait 0.
//
// Trois changements décisifs :
//   1. timeout porté à 15 s — 6 s ne suffit pas à un site corporate français ;
//   2. chaque échec porte un MOTIF, transmis au plan et affiché à l'utilisateur,
//      au lieu d'être avalé dans un tableau que personne ne lit ;
//   3. le nœud ne masque jamais une collecte vide : c'est l'application qui refuse
//      de publier un plan sans matière (A2).

"""
    + URL_GUARD
    + r"""

// Hash de contenu non cryptographique (FNV-1a 64 bits, rendu en hex). Suffisant pour
// la déduplication et la détection de page inchangée — et surtout DISPONIBLE : le
// sandbox des nœuds Code n8n n'expose pas `crypto` de façon fiable, et une dépendance
// absente ferait sauter toutes les assertions suivantes sans erreur lisible.
function contentHash(text) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b) >>> 0;
  }
  return ('00000000' + h1.toString(16)).slice(-8) + ('00000000' + h2.toString(16)).slice(-8);
}

function extractText(raw) {
  const html = typeof raw === 'string' ? raw : JSON.stringify(raw);
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 14000);
}

function classifyKind(host) {
  if (/\.gouv\.fr$|insee\.fr$|societe\.com$|pappers\.fr$/.test(host)) return 'registry';
  if (/europa\.eu$|legifrance\.gouv\.fr$/.test(host)) return 'regulatory';
  if (/welcometothejungle|indeed|apec\.fr|linkedin\.com\/jobs/.test(host)) return 'job_board';
  if (/lesechos|usinenouvelle|latribune|bfmtv|lemonde|reuters|afp|challenges|lefigaro|journaldunet/.test(host)) return 'press';
  if (/xerfi|statista|gartner|idc\.com/.test(host)) return 'specialised_study';
  return 'company_official';
}

const data = $input.first().json;
const canonical = data.canonical || {};
const officialHost = (() => { const p = parseUrl(canonical.website || ''); return p.valid ? p.hostWithoutWww : ''; })();

const candidates = [];
const seenUrls = new Set();
const rejected = [];

function addCandidate(entry) {
  const parsed = parseUrl(entry.url);
  if (!parsed.valid) { rejected.push({ url: entry.url, reason: 'URL écartée : ' + parsed.reason }); return; }
  if (seenUrls.has(parsed.clean)) {
    const existing = candidates.find((c) => c.url === parsed.clean);
    if (existing && entry.module && !existing.serves_modules.includes(entry.module)) existing.serves_modules.push(entry.module);
    return;
  }
  seenUrls.add(parsed.clean);
  const host = parsed.hostWithoutWww;
  let score = entry.baseScore || 10;
  if (officialHost && (host === officialHost || host.endsWith('.' + officialHost))) score += 100;
  if (/\.gouv\.fr$|insee\.fr$|europa\.eu$/.test(host)) score += 70;
  if (/lesechos|usinenouvelle|latribune|lemonde|reuters|challenges|lefigaro/.test(host)) score += 40;
  candidates.push({
    url: parsed.clean, domain: host, title: entry.title || null, published_at: entry.date || null,
    kind: entry.kind || classifyKind(host), origin: entry.origin,
    serves_modules: entry.module ? [entry.module] : [], reason: entry.reason, score,
  });
}

// 1. Site officiel — priorité absolue, il est la source déclarative de référence.
if (canonical.website) {
  addCandidate({ url: canonical.website, origin: 'discovered', kind: 'company_official', baseScore: 200,
    title: canonical.name + ' — site officiel', module: 'business_and_offering',
    reason: 'Site officiel du compte' });
}

// 2. Registre légal — A4, subsidiarité : l'identité vient d'une source déterministe.
if (data.resolvedSiren) {
  addCandidate({ url: 'https://annuaire-entreprises.data.gouv.fr/entreprise/' + data.resolvedSiren,
    origin: 'discovered', kind: 'registry', baseScore: 190, title: 'Annuaire des entreprises',
    module: 'identity', reason: 'Registre légal — identité et activité déclarée' });
}

// 3. URL ajoutées à la main : fetchées comme les autres, sans passe-droit.
for (const url of (data.additionalUrls || [])) {
  addCandidate({ url, origin: 'manual', baseScore: 150, reason: 'Ajoutée manuellement pour cette analyse' });
}

// 4. Items de corpus éventuels.
for (const item of (data.corpusItems || [])) {
  if (item && item.url) addCandidate({ url: item.url, origin: 'corpus', baseScore: 120,
    title: item.label || null, reason: 'Issue du corpus « ' + (item.corpus_label || 'sectoriel') + ' »' });
}

// 5. Découverte web sur les gaps.
for (const search of (data.discovery || [])) {
  for (const result of (search.organic || [])) {
    addCandidate({ url: result.link, origin: 'discovered', title: result.title, date: result.date,
      module: search.module, reason: 'Trouvée pour « ' + search.query + ' »' });
  }
}

candidates.sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
const MAX_DOCUMENTS = { 1: 3, 2: 8, 3: 10, 4: 12 };
const selected = candidates.slice(0, MAX_DOCUMENTS[data.targetLevel] || 8);

const documents = await Promise.all(selected.map(async (candidate) => {
  const shared = {
    url: candidate.url, canonical_url: candidate.url, domain: candidate.domain,
    title: candidate.title, published_at: candidate.published_at, kind: candidate.kind,
    serves_modules: candidate.serves_modules, reason: candidate.reason, origin: candidate.origin,
    collection_method: 'http_get',
  };
  try {
    const response = await this.helpers.httpRequest({
      method: 'GET', url: candidate.url, timeout: 15000, returnFullResponse: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
    });
    const status = (response && response.statusCode) || 200;
    const text = extractText(response && response.body !== undefined ? response.body : response);
    if (text.length < 200) {
      return { ...shared, status: 'unreachable', http_status: status,
        failure_reason: 'Contenu trop court ou vide (' + text.length + ' caractères) — page probablement rendue en JavaScript' };
    }
    return { ...shared, status: 'retrieved', http_status: status,
      fetched_at: new Date().toISOString(), content_hash: contentHash(text),
      extracted_text: text, extracted_chars: text.length };
  } catch (error) {
    const message = String((error && error.message) || error);
    const httpMatch = message.match(/\b(4\d\d|5\d\d)\b/);
    return { ...shared, status: 'unreachable',
      http_status: httpMatch ? Number(httpMatch[1]) : null,
      failure_reason: /timeout|ETIMEDOUT|ESOCKETTIMEDOUT/i.test(message)
        ? 'Délai dépassé (15 s)'
        : message.slice(0, 200) };
  }
}));

const retrieved = documents.filter((d) => d.status === 'retrieved');

return [{ json: {
  ...data,
  sourceDocuments: documents,
  preflightDiagnostics: {
    candidates: candidates.length,
    selected: selected.length,
    retrieved: retrieved.length,
    unreachable: documents.length - retrieved.length,
    rejectedUrls: rejected,
    skippedModules: data.skippedModules || [],
  },
} }];
"""
)


PREPARE_CALLBACK = r"""
// Le workflow transmet ce qu'il a lu. Il n'écrit RIEN en base : c'est
// `ingestAccountSourcePlan` qui applique la frontière tenant, déduplique et publie
// le plan canonique avec les identifiants réels des documents.
const data = $input.first().json;
const diagnostics = data.preflightDiagnostics || {};
const documents = data.sourceDocuments || [];
const retrieved = documents.filter((d) => d.status === 'retrieved').length;

const qaFlags = [
  { check: 'entity_resolution', passed: true,
    detail: 'SIREN ' + (data.resolvedSiren || '') + ' — score ' + ((data.entityResolution && data.entityResolution.score) || 0) },
  { check: 'documents_retrieved', passed: retrieved > 0,
    detail: retrieved + ' document(s) récupéré(s) sur ' + documents.length + ' tenté(s)' },
];
for (const skipped of (diagnostics.skippedModules || [])) {
  qaFlags.push({ check: 'module_skipped', passed: true, detail: skipped.module + ' — ' + skipped.reason });
}

const callbackBody = {
  n8nExecutionId: $execution.id,
  n8nWorkflowId: $workflow.id,
  runId: data.runId,
  phase: 1,
  resultType: 'account_source_plan',
  status: 'succeeded',
  title: 'Plan de sources — ' + ((data.canonical && data.canonical.name) || 'Compte'),
  contentJson: {
    schema_version: 1,
    scope: { target_level: data.targetLevel, modules: data.requestedModules },
    entity_resolution: data.entityResolution,
    corpora: data.corpora || [],
  },
  // Transmis à part de contentJson : ce ne sont pas des données du plan, ce sont les
  // documents à écrire. L'application construit `entries[]` à partir des lignes créées.
  sourceDocuments: documents,
  contextSnapshot: {
    preflightDiagnostics: diagnostics,
    plannedQueries: data.plannedQueries || [],
    hasSectorKnowledge: data.hasSectorKnowledge || false,
    dataCutoffAt: data.dataCutoffAt,
  },
  qaFlags,
  durationMs: data.startedAtMs ? Date.now() - data.startedAtMs : null,
  // G0.7 — sans ces trois champs le run apparaîtrait en `has_tokens_gap` dans
  // v_ai_run_costs. INTEL-035 n'appelle aucun LLM : les compteurs sont donc à zéro,
  // ce qui est une information, pas une absence.
  modelProvider: 'none',
  modelUsed: 'deterministic',
  tokensInput: 0,
  tokensOutput: 0,
};

return [{ json: { callbackUrl: data.callbackUrl, rawBody: JSON.stringify(callbackBody) } }];
"""


PREPARE_FAILURE = r"""
// Toute sortie d'erreur rejoint ce nœud : un run ne reste JAMAIS en `running`.
//
// `$('Validate Preflight Input')` n'est PAS accessible depuis une branche d'erreur
// quand c'est un nœud AVAL qui a jeté (Resolve Entity…) : la référence lève, le
// catch la ramène à `{}`, `callbackUrl` devient `undefined` et le nœud `Callback
// (Failure)` échoue sur « URL parameter must be a string ». Résultat : le run KREDO
// restait `running` indéfiniment, aucun échec jamais remonté (Étape B).
//
// Le nœud Webhook, lui, est le déclencheur : il est atteignable depuis n'importe où.
// On lit d'abord la sortie validée si elle existe, sinon le corps brut du webhook —
// `runId` et `callbackUrl` sont imposés par le contrat d'entrée KREDO.
const error = $input.first().json.error || $input.first().json;
let validated = {};
try { validated = $('Validate Preflight Input').first().json || {}; } catch (_) {}
let webhookBody = {};
try { webhookBody = ($('Webhook — Source Preflight').first().json || {}).body || {}; } catch (_) {}
const runId = validated.runId || webhookBody.runId || null;
const callbackUrl = validated.callbackUrl || webhookBody.callbackUrl || null;
const message = String((error && (error.message || error.description)) || error || 'Erreur inconnue');

const callbackBody = {
  n8nExecutionId: $execution.id,
  n8nWorkflowId: $workflow.id,
  runId,
  phase: 1,
  resultType: 'account_source_plan',
  status: 'failed',
  contentJson: {},
  errorMessage: message.slice(0, 2000),
};
return [{ json: { callbackUrl, rawBody: JSON.stringify(callbackBody) } }];
"""


def code_node(name: str, js: str, position: list[int]) -> dict:
    return {
        "parameters": {"jsCode": js.strip("\n")},
        "id": name.lower().replace(" ", "-").replace("—", "-"),
        "name": name,
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": position,
    }


def build() -> dict:
    nodes: list[dict] = [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "intel-035-account-source-preflight",
                "responseMode": "onReceived",
                "options": {"rawBody": False},
            },
            "id": "webhook-preflight",
            "name": "Webhook — Source Preflight",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [-460, 300],
            "webhookId": "intel-035-account-source-preflight",
        },
        {
            "parameters": {
                "action": "hmac",
                "type": "SHA256",
                "value": "={{ JSON.stringify($json.body) }}",
                "dataPropertyName": "computedSignature",
                "secret": HMAC_SECRET,
                "encoding": "hex",
            },
            "id": "verify-signature",
            "name": "Verify Signature",
            "type": "n8n-nodes-base.crypto",
            "typeVersion": 1,
            "position": [-260, 300],
        },
        code_node("Validate Preflight Input", VALIDATE_INPUT, [-60, 300]),
        {
            "parameters": {
                "method": "PATCH",
                "url": f"={SUPABASE_URL}/rest/v1/ai_intelligence_runs?id=eq.{{{{ $json.runId }}}}",
                "sendHeaders": True,
                "headerParameters": {"parameters": [{"name": "Prefer", "value": "return=minimal"}]},
                "sendBody": True,
                "contentType": "json",
                "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify({ status: 'running', started_at: new Date().toISOString(), current_phase: 1 }) }}",
                "options": {"timeout": 20000},
                "authentication": "predefinedCredentialType",
                "nodeCredentialType": "supabaseApi",
            },
            "id": "update-run-status",
            "name": "Update Run Status",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [140, 300],
            "credentials": SUPABASE_CRED,
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{SUPABASE_URL}/rest/v1/rpc/get_account_understanding_context",
                "sendHeaders": True,
                "headerParameters": {"parameters": [{"name": "Content-Profile", "value": "public"}]},
                "sendBody": True,
                "contentType": "json",
                "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify({ p_workspace_id: $('Validate Preflight Input').first().json.workspaceId, p_company_id: $('Validate Preflight Input').first().json.companyId }) }}",
                "options": {"timeout": 30000},
                "authentication": "predefinedCredentialType",
                "nodeCredentialType": "supabaseApi",
            },
            "id": "hydrate-context",
            "name": "Hydrate Context",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [340, 300],
            "credentials": SUPABASE_CRED,
        },
        code_node("Prepare Dossier", PREPARE_DOSSIER, [540, 300]),
        code_node("Resolve Entity", ENTITY_RESOLUTION + RESOLVE_ENTITY_TAIL, [740, 300]),
        code_node("Derive Research Gaps", DERIVE_GAPS, [940, 300]),
        {
            "parameters": {
                "conditions": {
                    "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose"},
                    "conditions": [
                        {
                            "id": "has-gaps",
                            "leftValue": "={{ $json.plannedQueries.length }}",
                            "rightValue": 0,
                            "operator": {"type": "number", "operation": "gt"},
                        }
                    ],
                    "combinator": "and",
                },
                "options": {},
            },
            "id": "gaps-to-search",
            "name": "Gaps To Search?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2,
            "position": [1140, 300],
        },
        code_node("Build SerpAPI Requests", BUILD_SERPAPI, [1340, 200]),
        {
            "parameters": {
                "method": "GET",
                "url": "https://serpapi.com/search.json",
                "authentication": "predefinedCredentialType",
                "nodeCredentialType": "serpApi",
                "sendQuery": True,
                "queryParameters": {
                    "parameters": [
                        {"name": "engine", "value": "google"},
                        {"name": "q", "value": "={{ $json.query }}"},
                        {"name": "gl", "value": "={{ $json.gl }}"},
                        {"name": "hl", "value": "={{ $json.hl }}"},
                        {"name": "num", "value": "={{ $json.num }}"},
                    ]
                },
                "options": {
                    "timeout": 20000,
                    "response": {"response": {"neverError": True, "responseFormat": "json"}},
                },
            },
            "id": "serpapi-search",
            "name": "SerpAPI Search",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [1540, 200],
            "credentials": SERPAPI_CRED,
            "alwaysOutputData": True,
        },
        code_node("Normalize Discovery", NORMALIZE_DISCOVERY, [1740, 200]),
        code_node("Skip Discovery", SKIP_DISCOVERY, [1340, 420]),
        code_node("Fetch Documents", FETCH_DOCUMENTS, [1940, 300]),
        code_node("Prepare Callback", PREPARE_CALLBACK, [2140, 300]),
        {
            "parameters": {
                "action": "hmac",
                "type": "SHA256",
                "value": "={{ $json.rawBody }}",
                "dataPropertyName": "signature",
                "secret": HMAC_SECRET,
                "encoding": "hex",
            },
            "id": "sign-callback",
            "name": "Sign Callback",
            "type": "n8n-nodes-base.crypto",
            "typeVersion": 1,
            "position": [2340, 300],
        },
        {
            "parameters": {
                "method": "POST",
                "url": "={{ $('Prepare Callback').first().json.callbackUrl }}",
                "authentication": "none",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {"name": "x-kredo-signature", "value": "=sha256={{ $json.signature }}"},
                        {"name": "content-type", "value": "application/json"},
                    ]
                },
                "sendBody": True,
                "contentType": "raw",
                "rawContentType": "application/json",
                "body": "={{ $('Prepare Callback').first().json.rawBody }}",
                "options": {"timeout": 30000},
            },
            "id": "callback",
            "name": "Callback",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [2540, 300],
        },
        code_node("Prepare Failure Callback", PREPARE_FAILURE, [2140, 520]),
        {
            "parameters": {
                "action": "hmac",
                "type": "SHA256",
                "value": "={{ $json.rawBody }}",
                "dataPropertyName": "signature",
                "secret": HMAC_SECRET,
                "encoding": "hex",
            },
            "id": "sign-failure-callback",
            "name": "Sign Failure Callback",
            "type": "n8n-nodes-base.crypto",
            "typeVersion": 1,
            "position": [2340, 520],
        },
        {
            "parameters": {
                "method": "POST",
                "url": "={{ $('Prepare Failure Callback').first().json.callbackUrl }}",
                "authentication": "none",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {"name": "x-kredo-signature", "value": "=sha256={{ $json.signature }}"},
                        {"name": "content-type", "value": "application/json"},
                    ]
                },
                "sendBody": True,
                "contentType": "raw",
                "rawContentType": "application/json",
                "body": "={{ $('Prepare Failure Callback').first().json.rawBody }}",
                "options": {"timeout": 30000},
            },
            "id": "callback-failure",
            "name": "Callback (Failure)",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [2540, 520],
        },
    ]

    def main(target: str, index: int = 0) -> dict:
        return {"main": [[{"node": target, "type": "main", "index": index}]]}

    connections = {
        "Webhook — Source Preflight": main("Verify Signature"),
        "Verify Signature": main("Validate Preflight Input"),
        "Validate Preflight Input": main("Update Run Status"),
        "Update Run Status": main("Hydrate Context"),
        "Hydrate Context": main("Prepare Dossier"),
        "Prepare Dossier": main("Resolve Entity"),
        "Resolve Entity": main("Derive Research Gaps"),
        "Gaps To Search?": {
            "main": [
                [{"node": "Build SerpAPI Requests", "type": "main", "index": 0}],
                [{"node": "Skip Discovery", "type": "main", "index": 0}],
            ]
        },
        "Derive Research Gaps": main("Gaps To Search?"),
        "Build SerpAPI Requests": main("SerpAPI Search"),
        "SerpAPI Search": main("Normalize Discovery"),
        "Normalize Discovery": main("Fetch Documents"),
        "Skip Discovery": main("Fetch Documents"),
        "Fetch Documents": main("Prepare Callback"),
        "Prepare Callback": main("Sign Callback"),
        "Sign Callback": main("Callback"),
        "Prepare Failure Callback": main("Sign Failure Callback"),
        "Sign Failure Callback": main("Callback (Failure)"),
    }

    # Toute sortie d'erreur rejoint le callback d'échec — un run ne reste jamais
    # en `running`, invariant partagé avec intel-030.
    for node in nodes:
        if node["name"] in {
            "Validate Preflight Input", "Update Run Status", "Hydrate Context",
            "Prepare Dossier", "Resolve Entity", "Derive Research Gaps",
            "Build SerpAPI Requests", "SerpAPI Search", "Normalize Discovery",
            "Skip Discovery", "Fetch Documents", "Prepare Callback",
        }:
            node["onError"] = "continueErrorOutput"
            existing = connections.get(node["name"], {"main": [[]]})
            existing["main"] = list(existing["main"])
            while len(existing["main"]) < 2:
                existing["main"].append([])
            existing["main"][1] = [{"node": "Prepare Failure Callback", "type": "main", "index": 0}]
            connections[node["name"]] = existing

    return {
        "name": "INTEL-035 — Account Source Preflight",
        "nodes": nodes,
        "connections": connections,
        "settings": {"executionOrder": "v1"},
        "pinData": {},
    }


def main() -> int:
    workflow = build()
    TARGET.write_text(json.dumps(workflow, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

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
        else:
            print(f"node --check ok — {node['name']}")

    code_nodes = sum(1 for n in workflow["nodes"] if n["type"] == "n8n-nodes-base.code")
    print(f"\n{TARGET.relative_to(ROOT)} : {len(workflow['nodes'])} nœuds, {code_nodes} nœuds Code.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())

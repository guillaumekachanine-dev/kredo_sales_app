#!/usr/bin/env python3
"""Lot 1 — pose la résolution d'entité dans intel-030-account-knowledge.

Deux modifications, aucune modification de topologie :

  1. `V3 Fetch Public Registry` : `per_page` 3 → 10. La bonne entité « Tournaire »
     arrivait en 5ᵉ position et n'était donc jamais candidate.

  2. `V3 Consult & Normalize Sources` : le bloc « Registre public » est remplacé par
     la résolution d'entité déterministe, transcrite de
     `src/lib/intelligence/entity-resolution.ts` (source de vérité, testée).
     Le nœud interroge lui-même le registre sur les variantes de raison sociale,
     score les candidats sur le nom, la géographie, l'activité, la taille et l'état
     administratif, et ne retient une preuve d'identité que si la résolution est
     `resolved`.

  3. `V3 Build Enrichment Proposals` : les propositions sur les champs canoniques
     d'identité sont conditionnées à `entityResolution.can_propose_canonical_writes`.

Le JSON est réécrit sur place. `node --check` valide chaque nœud Code modifié.

    python3 scripts/patch-intel-030-entity-resolution.py
"""

from __future__ import annotations

import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / "n8n" / "workflows" / "intel-030-account-knowledge.json"

REGISTRY_BLOCK_START = "// ── Registre public (INSEE Sirene via data.gouv.fr) ──"
PRESS_BLOCK_START = "// ── Presse (flux RSS Google News) ──"

# ─── Bloc de remplacement : résolution d'entité ─────────────────────────────
# Transcription de src/lib/intelligence/entity-resolution.ts. Toute évolution se
# fait D'ABORD dans le module TypeScript, qui porte les tests.
ENTITY_RESOLUTION_BLOCK = r"""// ── Résolution d'entité + registre public ───────────────────────────────────
// Transcription de src/lib/intelligence/entity-resolution.ts (source de vérité,
// testée par entity-resolution.test.ts). RÈGLE : le nom est une PORTE, jamais une
// décision. Le run du 2026-09-04 sur « Tournaire » a publié l'identité de
// TOURNAIRE / SIREN 505063438 / Lyon / NAF 43.99C — une entreprise de travaux de
// construction — parce que trois entités portent ce nom et que seul le nom était
// comparé. Ici, seule une résolution `resolved` produit une preuve d'identité, et
// seule une résolution `resolved` autorise une proposition d'enrichissement.
const LEGAL_FORM_TOKENS = new Set(['sa','sas','sasu','sarl','eurl','snc','sci','scs','sca','scop','scic','selas','selarl','selafa','sel','sem','spl','gie','gip','eirl','ei','societe','ste','cie','compagnie','etablissements','ets','ltd','limited','llc','inc','gmbh','ag','bv','nv','spa','srl','plc','et','de','du','des','la','le','les','aux']);
const HOLDING_LIKE_NAF = new Set(['70.10Z','70.22Z','64.20Z','82.99Z','74.90B','94.99Z']);
const SECTOR_TO_NAF_SECTIONS = {
  'Aéronautique, Spatial & Défense': ['C','M','H','J'],
  'Banque, Finance & Assurance': ['K'],
  'BTP, Construction & Immobilier': ['F','L','G','M'],
  'Commerce, Distribution & Services spécialisés': ['G','N','S','C'],
  'EHPAD & Résidences Seniors': ['Q'],
  'Énergie, Pétrochimie & Environnement': ['B','C','D','E','M'],
  'Industrie manufacturière, électronique & équipements': ['C'],
  'Logiciels, SaaS & Services numériques': ['J','M'],
  'Nutraceutique, Santé Naturelle & Compléments Alimentaires': ['C','G','Q'],
  'Parfumerie, Arômes & Cosmétique': ['C','G'],
  'Santé, MedTech & Médico-social': ['Q','C','M'],
  'Secteur public, Enseignement supérieur & Recherche': ['O','P','M','S'],
  'Tourisme, Hôtellerie & Loisirs': ['I','N','R'],
  'Transport & Mobilité régionale': ['H','N'],
};
const TRANCHE_MIDPOINT = { '00':0,'01':2,'02':4,'03':7,'11':15,'12':35,'21':75,'22':150,'31':225,'32':375,'41':750,'42':1500,'51':3500,'52':7500 };
const WEIGHTS = { name: 3, geography: 3, activity_section: 1, known_naf: 2.5, size: 0.8, administrative_state: 1, known_siren: 10 };
const NAME_GATE_MIN = 0.4;
const RESOLVED_MIN_SCORE = 4;
const RESOLVED_MIN_NAME_SCORE = 0.65;
const RESOLVED_MIN_MARGIN = 1.5;
const CANDIDATE_MIN_SCORE = 2;
const REGISTRY_PER_PAGE = 10;
const AUDIT_CANDIDATE_LIMIT = 5;

function erNormalize(v) {
  if (v === null || v === undefined) return '';
  return String(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function erTokens(v) { const n = erNormalize(v); return n.length > 0 ? n.split(' ') : []; }
function erCore(v) { return erTokens(v).filter((t) => !LEGAL_FORM_TOKENS.has(t) && t.length > 1); }
function erVariants() {
  const out = [];
  for (const value of Array.prototype.slice.call(arguments)) {
    if (typeof value !== 'string' || value.trim().length === 0) continue;
    const raw = value.trim();
    out.push(raw);
    const withoutParens = raw.replace(/\([^)]*\)/g, ' ').trim();
    if (withoutParens.length > 0) out.push(withoutParens);
    const inner = raw.match(/\(([^)]+)\)/g) || [];
    for (const m of inner) { const t = m.slice(1, -1).trim(); if (t.length > 0) out.push(t); }
    for (const part of raw.split('/')) { const t = part.trim(); if (t.length > 0) out.push(t); }
  }
  const seen = new Set(); const uniq = [];
  for (const v of out) { const k = erNormalize(v); if (k.length === 0 || seen.has(k)) continue; seen.add(k); uniq.push(v); }
  return uniq;
}
function erScoreNamePair(left, right) {
  const a = erCore(left); const b = erCore(right);
  if (a.length === 0 || b.length === 0) return 0;
  if (a.join(' ') === b.join(' ')) return 1;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length > 0 && shorter.length < longer.length && shorter.every((t, i) => t === longer[i])) return 0.8;
  const longerSet = new Set(longer);
  if (shorter.every((t) => longerSet.has(t))) return (longer.length - shorter.length > 2) ? 0.5 : 0.65;
  const shared = shorter.filter((t) => longerSet.has(t)).length;
  return (shared / shorter.length) >= 0.5 ? 0.4 : 0;
}
function erScoreName(acc, cand) {
  const left = erVariants(acc.legalName, acc.name);
  const right = erVariants.apply(null, [cand.legalName].concat(cand.alternateNames || []));
  let best = 0;
  for (const l of left) for (const r of right) { const s = erScoreNamePair(l, r); if (s > best) best = s; if (best === 1) return 1; }
  return best;
}
function erParseLocation(value) {
  if (typeof value !== 'string' || value.trim().length === 0) return { postalCode: null, department: null, tokens: [] };
  const m = String(value).match(/\b(\d{5})\b/);
  const postalCode = m ? m[1] : null;
  return { postalCode: postalCode, department: postalCode ? postalCode.slice(0, 2) : null, tokens: erTokens(value).filter((t) => !/^\d+$/.test(t) && t.length > 2) };
}
function erGeography(acc, cand) {
  const parsed = erParseLocation(acc.hqLocation);
  const commune = erNormalize(cand.hqCommune);
  const address = erNormalize(cand.hqAddress);
  const dept = cand.hqDepartment || (cand.hqPostalCode ? cand.hqPostalCode.slice(0, 2) : null);
  if (parsed.tokens.length === 0 && !parsed.postalCode) return { value: 0, detail: 'Siège inconnu au CRM — signal neutre.' };
  if (parsed.postalCode && cand.hqPostalCode && parsed.postalCode === cand.hqPostalCode) return { value: 1, detail: 'Code postal identique (' + parsed.postalCode + ').' };
  const communeTokens = commune.length > 0 ? commune.split(' ') : [];
  const matches = communeTokens.length > 0 && (communeTokens.every((t) => parsed.tokens.indexOf(t) !== -1) || parsed.tokens.some((t) => communeTokens.indexOf(t) !== -1));
  if (matches) return { value: 1, detail: 'Commune du siège concordante (' + cand.hqCommune + ').' };
  if (address.length > 0 && parsed.tokens.some((t) => address.indexOf(t) !== -1)) return { value: 0.8, detail: "Le lieu connu au CRM apparaît dans l'adresse du siège." };
  if (parsed.department && dept) {
    if (parsed.department === dept) return { value: 0.5, detail: 'Même département (' + parsed.department + '), commune différente.' };
    return { value: -1, detail: 'Département incompatible : CRM ' + parsed.department + ', registre ' + dept + ' (' + (cand.hqCommune || '?') + ').' };
  }
  if (parsed.tokens.length > 0 && commune.length > 0) return { value: -0.5, detail: 'Lieu du CRM (' + acc.hqLocation + ') et commune du registre (' + cand.hqCommune + ') divergents, sans code postal pour arbitrer.' };
  return { value: 0, detail: 'Géographie non comparable (aucun code postal au CRM).' };
}
function erActivity(acc, cand) {
  if (cand.nafCode && HOLDING_LIKE_NAF.has(cand.nafCode)) return { value: 0, detail: 'NAF de holding ou de support (' + cand.nafCode + ') — signal neutre.' };
  const expected = acc.sector ? SECTOR_TO_NAF_SECTIONS[acc.sector] : null;
  if (!expected || !cand.nafSection) return { value: 0, detail: 'Secteur ou section NAF inconnu — signal neutre.' };
  if (expected.indexOf(cand.nafSection) !== -1) return { value: 1, detail: 'Section NAF ' + cand.nafSection + ' cohérente avec « ' + acc.sector + ' ».' };
  return { value: -1, detail: 'Section NAF ' + cand.nafSection + ' inattendue pour « ' + acc.sector + ' ».' };
}
function erKnownNaf(acc, cand) {
  const known = erNormalize(acc.knownNafCode).replace(/\s/g, '');
  const found = erNormalize(cand.nafCode).replace(/\s/g, '');
  if (known.length === 0 || found.length === 0) return null;
  if (known === found) return { value: 1, detail: 'Code NAF identique au CRM (' + cand.nafCode + ').' };
  if (known.slice(0, 2) === found.slice(0, 2)) return { value: 0.6, detail: 'Même division NAF (' + found.slice(0, 2) + ').' };
  return { value: -1, detail: 'Code NAF incompatible : CRM ' + acc.knownNafCode + ', registre ' + cand.nafCode + '.' };
}
function erSize(acc, cand) {
  const crm = acc.employeeCount;
  const mid = Object.prototype.hasOwnProperty.call(TRANCHE_MIDPOINT, String(cand.employeeTrancheCode || '')) ? TRANCHE_MIDPOINT[String(cand.employeeTrancheCode)] : null;
  if (typeof crm !== 'number' || !isFinite(crm) || crm <= 0 || mid === null || mid <= 0) return { value: 0, detail: 'Effectif non comparable — signal neutre.' };
  const ratio = crm > mid ? crm / mid : mid / crm;
  if (ratio <= 3) return { value: 1, detail: 'Effectifs du même ordre (CRM ' + crm + ', tranche ≈ ' + mid + ').' };
  if (ratio <= 10) return { value: -0.4, detail: 'Effectifs éloignés (CRM ' + crm + ', tranche ≈ ' + mid + ').' };
  return { value: -1, detail: "Effectifs d'ordres différents (CRM " + crm + ', tranche ≈ ' + mid + ').' };
}
function erScoreCandidate(acc, cand) {
  const signals = [];
  const nameScore = erScoreName(acc, cand);
  signals.push({ key: 'name', weight: WEIGHTS.name, value: nameScore, detail: 'Proximité de raison sociale : ' + nameScore.toFixed(2) + '.', blocking: nameScore < NAME_GATE_MIN });
  const geo = erGeography(acc, cand);
  signals.push({ key: 'geography', weight: WEIGHTS.geography, value: geo.value, detail: geo.detail, blocking: geo.value <= -1 });
  const knownNaf = erKnownNaf(acc, cand);
  if (knownNaf) signals.push({ key: 'known_naf', weight: WEIGHTS.known_naf, value: knownNaf.value, detail: knownNaf.detail, blocking: knownNaf.value < 0 });
  else { const act = erActivity(acc, cand); signals.push({ key: 'activity_section', weight: WEIGHTS.activity_section, value: act.value, detail: act.detail, blocking: false }); }
  const size = erSize(acc, cand);
  signals.push({ key: 'size', weight: WEIGHTS.size, value: size.value, detail: size.detail, blocking: false });
  const ceased = cand.administrativeState === 'C';
  signals.push({ key: 'administrative_state', weight: WEIGHTS.administrative_state, value: ceased ? -1 : 0, detail: ceased ? 'Entité cessée au registre.' : 'Entité active.', blocking: ceased });
  let score = 0;
  for (const s of signals) score += s.weight * s.value;
  score = Math.round(score * 100) / 100;
  return { candidate: cand, score: score, nameScore: nameScore, signals: signals, blockers: signals.filter((s) => s.blocking).map((s) => s.detail) };
}
function erSiren(value) { if (typeof value !== 'string') { if (typeof value === 'number') value = String(value); else return null; } const d = value.replace(/\D/g, ''); return d.length === 9 ? d : null; }
function erNormalizeResult(raw) {
  const siren = erSiren(raw && raw.siren);
  if (!siren) return null;
  const siege = (raw.siege && typeof raw.siege === 'object') ? raw.siege : {};
  const str = (v) => (typeof v === 'string' && v.trim().length > 0) ? v.trim() : (typeof v === 'number' && isFinite(v) ? String(v) : null);
  const enseignes = Array.isArray(siege.liste_enseignes) ? siege.liste_enseignes.map(str).filter(Boolean) : [];
  let revenueEur = null; let revenueYear = null;
  if (raw.finances && typeof raw.finances === 'object') {
    const years = Object.keys(raw.finances).filter((y) => /^\d{4}$/.test(y)).sort();
    const last = years[years.length - 1];
    if (last && raw.finances[last] && typeof raw.finances[last].ca === 'number') { revenueEur = raw.finances[last].ca; revenueYear = last; }
  }
  const postal = str(siege.code_postal);
  return {
    siren: siren,
    legalName: str(raw.nom_raison_sociale) || str(raw.nom_complet),
    alternateNames: [str(raw.nom_complet), str(raw.sigle), str(siege.nom_commercial)].concat(enseignes).filter(Boolean),
    nafCode: str(raw.activite_principale) || str(siege.activite_principale),
    nafSection: str(raw.section_activite_principale),
    hqCommune: str(siege.libelle_commune),
    hqPostalCode: postal,
    hqDepartment: str(siege.departement) || (postal ? postal.slice(0, 2) : null),
    hqAddress: str(siege.adresse),
    employeeTrancheCode: str(raw.tranche_effectif_salarie) || str(siege.tranche_effectif_salarie),
    companyCategory: str(raw.categorie_entreprise),
    createdOn: str(raw.date_creation),
    administrativeState: str(raw.etat_administratif) || str(siege.etat_administratif),
    revenueEur: revenueEur,
    revenueYear: revenueYear,
  };
}
function erResolve(acc, candidates) {
  const empty = (reasons) => ({ decision: 'unresolved', method: 'none', chosen: null, score: 0, margin: null, signals: [], blockers: [], reasons: reasons, candidates: [], canPropose: false });
  const known = erSiren(acc.knownSiren);
  if (known) {
    const exact = candidates.filter((c) => erSiren(c.siren) === known)[0];
    if (!exact) return empty(['Le compte porte le SIREN ' + known + ", absent des résultats du registre — appariement par nom refusé."]);
    const scored = erScoreCandidate(acc, exact);
    const contradicted = scored.blockers.length > 0 || scored.signals.some((s) => ['geography','known_naf','activity_section'].indexOf(s.key) !== -1 && s.value <= -0.5);
    return { decision: 'resolved', method: 'crm_siren', chosen: exact, score: Math.round((WEIGHTS.known_siren + scored.score) * 100) / 100, margin: null, signals: scored.signals, blockers: scored.blockers, reasons: [contradicted ? 'Entité imposée par le SIREN du CRM, mais des signaux la contredisent — à contrôler.' : 'Entité imposée par le SIREN déjà enregistré au CRM.'], candidates: [scored], canPropose: !contradicted };
  }
  const eligible = candidates.map((c) => erScoreCandidate(acc, c)).filter((s) => s.nameScore >= NAME_GATE_MIN)
    .sort((a, b) => (b.score - a.score) || (a.candidate.siren < b.candidate.siren ? -1 : 1));
  if (eligible.length === 0) return empty(["Aucun candidat ne porte un nom assez proche de celui du compte."]);
  const best = eligible[0];
  const runnerUp = eligible[1] || null;
  const margin = runnerUp ? Math.round((best.score - runnerUp.score) * 100) / 100 : null;
  const shortlist = eligible.slice(0, AUDIT_CANDIDATE_LIMIT);
  if (best.score < CANDIDATE_MIN_SCORE) {
    const r = empty(['Meilleur score ' + best.score + ' sous le seuil de candidature ' + CANDIDATE_MIN_SCORE + '.']);
    r.candidates = shortlist; return r;
  }
  const failures = best.blockers.slice();
  if (best.nameScore < RESOLVED_MIN_NAME_SCORE) failures.push('Proximité de nom insuffisante (' + best.nameScore.toFixed(2) + ').');
  if (best.score < RESOLVED_MIN_SCORE) failures.push('Score global insuffisant (' + best.score + ' < ' + RESOLVED_MIN_SCORE + ').');
  if (margin !== null && margin < RESOLVED_MIN_MARGIN) failures.push('Appariement ambigu : ' + best.candidate.siren + ' et ' + runnerUp.candidate.siren + ' séparés de ' + margin + ' seulement.');
  const geo = best.signals.filter((s) => s.key === 'geography')[0];
  const kn = best.signals.filter((s) => s.key === 'known_naf')[0];
  if (!((geo && geo.value > 0) || (kn && kn.value >= 0.6))) failures.push("Aucune confirmation indépendante du nom : ni la commune du siège ni le code NAF connu n'étayent l'appariement.");
  if (failures.length > 0) return { decision: 'needs_human_confirmation', method: 'registry_match', chosen: best.candidate, score: best.score, margin: margin, signals: best.signals, blockers: best.blockers, reasons: failures, candidates: shortlist, canPropose: false };
  return { decision: 'resolved', method: 'registry_match', chosen: best.candidate, score: best.score, margin: margin, signals: best.signals, blockers: [], reasons: ['Appariement net : score ' + best.score + '.'], candidates: shortlist, canPropose: true };
}

const accountIdentity = {
  name: ctx.canonical.name,
  legalName: ctx.canonical.legal_name,
  hqLocation: ctx.canonical.hq_location,
  sector: ctx.canonical.sector,
  employeeCount: ctx.canonical.employee_count,
  knownSiren: ctx.canonical.siren || null,
  knownNafCode: ctx.canonical.naf_code || null,
};

// Requêtes : le nom d'usage ET la raison sociale. Une seule requête sur `name` ne
// ramène PAS TOURNAIRE SA, même avec per_page=10 — vérifié le 2026-09-07.
const registryQueries = [];
for (const v of erVariants(accountIdentity.legalName, accountIdentity.name)) {
  if (registryQueries.length < 3 && registryQueries.indexOf(v) === -1) registryQueries.push(v);
}
if (accountIdentity.knownSiren) registryQueries.unshift(accountIdentity.knownSiren);

const registryStatus = Number(registryResponse.statusCode || 0);
const candidatesBySiren = new Map();
// Le premier appel est déjà fait par le nœud « V3 Fetch Public Registry » (requête
// sur canonical.name) : on l'exploite avant d'en émettre d'autres.
if (registryStatus >= 200 && registryStatus < 300) {
  const firstResults = Array.isArray((registryResponse.body || {}).results) ? registryResponse.body.results : [];
  for (const raw of firstResults) { const c = erNormalizeResult(raw); if (c && !candidatesBySiren.has(c.siren)) candidatesBySiren.set(c.siren, c); }
} else {
  warnings.push('Registre public injoignable (statut ' + (registryStatus || 'inconnu') + ') sur la première requête.');
}
for (const query of registryQueries) {
  if (candidatesBySiren.size >= 20) break;
  try {
    const data = await this.helpers.httpRequest({
      method: 'GET',
      url: 'https://recherche-entreprises.api.gouv.fr/search?q=' + encodeURIComponent(query) + '&per_page=' + REGISTRY_PER_PAGE + '&page=1',
      json: true,
      timeout: 15000,
    });
    const results = Array.isArray(data && data.results) ? data.results : [];
    for (const raw of results) { const c = erNormalizeResult(raw); if (c && !candidatesBySiren.has(c.siren)) candidatesBySiren.set(c.siren, c); }
  } catch (e) {
    warnings.push('Requête registre « ' + query + ' » en échec.');
  }
}

const resolution = erResolve(accountIdentity, Array.from(candidatesBySiren.values()));
entityResolution = {
  decision: resolution.decision,
  method: resolution.method,
  siren: resolution.chosen ? resolution.chosen.siren : null,
  legal_name: resolution.chosen ? resolution.chosen.legalName : null,
  naf_code: resolution.chosen ? resolution.chosen.nafCode : null,
  naf_section: resolution.chosen ? resolution.chosen.nafSection : null,
  hq_commune: resolution.chosen ? resolution.chosen.hqCommune : null,
  hq_postal_code: resolution.chosen ? resolution.chosen.hqPostalCode : null,
  score: resolution.score,
  margin: resolution.margin,
  reasons: resolution.reasons,
  blockers: resolution.blockers,
  signals: resolution.signals.map((s) => ({ key: s.key, value: s.value, detail: s.detail })),
  candidates: resolution.candidates.map((c) => ({ siren: c.candidate.siren, legal_name: c.candidate.legalName, commune: c.candidate.hqCommune, naf_code: c.candidate.nafCode, score: c.score })),
  needs_human_confirmation: resolution.decision === 'needs_human_confirmation',
  can_propose_canonical_writes: resolution.canPropose,
  queries: registryQueries,
  candidates_examined: candidatesBySiren.size,
};

if (resolution.decision !== 'resolved') {
  warnings.push("Entité légale non résolue (" + resolution.decision + ') : ' + resolution.reasons.join(' '));
  diagnostic.push({ channel: 'registry', url: 'recherche-entreprises.api.gouv.fr', consulted: true, reason: 'entity_' + resolution.decision, candidatesExamined: candidatesBySiren.size });
} else {
  const r = resolution.chosen;
  evidence.push({
    kind: 'registry',
    sourceKey: 'account_knowledge:registry:' + r.siren,
    sourceType: 'regulatory_filing',
    sourceName: "Recherche d'entreprises (data.gouv.fr / INSEE Sirene)",
    url: 'https://recherche-entreprises.api.gouv.fr/search?q=' + r.siren,
    canonicalUrl: 'https://annuaire-entreprises.data.gouv.fr/entreprise/' + r.siren,
    domain: 'annuaire-entreprises.data.gouv.fr',
    publishedAt: null,
    consultedAt: nowIso,
    reliability: 0.97,
    collectionMethod: 'api',
    fingerprint: simpleHash(String(r.siren)),
    excerpt: ('SIREN ' + r.siren + ' — ' + (r.legalName || '')).slice(0, 500),
    covers: "Identite juridique officielle : raison sociale, SIREN, code NAF, siege, tranche d'effectif.",
    registry: {
      siren: r.siren,
      legalName: r.legalName,
      nafCode: r.nafCode,
      activityLabel: null,
      hqLocation: [r.hqCommune, r.hqPostalCode].filter(Boolean).join(' ') || null,
      employeeCount: Object.prototype.hasOwnProperty.call(TRANCHE_MIDPOINT, String(r.employeeTrancheCode || '')) ? TRANCHE_MIDPOINT[String(r.employeeTrancheCode)] : null,
      employeeCountIsEstimate: true,
      matchScore: resolution.score,
      resolutionMethod: resolution.method,
      revenueEur: r.revenueEur,
      revenueYear: r.revenueYear,
    },
    text: JSON.stringify({
      siren: r.siren,
      raison_sociale: r.legalName,
      activite_principale: r.nafCode,
      section_activite_principale: r.nafSection,
      siege: { commune: r.hqCommune, code_postal: r.hqPostalCode },
      tranche_effectif_salarie: r.employeeTrancheCode,
      chiffre_affaires: r.revenueEur,
      exercice: r.revenueYear,
    }),
  });
  diagnostic.push({ channel: 'registry', url: 'recherche-entreprises.api.gouv.fr', consulted: true, reason: 'ok', matchScore: resolution.score, resolutionMethod: resolution.method, candidatesExamined: candidatesBySiren.size });
}

"""


def patch_registry_fetch(workflow: dict) -> None:
    for node in workflow["nodes"]:
        if node["name"] != "V3 Fetch Public Registry":
            continue
        url = node["parameters"]["url"]
        if "per_page=3" not in url:
            raise SystemExit("V3 Fetch Public Registry : per_page=3 introuvable, workflow déjà patché ?")
        node["parameters"]["url"] = url.replace("per_page=3", "per_page=10")
        return
    raise SystemExit("Nœud « V3 Fetch Public Registry » introuvable")


def patch_consult_node(workflow: dict) -> None:
    for node in workflow["nodes"]:
        if node["name"] != "V3 Consult & Normalize Sources":
            continue
        code = node["parameters"]["jsCode"]
        start = code.index(REGISTRY_BLOCK_START)
        end = code.index(PRESS_BLOCK_START)
        head = code[:start]
        tail = code[end:]

        # `entityResolution` est déclaré avec les autres accumulateurs, en tête.
        head = head.replace(
            "const diagnostic = [];",
            "const diagnostic = [];\n// Résolution d'entité légale — jamais null : une non-résolution est un résultat.\nlet entityResolution = null;",
            1,
        )
        tail = tail.replace(
            "return [{ json: { externalEvidence: evidence, researchWarnings: warnings, researchDiagnostic: diagnostic, researchPerformed: true } }];",
            "return [{ json: { externalEvidence: evidence, researchWarnings: warnings, researchDiagnostic: diagnostic, researchPerformed: true, entityResolution: entityResolution } }];",
            1,
        )
        node["parameters"]["jsCode"] = head + ENTITY_RESOLUTION_BLOCK + tail
        return
    raise SystemExit("Nœud « V3 Consult & Normalize Sources » introuvable")


PROPOSAL_GUARD = """
// ── Garde de résolution d'entité (Lot 1) ────────────────────────────────────
// Aucune proposition sur les champs canoniques d'identité tant que l'entité légale
// n'est pas résolue sans ambiguïté. C'est ce garde-fou qui manquait le 2026-09-04 :
// quatre propositions à 0,85-0,95 de confiance portaient l'identité d'une autre
// société, prêtes à écraser la fiche compte.
const entityResolution = data.entityResolution || null;
const entityResolved = !!(entityResolution && entityResolution.can_propose_canonical_writes);
if (!entityResolved) {
  warnings.push(
    "Entité légale non résolue (" + (entityResolution ? entityResolution.decision : 'absente') +
    ") — aucune proposition sur les données canoniques d'identité."
  );
}
"""


def patch_proposals_node(workflow: dict) -> None:
    for node in workflow["nodes"]:
        if node["name"] != "V3 Build Enrichment Proposals":
            continue
        code = node["parameters"]["jsCode"]
        anchor = "if (registryEvidence && registryEvidence.registry) {"
        if anchor not in code:
            raise SystemExit("V3 Build Enrichment Proposals : ancre introuvable")
        code = code.replace(anchor, PROPOSAL_GUARD + "\n" + "if (entityResolved && registryEvidence && registryEvidence.registry) {", 1)
        code = code.replace(
            "warnings.push('Aucune entite juridique resolue : aucune proposition sur les donnees canoniques legales.');",
            "warnings.push(\"Aucune entite juridique resolue : aucune proposition sur les donnees canoniques legales.\");",
            1,
        )
        node["parameters"]["jsCode"] = code
        return
    raise SystemExit("Nœud « V3 Build Enrichment Proposals » introuvable")


def check_syntax(workflow: dict) -> None:
    """`node --check` sur chaque nœud Code touché — l'échappement JSON est le piège n°1."""
    for node in workflow["nodes"]:
        if node.get("type") != "n8n-nodes-base.code":
            continue
        if node["name"] not in {"V3 Consult & Normalize Sources", "V3 Build Enrichment Proposals"}:
            continue
        code = node["parameters"]["jsCode"]
        # Les nœuds Code n8n tournent dans une fonction async : on enveloppe pour
        # que `await` au niveau racine soit légal.
        wrapped = "(async () => {\n" + code + "\n})();"
        with tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False, encoding="utf-8") as handle:
            handle.write(wrapped)
            path = handle.name
        result = subprocess.run(["node", "--check", path], capture_output=True, text=True)
        if result.returncode != 0:
            sys.stderr.write(f"Syntaxe invalide dans « {node['name']} » :\n{result.stderr}\n")
            raise SystemExit(1)
        print(f"  node --check OK — {node['name']} ({len(code)} caractères)")


def main() -> None:
    workflow = json.loads(WORKFLOW.read_text(encoding="utf-8"))
    patch_registry_fetch(workflow)
    patch_consult_node(workflow)
    patch_proposals_node(workflow)
    check_syntax(workflow)
    WORKFLOW.write_text(json.dumps(workflow, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Écrit : {WORKFLOW.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

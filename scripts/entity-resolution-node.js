// ─── Résolution d'entité légale — transcription partagée pour nœuds Code n8n ──
//
// GÉNÉRÉ À LA MAIN, PAS AUTOMATIQUEMENT. Transcription de
// `src/lib/intelligence/entity-resolution.ts`, qui est la SOURCE DE VÉRITÉ et porte
// les tests. Toute évolution se fait là-bas d'abord, puis ici, puis on rejoue les
// scripts de patch (`patch-intel-030-entity-resolution.py`,
// `patch-intel-010-entity-resolution.py`).
//
// Ce fichier n'est jamais exécuté tel quel : il est INJECTÉ dans les nœuds Code des
// workflows n8n, qui n'ont pas d'imports. Les harnais
// `n8n/workflows/__tests__/intel-0*.test.js` vérifient que les deux workflows portent
// bien les mêmes invariants (seuils, garde de nom).

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

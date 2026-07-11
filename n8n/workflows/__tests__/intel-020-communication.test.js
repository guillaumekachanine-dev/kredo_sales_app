// Lot 10 — harnais Node : exécution réelle (pas seulement syntaxique) des
// nœuds Code de intel-020-communication.json, avec mocks pour $(), $env,
// this.helpers.httpRequestWithAuthentication. Pattern établi (Sessions
// 19-22) : aucun accès VPS/n8n disponible dans ces sessions, donc validation
// par simulation contrôlée plutôt que par génération LLM réelle.
//
// Ce fichier n'est PAS un test vitest (le workflow n'est pas du TypeScript
// applicatif, `npm test` ne le découvre pas — vitest.config.ts ne scanne que
// src/**/*.test.ts). Exécuter manuellement :
//   node n8n/workflows/__tests__/intel-020-communication.test.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const WORKFLOW_PATH = path.join(__dirname, "..", "intel-020-communication.json");
const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, "utf-8"));
const nodesByName = Object.fromEntries(workflow.nodes.map((n) => [n.name, n]));

let failures = 0;
let passed = 0;

function check(label, condition, detail) {
  if (condition) {
    passed++;
  } else {
    failures++;
    console.error(`FAIL: ${label}${detail ? " — " + detail : ""}`);
  }
}

function ok(label) {
  passed++;
  console.log(`ok  ${label}`);
}

function runCodeNode(nodeName, { registry, env, rpcMock, mode }) {
  const node = nodesByName[nodeName];
  if (!node) throw new Error(`Node not found: ${nodeName}`);
  const code = node.parameters.jsCode;
  const runMode = mode || node.parameters.mode;

  const calls = [];
  const helpers = {
    httpRequestWithAuthentication: {
      call: async (_ctx, credentialType, options) => {
        calls.push({ credentialType, options });
        const rpcName = options.url.split("/rpc/")[1];
        const fixture = rpcMock(rpcName, options.body);
        return fixture;
      },
    },
  };

  const $ = (name) => ({ item: { json: registry[name] } });
  const $env = env;
  const $input = { first: () => ({ json: registry.__input || {} }) };

  const thisContext = { helpers };
  const wrapped = `(async function() {\n${code}\n})`;
  const script = new vm.Script(wrapped, { filename: `${nodeName}.js` });
  const fn = script.runInThisContext();

  // Code is written assuming $, $env, $input are ambient (n8n injects them as
  // globals in the Code node sandbox) — since vm.Script here runs in the host
  // context, we inject them as actual globals BEFORE invoking the function:
  // an async function body runs synchronously up to its first `await`, so
  // setting globals after `fn.call()` would already be too late for any
  // reference made before that first await (e.g. Validate Brief's very first line).
  const sandboxGlobals = { $, $env, $input };
  const previous = {};
  for (const key of Object.keys(sandboxGlobals)) {
    previous[key] = global[key];
    global[key] = sandboxGlobals[key];
  }
  let runner;
  try {
    runner = fn.call(thisContext);
  } finally {
    for (const key of Object.keys(sandboxGlobals)) global[key] = previous[key];
  }
  return runner.then((result) => {
    registry[nodeName] = Array.isArray(result) ? result[0].json : result;
    return { result, calls };
  });
}

// ─── Fixtures RPC ────────────────────────────────────────────────────────
function baseRpcMock(overrides = {}) {
  return (rpcName, body) => {
    if (overrides[rpcName]) return overrides[rpcName](body);
    if (rpcName === "get_communication_context") {
      return { company: { id: body.p_company_id, name: "Acme", sector: "Tech", description: "Client actif" }, contact: body.p_contact_id ? { id: body.p_contact_id } : null, activeOpportunities: [], activeMissions: [], recentInteractions: [], sectorNews: [], sectorIntelligence: null, previousCommunications: [] };
    }
    if (rpcName === "get_pitch_context") {
      return { company: { id: body.p_company_id, name: "Acme" }, offer: { id: body.p_offer_id, name: "Cybersecurity Audit" }, pricingGrid: [{ practice: "Cybersecurity", tjm: 700 }], suggestedPractices: [{ slug: "cyber" }], deliveredPractices: [], anchorOpportunity: null, anchorMission: null, previousPitches: [], legacyPitches: [], scores: { conviction: 4, investment: 3 } };
    }
    if (rpcName === "get_collaborator_communication_context") {
      return { collaborator: { currentTitle: "Consultant Data", practice: "Data & AI", seniority: "Senior", status: "actif", availability: "en mission" }, person: { fullName: "Antoine F." }, managerProfile: { fullName: "Guillaume K." }, currentMission: { id: "m1", title: "Mission Acme", status: "active", roleTitle: "Data Engineer" }, recentMissions: [], jobProfile: { title: "Data Engineer", mainMission: "Pipelines de données" }, skills: [{ id: "s1", name: "Python" }, { id: "s2", name: "SQL" }], recentActivity: [], recentAbsences: [] };
    }
    throw new Error(`Unexpected RPC call in test: ${rpcName}`);
  };
}

function makeValidateBriefInput(overrides) {
  const secret = "hmac-ok";
  return {
    body: {
      runId: "run-1",
      workflowId: "intel-020-communication",
      entityType: "company",
      entityId: "company-1",
      workspaceId: "workspace-1",
      userId: "user-1",
      callbackUrl: "https://kredo.example/api/n8n/callback",
      input: {
        what: { channel: "email", scenario: "signal_outreach", outputKind: "written_message", length: "standard", activityCategory: "commerce_prospection", scope: "account" },
        who: { sender: { role: "business_manager", name: "Guillaume" }, recipient: { type: "prospect", persona: "other", relation: "warm" }, objective: "get_meeting" },
        how: { tone: "direct", formality: "vous", language: "fr" },
        context: {},
      },
      ...overrides.body,
    },
    headers: { "x-kredo-signature": `sha256=${secret}` },
    computedSignature: secret,
  };
}

function mergeBrief(base, patch) {
  return {
    ...base,
    what: { ...base.what, ...patch.what },
    who: { ...base.who, ...patch.who, recipient: { ...base.who.recipient, ...(patch.who && patch.who.recipient) } },
    how: { ...base.how, ...patch.how },
    context: { ...base.context, ...patch.context },
  };
}

async function runValidateBrief(inputOverrides) {
  const registry = { __input: makeValidateBriefInput(inputOverrides) };
  const { result } = await runCodeNode("Validate Brief", { registry, env: {}, rpcMock: baseRpcMock() });
  return result[0].json;
}

async function main() {
  // ── 1. Compte sans offre ──────────────────────────────────────────────
  {
    const vb = await runValidateBrief({ body: {} });
    check("1. compte sans offre — scope=account", vb.scope === "account");
    check("1. compte sans offre — requiresOffer=false", vb.requiresOffer === false);
    const registry = { "Validate Brief": vb };
    const { result, calls } = await runCodeNode("Hydrate Context", { registry, env: { SUPABASE_URL: "https://x.supabase.co" }, rpcMock: baseRpcMock() });
    check("1. compte sans offre — 1 seul appel RPC (pas de get_pitch_context)", calls.length === 1 && calls[0].options.url.includes("get_communication_context"), JSON.stringify(calls.map((c) => c.options.url)));
    check("1. compte sans offre — ctx.company présent", Boolean(result[0].json.company));
  }

  // ── 2. Compte avec offre obligatoire ──────────────────────────────────
  {
    let threw = false;
    try {
      await runValidateBrief({ body: { input: mergeBrief(makeValidateBriefInput({ body: {} }).body.input, { what: { scenario: "offer_introduction" } }) } });
    } catch (e) {
      threw = true;
      check("2. offre obligatoire sans offerRef — rejeté", /offerRef est requis/.test(e.message), e.message);
    }
    check("2. offre obligatoire sans offerRef — a bien levé une erreur", threw);

    const briefWithOffer = mergeBrief(makeValidateBriefInput({ body: {} }).body.input, { what: { scenario: "offer_introduction" }, context: { offerRef: "offer-1" } });
    const vb = await runValidateBrief({ body: { input: briefWithOffer } });
    check("2. offre obligatoire — requiresOffer=true", vb.requiresOffer === true);
    const registry = { "Validate Brief": vb };
    const { result, calls } = await runCodeNode("Hydrate Context", { registry, env: { SUPABASE_URL: "https://x.supabase.co" }, rpcMock: baseRpcMock() });
    check("2. offre obligatoire — 2 appels RPC (communication + pitch context, fusion)", calls.length === 2, JSON.stringify(calls.map((c) => c.options.url)));
    check("2. offre obligatoire — ctx fusionné contient company (général) ET offer (pitch)", Boolean(result[0].json.company) && Boolean(result[0].json.offer), JSON.stringify(result[0].json));
    check("2. offre obligatoire — ctx.pricingGrid présent (spécifique à get_pitch_context)", Array.isArray(result[0].json.pricingGrid) && result[0].json.pricingGrid.length > 0);
  }

  // ── 3. Recrutement candidat ────────────────────────────────────────────
  {
    const brief = mergeBrief(makeValidateBriefInput({ body: {} }).body.input, {
      what: { scenario: "candidate_follow_up", activityCategory: "recrutement" },
      who: { recipient: { type: "candidate" } },
      context: { profileRef: "candidate-1" },
    });
    const vb = await runValidateBrief({ body: { input: brief } });
    check("3. recrutement candidat — profileRef propagé", vb.profileRef === "candidate-1");
    check("3. recrutement candidat — scope=account (recrutement reste scope account)", vb.scope === "account");
  }

  // ── 4. Delivery avec mission ───────────────────────────────────────────
  {
    const brief = mergeBrief(makeValidateBriefInput({ body: {} }).body.input, {
      what: { scenario: "project_alert_escalation", activityCategory: "delivery" },
      who: { recipient: { type: "active_client" } },
      context: { missionRef: "mission-1" },
    });
    const vb = await runValidateBrief({ body: { input: brief } });
    const registry = { "Validate Brief": vb };
    const { calls } = await runCodeNode("Hydrate Context", { registry, env: { SUPABASE_URL: "https://x.supabase.co" }, rpcMock: baseRpcMock() });
    check("4. delivery avec mission — missionRef transmis au RPC", calls[0].options.body.p_mission_id === "mission-1");
  }

  // ── 5. Management consultant ───────────────────────────────────────────
  {
    const base = makeValidateBriefInput({ body: {} }).body;
    const brief = {
      what: { channel: "internal_note", scenario: "collaborator_recognition", outputKind: "written_message", length: "standard", activityCategory: "management_consultants", scope: "collaborator" },
      who: { sender: base.input.who.sender, recipient: { type: "collaborator", persona: "other", relation: "unknown", collaboratorId: "collab-1", displayName: "Antoine F." }, objective: "acknowledge_contribution" },
      how: { tone: "warm", formality: "tu", language: "fr" },
      context: { collaboratorRef: "collab-1" },
    };
    const vb = await runValidateBrief({ body: { entityType: "collaborator", entityId: "collab-1", input: brief } });
    check("5. management consultant — scope=collaborator", vb.scope === "collaborator");
    check("5. management consultant — collaboratorId résolu", vb.collaboratorId === "collab-1");
    const registry = { "Validate Brief": vb };
    const { result, calls } = await runCodeNode("Hydrate Context", { registry, env: { SUPABASE_URL: "https://x.supabase.co" }, rpcMock: baseRpcMock() });
    check("5. management consultant — 1 seul appel, get_collaborator_communication_context", calls.length === 1 && calls[0].options.url.includes("get_collaborator_communication_context"), JSON.stringify(calls.map((c) => c.options.url)));
    check("5. management consultant — jamais get_communication_context/get_pitch_context", !calls.some((c) => /get_communication_context|get_pitch_context/.test(c.options.url)));
    check("5. management consultant — ctx.collaborator présent", Boolean(result[0].json.collaborator));

    // Assemble Prompt doit choisir SYSTEM_PROMPT_BRIEFING_MANAGEMENT pour un
    // briefing management_consultants (bug corrigé : interne_management mort).
    const briefingBrief = { ...brief, what: { ...brief.what, scenario: "disciplinary_meeting_posture", outputKind: "structured_briefing", channel: "meeting_briefing" } };
    const vb2 = await runValidateBrief({ body: { entityType: "collaborator", entityId: "collab-1", input: briefingBrief } });
    const registry2 = { "Validate Brief": vb2 };
    await runCodeNode("Hydrate Context", { registry: registry2, env: { SUPABASE_URL: "https://x.supabase.co" }, rpcMock: baseRpcMock() });
    await runCodeNode("Resolve Sender", { registry: registry2, env: {}, rpcMock: baseRpcMock() }).catch(() => {
      registry2["Resolve Sender"] = { full_name: "Guillaume K." };
    });
    const { result: assembleResult } = await runCodeNode("Assemble Prompt", { registry: registry2, env: {}, rpcMock: baseRpcMock() });
    check("5. management consultant — briefing utilise SYSTEM_PROMPT_BRIEFING_MANAGEMENT (pas le prompt commercial)", assembleResult[0].json.systemPrompt.includes("collaborateur") && !assembleResult[0].json.systemPrompt.includes("CATALOGUE"), assembleResult[0].json.systemPrompt.slice(0, 120));
  }

  // ── 6 / 12. Staff interne sans référence — absence d'hydratation inutile ──
  {
    const base = makeValidateBriefInput({ body: {} }).body;
    const brief = {
      what: { channel: "internal_note", scenario: "internal_arbitrage_request", outputKind: "written_message", length: "standard", activityCategory: "internal_staff", scope: "internal" },
      who: { sender: base.input.who.sender, recipient: { type: "internal", persona: "other", relation: "unknown", internalRole: "manager_n1", internalRelationship: "hierarchical_up", internalDomain: "commercial" }, objective: "request_action" },
      how: { tone: "assertive", formality: "tu", language: "fr" },
      context: {},
    };
    const vb = await runValidateBrief({ body: { entityType: "workspace", entityId: "workspace-1", input: brief } });
    check("6. staff interne sans référence — scope=internal", vb.scope === "internal");
    const registry = { "Validate Brief": vb };
    const { result, calls } = await runCodeNode("Hydrate Context", { registry, env: { SUPABASE_URL: "https://x.supabase.co" }, rpcMock: baseRpcMock() });
    check("6/12. staff interne sans référence — ZÉRO appel RPC (absence d'hydratation inutile)", calls.length === 0, JSON.stringify(calls));
    check("6. staff interne sans référence — ctx.internalRecipient construit depuis le brief", result[0].json.internalRecipient && result[0].json.internalRecipient.role === "manager_n1");
  }

  // ── 7. Staff interne avec référence facultative ────────────────────────
  {
    const base = makeValidateBriefInput({ body: {} }).body;
    const brief = {
      what: { channel: "internal_note", scenario: "internal_alert_escalation", outputKind: "written_message", length: "standard", activityCategory: "internal_staff", scope: "internal" },
      who: { sender: base.input.who.sender, recipient: { type: "internal", persona: "other", relation: "unknown", internalRole: "manager_n1", internalRelationship: "hierarchical_up", internalDomain: "commercial" }, objective: "escalate_issue" },
      how: { tone: "assertive", formality: "tu", language: "fr" },
      context: { companyRef: "company-9" },
    };
    const vb = await runValidateBrief({ body: { entityType: "workspace", entityId: "workspace-1", input: brief } });
    check("7. staff interne avec référence — companyId résolu depuis context.companyRef", vb.companyId === "company-9");
    const registry = { "Validate Brief": vb };
    const { result, calls } = await runCodeNode("Hydrate Context", { registry, env: { SUPABASE_URL: "https://x.supabase.co" }, rpcMock: baseRpcMock() });
    check("7. staff interne avec référence — 1 appel RPC (enrichissement compte facultatif)", calls.length === 1 && calls[0].options.url.includes("get_communication_context"), JSON.stringify(calls.map((c) => c.options.url)));
    check("7. staff interne avec référence — ctx.internalRecipient ET ctx.company présents ensemble", Boolean(result[0].json.internalRecipient) && Boolean(result[0].json.company));
  }

  // ── 8. Source optionnelle désactivée ───────────────────────────────────
  {
    const brief = mergeBrief(makeValidateBriefInput({ body: {} }).body.input, {
      context: { disabledContextSources: ["signal_intelligence"] },
    });
    const vb = await runValidateBrief({ body: { input: brief } });
    check("8. source désactivée — absente de activeSources", !vb.activeSources.includes("signal_intelligence"));
    check("8. source désactivée — autres sources restent actives", vb.activeSources.includes("account_profile"));
    const registry = { "Validate Brief": vb };
    const { result } = await runCodeNode("Hydrate Context", { registry, env: { SUPABASE_URL: "https://x.supabase.co" }, rpcMock: baseRpcMock((rpcName, body) => {
      if (rpcName === "get_communication_context") return { company: { name: "Acme" }, sectorNews: [{ title: "News" }], sectorIntelligence: { name: "Tech" }, activeOpportunities: [], activeMissions: [], recentInteractions: [] };
    }) });
    check("8. source désactivée — ctx.sectorNews absent après filtrage", result[0].json.sectorNews === undefined);
    check("8. source désactivée — ctx.company toujours présent (source non désactivée)", Boolean(result[0].json.company));
  }

  // ── 9. Ancien brief legacy ──────────────────────────────────────────────
  {
    const legacyBrief = {
      what: { channel: "spoken_pitch_30s", scenario: "profile_submission", activityCategory: "interne_management", scope: "collaborator" },
      who: { sender: { role: "business_manager", name: "Guillaume" }, recipient: { type: "collaborator", persona: "other", relation: "unknown", collaboratorId: "collab-1" }, objective: "submit_profile" },
      how: { tone: "direct", formality: "vous", language: "fr" },
      context: {},
    };
    const vb = await runValidateBrief({ body: { entityType: "collaborator", entityId: "collab-1", input: legacyBrief } });
    check("9. legacy — outputKind dérivé du canal spoken_pitch_30s", vb.outputKind === "spoken_pitch");
    check("9. legacy — scenario renommé profile_submission_to_client", vb.scenario === "profile_submission_to_client");
    check("9. legacy — interne_management + collaborator normalisé en management_consultants", vb.activityCategory === "management_consultants");
  }

  // ── 10. Mauvais scope ───────────────────────────────────────────────────
  {
    const badBrief = mergeBrief(makeValidateBriefInput({ body: {} }).body.input, {
      what: { activityCategory: "management_consultants", scope: "account" },
    });
    let threw = false;
    try {
      await runValidateBrief({ body: { input: badBrief } });
    } catch (e) {
      threw = true;
      check("10. mauvais scope — message explicite", /Incohérence scope\/catégorie/.test(e.message), e.message);
    }
    check("10. mauvais scope — rejeté", threw);

    // Idem : internal_staff avec scope="account" doit aussi être rejeté.
    let threw2 = false;
    try {
      await runValidateBrief({ body: { input: mergeBrief(makeValidateBriefInput({ body: {} }).body.input, { what: { activityCategory: "internal_staff", scope: "account" } }) } });
    } catch (e) {
      threw2 = true;
    }
    check("10b. internal_staff + scope account — rejeté", threw2);

    // Staff interne SANS internalRole doit aussi être rejeté (champ obligatoire par scope).
    let threw3 = false;
    try {
      await runValidateBrief({ body: { entityType: "workspace", entityId: "workspace-1", input: { ...mergeBrief(makeValidateBriefInput({ body: {} }).body.input, { what: { activityCategory: "internal_staff", scope: "internal" } }) } } });
    } catch (e) {
      threw3 = true;
      check("10c. internal sans internalRole — message explicite", /internalRole est requis/.test(e.message), e.message);
    }
    check("10c. internal sans internalRole — rejeté", threw3);

    // Collaborator sans collaboratorRef doit être rejeté.
    let threw4 = false;
    try {
      await runValidateBrief({ body: { input: mergeBrief(makeValidateBriefInput({ body: {} }).body.input, { what: { activityCategory: "management_consultants", scope: "collaborator" } }) } });
    } catch (e) {
      threw4 = true;
      check("10d. collaborator sans collaboratorRef — message explicite", /collaboratorRef/.test(e.message), e.message);
    }
    check("10d. collaborator sans collaboratorRef — rejeté", threw4);
  }

  // ── 11. Référence d'un autre workspace (isolation par construction) ────
  {
    const brief = mergeBrief(makeValidateBriefInput({ body: {} }).body.input, { context: { opportunityRef: "opp-from-elsewhere" } });
    const vb = await runValidateBrief({ body: { workspaceId: "workspace-42", input: brief } });
    const registry = { "Validate Brief": vb };
    const { calls } = await runCodeNode("Hydrate Context", { registry, env: { SUPABASE_URL: "https://x.supabase.co" }, rpcMock: baseRpcMock() });
    check("11. isolation workspace — chaque appel RPC est scopé au workspace du run (p_workspace_id)", calls.every((c) => c.options.body.p_workspace_id === "workspace-42"), JSON.stringify(calls.map((c) => c.options.body.p_workspace_id)));
  }

  // ── Offer scenario set drift fix (extra, high-value regression) ────────
  {
    for (const scenario of ["offer_introduction", "cross_sell", "proposal_defense_pitch", "cold_call_pitch", "meeting_prep_cross_sell", "renewal_pitch"]) {
      let threw = false;
      try {
        await runValidateBrief({ body: { input: mergeBrief(makeValidateBriefInput({ body: {} }).body.input, { what: { scenario } }) } });
      } catch (e) {
        threw = true;
      }
      check(`extra. ${scenario} sans offerRef — rejeté (dérive front/n8n corrigée)`, threw);
    }
  }

  console.log(`\n${passed} passed, ${failures} failed`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error("HARNESS CRASHED:", e);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Chargement du fichier workflow JSON INTEL-021
const workflowPath = path.join(__dirname, '..', 'intel-021-monthly-watch-analysis.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

// Helper d'extraction d'un nœud par son nom
function getNode(name) {
  const node = workflow.nodes.find(n => n.name === name);
  if (!node) throw new Error(`Nœud non trouvé : ${name}`);
  return node;
}

// Sandbox d'exécution d'un nœud Code n8n
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function executeCodeNode(nodeName, inputItems, context = {}) {
  const node = getNode(nodeName);
  const code = node.parameters.jsCode;
  
  const fn = new AsyncFunction('$input', '$', '$execution', '$workflow', 'process', 'fetch', code);
  
  const $input = {
    first: () => inputItems[0],
    all: () => inputItems
  };

  const $ = (referencedNodeName) => {
    const item = context[referencedNodeName];
    if (!item) throw new Error(`Nœud référencé introuvable dans le contexte mock : ${referencedNodeName}`);
    return {
      item,
      all: () => Array.isArray(item) ? item : [item]
    };
  };

  const $execution = { id: 'test-exec-123' };
  const $workflow = { id: 'intel-021-monthly-watch-analysis' };

  return await fn.call(context.thisCtx || {}, $input, $, $execution, $workflow, process, context.fetch || globalThis.fetch);
}


let assertionsCount = 0;
function testAssert(condition, message) {
  assert.ok(condition, message);
  assertionsCount++;
}

(async () => {
  console.log('=== Test INTEL-021 V1 / V2 n8n Workflow ===');

  // ── 1. Nœud Validate Input ───────────────────────────────────────────────────

  const validHmacInputV1 = {
    json: {
      computedSignature: 'abc123v1',
      headers: { 'x-kredo-signature': 'sha256=abc123v1' },
      body: {
        runId: 'run-v1',
        workflowId: 'intel-021-monthly-watch-analysis',
        workspaceId: 'ws-1',
        userId: 'user-1',
        callbackUrl: 'https://kredo.app/api/n8n/callback',
        input: {
          schemaVersion: 1,
          periodStart: '2026-07-01',
          periodEnd: '2026-07-31',
          digestIds: ['digest-1'],
          articleIds: ['art-1'],
          requestedAt: '2026-08-01T00:00:00Z',
          triggerMode: 'manual'
        }
      }
    }
  };

  const v1Validated = await executeCodeNode('Validate Input', [validHmacInputV1]);
  testAssert(v1Validated[0].json.schemaVersion === 1, 'Validate Input valide V1 avec schemaVersion: 1');

  const validHmacInputV2 = {
    json: {
      computedSignature: 'abc123v2',
      headers: { 'x-kredo-signature': 'sha256=abc123v2' },
      body: {
        runId: 'run-v2',
        workflowId: 'intel-021-monthly-watch-analysis',
        workspaceId: 'ws-1',
        userId: 'user-1',
        callbackUrl: 'https://kredo.app/api/n8n/callback',
        input: {
          schemaVersion: 2,
          triggerMode: 'manual_custom',
          intention: 'Analyse IA',
          requestedAt: '2026-08-19T10:00:00Z',
          sources: [{ kind: 'account_signals', signalIds: ['sig-1'] }],
          refs: [{ kind: 'account_signal', id: 'sig-1' }],
          stats: { sourceGroups: 1, resolvedRefs: 1 }
        }
      }
    }
  };

  const v2Validated = await executeCodeNode('Validate Input', [validHmacInputV2]);
  testAssert(v2Validated[0].json.schemaVersion === 2, 'Validate Input valide V2 avec schemaVersion: 2');

  // Test schemaVersion invalide
  await assert.rejects(async () => {
    const invalidVer = JSON.parse(JSON.stringify(validHmacInputV2));
    invalidVer.json.body.input.schemaVersion = 99;
    await executeCodeNode('Validate Input', [invalidVer]);
  }, /schemaVersion invalide/, 'Validate Input rejette une version inconnue');

  // ── 2. Nœud Route Schema Version ─────────────────────────────────────────────

  const routeV1 = await executeCodeNode('Route Schema Version', [{ json: { schemaVersion: 1 } }]);
  testAssert(routeV1[0].length === 1 && routeV1[1].length === 0, 'Route Schema Version dirige V1 vers la sortie 0');

  const routeV2 = await executeCodeNode('Route Schema Version', [{ json: { schemaVersion: 2 } }]);
  testAssert(routeV2[0].length === 0 && routeV2[1].length === 1, 'Route Schema Version dirige V2 vers la sortie 1');

  // ── 3. Nœud Hydrate Corpus V2 ────────────────────────────────────────────────

  const routeContextV2 = {
    'Route Schema Version': {
      json: {
        runId: 'run-v2',
        workspaceId: 'ws-1',
        input: {
          schemaVersion: 2,
          triggerMode: 'manual_custom',
          intention: 'Analyse de risques',
          requestedAt: '2026-08-19T10:00:00Z',
          refs: [
            { kind: 'account_signal', id: 'sig-1' },
            { kind: 'veille_article', id: 'art-10' }
          ],
          stats: { sourceGroups: 2, resolvedRefs: 2 }
        }
      }
    }
  };

  const mockFetch = async (url) => {
    if (url.includes('account_signals')) {
      return {
        ok: true,
        json: async () => [{ id: 'sig-1', title: 'Signal IA', summary: 'Résumé signal', category: 'ia', detected_at: '2026-08-10' }]
      };
    }
    if (url.includes('veille_articles')) {
      return {
        ok: true,
        json: async () => [{ id: 'art-10', titre_fr: 'Article Cyber', source_name: 'Les Echos', resume: 'Résumé cyber' }]
      };
    }
    return { ok: false };
  };

  const hydrated = await executeCodeNode('Hydrate Corpus V2', [{ json: {} }], { ...routeContextV2, fetch: mockFetch });
  testAssert(hydrated[0].json.hydratedCorpus.length === 2, 'Hydrate Corpus V2 hydrate 2 items');
  testAssert(hydrated[0].json.hydratedCorpus[0].id === 'sig-1', 'Hydrate Corpus V2 conserve les IDs des items');
  testAssert(hydrated[0].json.hydratedCorpus[1].kind === 'veille_article', 'Hydrate Corpus V2 conserve le kind');

  // ── 4. Nœud Assemble Prompt V2 ─────────────────────────────────────────────

  const assembleContextV2 = {
    'Hydrate Corpus V2': {
      json: hydrated[0].json
    }
  };

  const assembled = await executeCodeNode('Assemble Prompt V2', [{ json: {} }], assembleContextV2);
  testAssert(assembled[0].json.systemPrompt.includes('evidenceRefs'), 'Assemble Prompt V2 contient la consigne evidenceRefs dans le systemPrompt');
  testAssert(assembled[0].json.userPrompt.includes('Analyse de risques'), 'Assemble Prompt V2 inclut l’intention utilisateur dans le userPrompt');

  // ── 5. Nœud Validate Output V2 ─────────────────────────────────────────────

  const assembleOutputContextV2 = {
    'Assemble Prompt V2': {
      json: assembled[0].json
    }
  };

  const validLlmResponseV2 = {
    json: {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            schemaVersion: 2,
            analysisKind: 'manual_custom',
            title: 'Synthèse des opportunités IA',
            executiveSummary: 'Une synthèse complète.',
            majorTrends: [
              { title: 'Tendance 1', synthesis: 'Détail 1', sectors: ['Tech'], confidence: 0.9, evidenceRefs: [{ kind: 'account_signal', id: 'sig-1' }] }
            ],
            weakSignals: [
              { title: 'Signal 1', synthesis: 'Détail signal', evidenceRefs: [{ kind: 'veille_article', id: 'art-10' }] }
            ],
            regulatoryDevelopments: [],
            commercialOpportunities: [],
            risksAndWatchpoints: [],
            priorityActions: [],
            coverage: { sourceGroups: 2, resolvedRefs: 2, articlesCount: 1, signalsCount: 1, documentsCount: 0, totalItems: 2 }
          })
        }
      ],
      usage: { input_tokens: 100, output_tokens: 200 },
      model: 'claude-sonnet-5'
    }
  };

  const validatedOutV2 = await executeCodeNode('Validate Output V2', [validLlmResponseV2], assembleOutputContextV2);
  testAssert(validatedOutV2[0].json.output.schemaVersion === 2, 'Validate Output V2 valide schemaVersion 2');
  testAssert(validatedOutV2[0].json.output.majorTrends[0].evidenceRefs[0].title === 'Signal IA', 'Validate Output V2 reconstruit le titre de evidenceRef depuis le corpus hydraté');
  testAssert(validatedOutV2[0].json.output.coverage.articlesCount === 1, 'Validate Output V2 recalcule le nombre d’articles dans la couverture');

  // Test evidenceRef inconnu (doit rejeter)
  await assert.rejects(async () => {
    const invalidRefLlmResponse = JSON.parse(JSON.stringify(validLlmResponseV2));
    const badText = JSON.parse(invalidRefLlmResponse.json.content[0].text);
    badText.majorTrends[0].evidenceRefs = [{ kind: 'account_signal', id: 'sig-inconnu-999' }];
    invalidRefLlmResponse.json.content[0].text = JSON.stringify(badText);
    await executeCodeNode('Validate Output V2', [invalidRefLlmResponse], assembleOutputContextV2);
  }, /evidenceRef inconnu ou hors corpus/, 'Validate Output V2 rejette les evidenceRefs inconnues');

  // ── 6. Nœud Prepare Callback V2 ───────────────────────────────────────────

  const validateOutputContextV2 = {
    'Validate Output V2': {
      json: validatedOutV2[0].json
    }
  };

  const callbackDataV2 = await executeCodeNode('Prepare Callback V2', [validatedOutV2[0]], validateOutputContextV2);
  const parsedCallbackV2 = JSON.parse(callbackDataV2[0].json.rawBody);
  testAssert(parsedCallbackV2.resultType === 'strategic_watch_analysis', 'Prepare Callback V2 utilise le resultType strategic_watch_analysis');
  testAssert(parsedCallbackV2.status === 'succeeded', 'Prepare Callback V2 renvoie le status succeeded');
  testAssert(parsedCallbackV2.contextSnapshot.triggerMode === 'manual_custom', 'Prepare Callback V2 trace triggerMode: manual_custom dans contextSnapshot');

  console.log(`\n✅ TOUS LES TESTS INTEL-021 V1/V2 ONT RÉUSSI (${assertionsCount} assertions)`);
})();


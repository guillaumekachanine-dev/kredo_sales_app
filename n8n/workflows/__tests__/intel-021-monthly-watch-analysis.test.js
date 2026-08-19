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
    const itemList = Array.isArray(item) ? item : [item];
    return {
      item,
      first: () => itemList[0],
      all: () => itemList
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

  // ── 2. Nœud Route Schema Version (Switch Natif) ────────────────────────────────

  const routeNode = getNode('Route Schema Version');
  testAssert(routeNode.type === 'n8n-nodes-base.switch', 'Route Schema Version est un nœud Switch natif (n8n-nodes-base.switch)');
  testAssert(routeNode.type !== 'n8n-nodes-base.code', 'Route Schema Version n’est plus un Code node');

  const rules = routeNode.parameters?.rules?.values || [];
  testAssert(rules.length === 2, 'Route Schema Version contient exactement deux règles de routage');

  const v1Condition = rules[0]?.conditions?.conditions?.[0];
  testAssert(
    v1Condition?.leftValue === '={{ $json.schemaVersion }}' && v1Condition?.rightValue === 1,
    'Règle 0 (sortie V1) filtre sur schemaVersion === 1'
  );

  const v2Condition = rules[1]?.conditions?.conditions?.[0];
  testAssert(
    v2Condition?.leftValue === '={{ $json.schemaVersion }}' && v2Condition?.rightValue === 2,
    'Règle 1 (sortie V2) filtre sur schemaVersion === 2'
  );

  const routeConnections = workflow.connections['Route Schema Version']?.main || [];
  testAssert(
    routeConnections[0]?.[0]?.node === 'Mark Run Running',
    'Sortie 0 (V1) est connectée au nœud Mark Run Running'
  );
  testAssert(
    routeConnections[1]?.[0]?.node === 'Mark Run Running V2',
    'Sortie 1 (V2) est connectée au nœud Mark Run Running V2'
  );

  // ── 3. Nœud Hydration V2 (Prepare Requests -> Fetch HTTP -> Assemble Corpus) ──

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

  // 3a. Nœud Prepare Hydration Requests V2 (génération pure de requêtes)
  const preparedRequests = await executeCodeNode('Prepare Hydration Requests V2', [{ json: {} }], routeContextV2);
  testAssert(preparedRequests.length === 2, 'Prepare Hydration Requests V2 produit 2 requêtes pour 2 refs');
  testAssert(preparedRequests[0].json.url.includes('account_signals'), 'Prepare Hydration Requests V2 génère la requête account_signals');
  testAssert(preparedRequests[0].json.url.includes('category:signal_category'), 'La requête account_signals utilise l’alias PostgREST category:signal_category');
  testAssert(!preparedRequests[0].json.url.includes('summary,category,detected_at'), 'La requête account_signals ne contient plus la colonne category sans alias');
  testAssert(preparedRequests[1].json.url.includes('veille_articles'), 'Prepare Hydration Requests V2 génère la requête veille_articles');

  // 3b. Nœud Fetch Corpus V2 (vérification statique HTTP Request natif)
  const fetchNode = getNode('Fetch Corpus V2');
  testAssert(fetchNode.type === 'n8n-nodes-base.httpRequest', 'Fetch Corpus V2 est un nœud HTTP Request natif (n8n-nodes-base.httpRequest)');
  testAssert(fetchNode.parameters.nodeCredentialType === 'supabaseApi', 'Fetch Corpus V2 utilise le credential supabaseApi');
  testAssert(fetchNode.parameters.authentication === 'predefinedCredentialType', 'Fetch Corpus V2 utilise predefinedCredentialType');
  testAssert(fetchNode.parameters.url === '={{ $json.url }}', 'Fetch Corpus V2 évalue dynamiquement le champ url');

  // 3c. Nœud Assemble Hydrated Corpus V2 (assemblage & normalisation des réponses)
  const mockFetchedItems = [
    { json: [{ id: 'sig-1', company_id: 'c-1', title: 'Signal IA', summary: 'Résumé signal', category: 'ia', detected_at: '2026-08-10' }] },
    { json: [{ id: 'art-10', digest_id: 'd-1', titre_fr: 'Article Cyber', source_name: 'Les Echos', resume: 'Résumé cyber' }] }
  ];

  const assembleHydrateContext = {
    ...routeContextV2,
    'Prepare Hydration Requests V2': preparedRequests
  };

  const hydrated = await executeCodeNode('Assemble Hydrated Corpus V2', mockFetchedItems, assembleHydrateContext);
  testAssert(hydrated[0].json.hydratedCorpus.length === 2, 'Assemble Hydrated Corpus V2 assemble 2 items');
  testAssert(hydrated[0].json.hydratedCorpus[0].id === 'sig-1', 'Assemble Hydrated Corpus V2 conserve les IDs des items');
  testAssert(hydrated[0].json.hydratedCorpus[1].kind === 'veille_article', 'Assemble Hydrated Corpus V2 conserve le kind');

  // 3d. Contrôle d'absence de process.env, fetch( et this.helpers.httpRequest dans TOUS les Code nodes
  for (const node of workflow.nodes) {
    if (node.type === 'n8n-nodes-base.code') {
      const code = node.parameters?.jsCode || '';
      testAssert(!code.includes('process.env'), `Le Code node "${node.name}" ne contient aucun process.env`);
      testAssert(!code.includes('fetch('), `Le Code node "${node.name}" ne contient aucun appel fetch(`);
      testAssert(!code.includes('this.helpers.httpRequest'), `Le Code node "${node.name}" ne contient aucun this.helpers.httpRequest`);
    }
  }

  // ── 4. Nœud Assemble Prompt V2 & Call LLM V2 (Structured Outputs) ──────────

  const assembleContextV2 = {
    'Assemble Hydrated Corpus V2': {
      json: hydrated[0].json
    }
  };

  const assembled = await executeCodeNode('Assemble Prompt V2', [{ json: {} }], assembleContextV2);
  testAssert(assembled[0].json.systemPrompt.includes('evidenceRefs'), 'Assemble Prompt V2 contient la consigne evidenceRefs dans le systemPrompt');
  testAssert(assembled[0].json.userPrompt.includes('Analyse de risques'), 'Assemble Prompt V2 inclut l’intention utilisateur dans le userPrompt');

  const llmV2Node = getNode('Call LLM V2');
  testAssert(llmV2Node.parameters.jsonBody.includes('output_config'), 'Call LLM V2 contient la clé output_config');
  testAssert(llmV2Node.parameters.jsonBody.includes("type: 'json_schema'"), 'Call LLM V2 demande output_config.format.type = json_schema');
  testAssert(!llmV2Node.parameters.jsonBody.includes('schemaVersion'), 'Call LLM V2 ne demande plus schemaVersion au LLM');
  testAssert(!llmV2Node.parameters.jsonBody.includes('analysisKind'), 'Call LLM V2 ne demande plus analysisKind au LLM');
  testAssert(!llmV2Node.parameters.jsonBody.includes('coverage'), 'Call LLM V2 ne demande plus coverage au LLM');

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
            title: 'Synthèse des opportunités IA',
            executiveSummary: 'Une synthèse complète.',
            majorTrends: [
              { title: 'Tendance 1', synthesis: 'Détail 1', sectors: ['Tech'], confidence: 0.9, evidenceRefs: ['account_signal:sig-1'] }
            ],
            weakSignals: [
              { title: 'Signal 1', synthesis: 'Détail signal', evidenceRefs: ['veille_article:art-10'] }
            ],
            regulatoryDevelopments: [],
            commercialOpportunities: [],
            risksAndWatchpoints: [],
            priorityActions: []
          })
        }
      ],
      usage: { input_tokens: 100, output_tokens: 200 },
      model: 'claude-sonnet-5'
    }
  };

  const validatedOutV2 = await executeCodeNode('Validate Output V2', [validLlmResponseV2], assembleOutputContextV2);
  testAssert(validatedOutV2[0].json.output.schemaVersion === 2, 'Validate Output V2 injecte schemaVersion 2');
  testAssert(validatedOutV2[0].json.output.analysisKind === 'manual_custom', 'Validate Output V2 injecte analysisKind manual_custom');
  testAssert(validatedOutV2[0].json.output.majorTrends[0].evidenceRefs[0].title === 'Signal IA', 'Validate Output V2 reconstruit le titre canonique de evidenceRef depuis le corpus');
  testAssert(validatedOutV2[0].json.output.majorTrends[0].evidenceRefs[0].kind === 'account_signal', 'Validate Output V2 reconstruit le kind de evidenceRef');
  testAssert(validatedOutV2[0].json.output.coverage.articlesCount === 1, 'Validate Output V2 recalcule le nombre d’articles dans la couverture');

  // Test evidenceRef inconnu (doit être rejeté par Validate Output V2)
  let validationError = null;
  await assert.rejects(async () => {
    const invalidRefLlmResponse = JSON.parse(JSON.stringify(validLlmResponseV2));
    const badText = JSON.parse(invalidRefLlmResponse.json.content[0].text);
    badText.majorTrends[0].evidenceRefs = ['account_signal:sig-inconnu-999'];
    invalidRefLlmResponse.json.content[0].text = JSON.stringify(badText);
    try {
      await executeCodeNode('Validate Output V2', [invalidRefLlmResponse], assembleOutputContextV2);
    } catch (err) {
      validationError = err;
      throw err;
    }
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

  // ── 7. Nœud Callback (HTTP Request Natif) ────────────────────────────────

  const callbackNode = getNode('Callback');
  testAssert(callbackNode.parameters.url === '={{ $json.callbackUrl }}', 'Callback utilise $json.callbackUrl pour son URL');
  testAssert(callbackNode.parameters.body === '={{ $json.rawBody }}', 'Callback utilise $json.rawBody pour son body');
  testAssert(!callbackNode.parameters.url.includes('Prepare Callback'), 'Callback ne référence plus Prepare Callback V1');
  testAssert(!callbackNode.parameters.url.includes('Prepare Callback V2'), 'Callback ne référence plus Prepare Callback V2');

  // ── 8. Nœuds de Gestion d'Échec (Prepare Failure Callback & Callback Failure) ──

  const prepFailureNode = getNode('Prepare Failure Callback');
  const failureCode = prepFailureNode.parameters?.jsCode || '';
  testAssert(!failureCode.includes("('Validate Input').item"), "Prepare Failure Callback n'utilise plus .item sur Validate Input");
  testAssert(!failureCode.includes("('Webhook — Monthly Watch').item"), "Prepare Failure Callback n'utilise plus .item sur Webhook");
  testAssert(failureCode.includes("('Webhook — Monthly Watch').first().json"), "Prepare Failure Callback utilise .first().json sur Webhook");

  const callbackFailureNode = getNode('Callback (Failure)');
  testAssert(callbackFailureNode.parameters.url === '={{ $json.callbackUrl }}', 'Callback (Failure) utilise $json.callbackUrl pour son URL');
  testAssert(callbackFailureNode.parameters.body === '={{ $json.rawBody }}', 'Callback (Failure) utilise $json.rawBody pour son body');
  testAssert(!callbackFailureNode.parameters.url.includes('Prepare Failure Callback'), 'Callback (Failure) ne référence plus Prepare Failure Callback dans son URL');

  // Test d'exécution réelle du Prepare Failure Callback suite à l'erreur de validation
  const webhookContext = {
    'Webhook — Monthly Watch': {
      json: {
        body: {
          runId: 'run-v2-fail-test',
          callbackUrl: 'https://kredo.app/api/n8n/callback'
        }
      }
    }
  };
  const failureInput = [{ json: { error: { message: validationError?.message || 'Erreur simulée' } } }];
  const prepFailureOutput = await executeCodeNode('Prepare Failure Callback', failureInput, webhookContext);
  testAssert(prepFailureOutput[0].json.callbackUrl === 'https://kredo.app/api/n8n/callback', 'Prepare Failure Callback extrait correctement callbackUrl depuis Webhook first()');
  const parsedFailureRawBody = JSON.parse(prepFailureOutput[0].json.rawBody);
  testAssert(parsedFailureRawBody.status === 'failed', 'Prepare Failure Callback produit un status failed');
  testAssert(parsedFailureRawBody.errorMessage.includes('evidenceRef inconnu'), 'Prepare Failure Callback capte le message d’erreur provenant de Validate Output V2');

  console.log(`\n✅ TOUS LES TESTS INTEL-021 V1/V2 ONT RÉUSSI (${assertionsCount} assertions)`);
})();


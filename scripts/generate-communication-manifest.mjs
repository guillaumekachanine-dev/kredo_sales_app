// INTEL-020 Lot 11 (C1) — Générateur de manifeste de scénarios de communication.
//
// La registry TypeScript (`src/lib/communication/communication-scenario-registry.ts`)
// est la SOURCE DE VÉRITÉ unique. Ce script en dérive un manifeste compact
// consommé par le workflow n8n `intel-020-communication`.
//
// Pourquoi un manifeste généré et inliné plutôt qu'un import direct :
// un nœud Code n8n s'exécute dans la sandbox du VPS, sans accès au TypeScript
// de l'app. La donnée registry doit donc être matérialisée AU BUILD-TIME :
//   1. écrite dans un artefact JSON versionné (référence + diff lisible) ;
//   2. inlinée dans le nœud `Assemble Prompt` du workflow, entre les marqueurs
//      `// MANIFEST:START` / `// MANIFEST:END`.
//
// Un test de drift (harnais Node) régénère le manifeste et échoue si l'artefact
// committé ou le bloc inliné diverge de la registry. Ainsi registry ⇔ manifeste
// ⇔ n8n restent toujours synchronisés (handoff §24.1).
//
// Node ≥ 23.6 déballe nativement les types TS ; la registry n'a que des
// `import type`, donc l'import direct du .ts fonctionne sans loader.
//
// Usage :
//   node scripts/generate-communication-manifest.mjs           # écrit + inline
//   node scripts/generate-communication-manifest.mjs --check   # échoue si drift

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const REGISTRY_PATH = resolve(ROOT, "src/lib/communication/communication-scenario-registry.ts");
const MANIFEST_JSON_PATH = resolve(ROOT, "n8n/workflows/intel-020-communication.manifest.json");
const WORKFLOW_PATH = resolve(ROOT, "n8n/workflows/intel-020-communication.json");
const NODE_NAME = "Assemble Prompt";
const MARKER_START = "// MANIFEST:START";
const MARKER_END = "// MANIFEST:END";

// ─── Construction du manifeste depuis la registry ───────────────────────────
export async function buildManifest() {
  const mod = await import(REGISTRY_PATH);
  const registry = mod.SCENARIO_REGISTRY;
  if (!Array.isArray(registry) || registry.length === 0) {
    throw new Error("SCENARIO_REGISTRY vide ou introuvable");
  }
  return registry
    .map((s) => ({
      id: s.id,
      category: s.activityCategory,
      label: s.label,
      description: s.description,
      allowedOutputKinds: [...s.allowedOutputKinds],
      defaultOutputKind: s.defaultOutputKind,
      defaultObjective: s.defaultObjective,
      requiresOffer: !!s.requiresOffer,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

// Sérialisation stable (mêmes clés, même ordre) pour un diff déterministe.
export function serializeManifest(manifest) {
  return JSON.stringify(manifest, null, 2) + "\n";
}

// Bloc JS inliné dans le nœud n8n.
function inlineBlock(manifest) {
  const compact = JSON.stringify(manifest);
  return `${MARKER_START}\nconst SCENARIO_MANIFEST = ${compact};\n${MARKER_END}`;
}

function injectIntoWorkflow(workflowJson, manifest) {
  const wf = JSON.parse(workflowJson);
  const node = wf.nodes.find((n) => n.name === NODE_NAME);
  if (!node) throw new Error(`Nœud "${NODE_NAME}" introuvable`);
  const code = node.parameters.jsCode;
  const startIdx = code.indexOf(MARKER_START);
  const endIdx = code.indexOf(MARKER_END);
  if (startIdx === -1 || endIdx === -1) {
    return { changed: false, json: workflowJson };
  }
  const before = code.slice(0, startIdx);
  const after = code.slice(endIdx + MARKER_END.length);
  node.parameters.jsCode = before + inlineBlock(manifest) + after;
  return { changed: true, json: JSON.stringify(wf, null, 2) + "\n" };
}

function extractInlinedManifest(workflowJson) {
  const wf = JSON.parse(workflowJson);
  const node = wf.nodes.find((n) => n.name === NODE_NAME);
  if (!node) return null;
  const code = node.parameters.jsCode;
  const m = code.match(/const SCENARIO_MANIFEST = (\[.*?\]);/s);
  return m ? JSON.parse(m[1]) : null;
}

async function main() {
  const check = process.argv.includes("--check");
  const manifest = await buildManifest();
  const expectedJson = serializeManifest(manifest);

  if (check) {
    let ok = true;
    const currentJson = readFileSync(MANIFEST_JSON_PATH, "utf8");
    if (currentJson !== expectedJson) {
      console.error("✗ DRIFT: l'artefact JSON diffère de la registry. Lance `node scripts/generate-communication-manifest.mjs`.");
      ok = false;
    }
    const inlined = extractInlinedManifest(readFileSync(WORKFLOW_PATH, "utf8"));
    if (JSON.stringify(inlined) !== JSON.stringify(manifest)) {
      console.error("✗ DRIFT: le bloc inliné dans le nœud n8n diffère de la registry.");
      ok = false;
    }
    if (!ok) process.exit(1);
    console.log(`✓ Manifeste synchronisé (${manifest.length} scénarios).`);
    return;
  }

  writeFileSync(MANIFEST_JSON_PATH, expectedJson);
  const { changed, json } = injectIntoWorkflow(readFileSync(WORKFLOW_PATH, "utf8"), manifest);
  if (changed) {
    writeFileSync(WORKFLOW_PATH, json);
    console.log(`✓ Manifeste écrit (${manifest.length} scénarios) + inliné dans "${NODE_NAME}".`);
  } else {
    console.log(`✓ Manifeste écrit (${manifest.length} scénarios). Marqueurs absents du nœud "${NODE_NAME}" — inline sauté.`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

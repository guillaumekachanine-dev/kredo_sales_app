"use strict"

/* eslint-disable @typescript-eslint/no-require-imports */

// Lot 0 « Gestion des sources » — le collecteur de la veille hebdomadaire.
//
// Le test central est `tourniquet` : il rejoue le scénario exact mesuré en base
// (4 digests sur 4 à 40/40 candidats pour 14 sources) et vérifie qu'une source
// ajoutée en fin de tableau produit désormais des candidats. Avec l'ancien
// `slice(0, 40)` positionnel, elle en produisait exactement zéro.

const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")

const workflowPath = path.join(__dirname, "..", "veille-hebdomadaire-kredo.json")
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"))
const nodes = Object.fromEntries(workflow.nodes.map((node) => [node.name, node]))

const DEDUP = "Dédup + Filtre Récence + Préfiltre Qualité"

let passed = 0
let failed = 0

function check(label, condition, detail = "") {
  if (condition) {
    passed += 1
    console.log(`ok   ${label}`)
    return
  }
  failed += 1
  console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""}`)
}

/** Exécute un nœud Code en `runOnceForAllItems` avec des voisins simulés. */
function runCodeNode(name, { input = [], registry = {} } = {}) {
  const node = nodes[name]
  if (!node) throw new Error(`Nœud introuvable : ${name}`)
  const items = input.map((json) => ({ json }))
  const sandbox = {
    $input: { first: () => items[0], all: () => items },
    $: (nodeName) => {
      if (!(nodeName in registry)) throw new Error(`Nœud non exécuté : ${nodeName}`)
      const rows = registry[nodeName]
      return {
        all: () => rows.map((json) => ({ json })),
        first: () => ({ json: rows[0] }),
        item: { json: rows[0] },
      }
    },
    console: { log() {}, error() {} },
    Date, JSON, Math, URL, Array, Object, Set, Map, Number, String, RegExp, Error,
  }
  const script = new vm.Script(`(() => {\n${node.parameters.jsCode}\n})()`, { filename: `${name}.js` })
  return script.runInContext(vm.createContext(sandbox))
}

// --- Fixtures ---------------------------------------------------------------

const CONFIG_SOURCES = runCodeNode("Config Sources KREDO", { input: [{}] })[0].json.sources

const JOUR = 24 * 60 * 60 * 1000

/** Un flux RSS réaliste : `n` articles frais, titres uniques. */
function fluxRss(source, n, { decalageJours = 0 } = {}) {
  return Array.from({ length: n }, (_, i) => ({
    title: `${source.name} — actualité numéro ${i + 1} du secteur`,
    link: `https://${source.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.example/a-${i}`,
    pubDate: new Date(Date.now() - (decalageJours * JOUR) - (i * 3600 * 1000)).toISOString(),
    contentSnippet: `Chapô de l'article ${i + 1}.`,
    sourceName: source.name,
    secteurDefaut: source.secteurDefaut,
    categorieDefaut: source.categorieDefaut,
  }))
}

/** Le cas réel : 14 sources qui publient abondamment, donc plafond saturé. */
function collecteNominale(articlesParSource = 20) {
  return CONFIG_SOURCES.flatMap((s) => fluxRss(s, articlesParSource))
}

function dedup(input, seen = []) {
  return runCodeNode(DEDUP, {
    input,
    registry: { "Récupérer Hash Articles Vus": seen },
  }).map((i) => i.json)
}

// --- 1. Structure : le défaut ne peut pas revenir ----------------------------

const codeDedup = nodes[DEDUP].parameters.jsCode
check(
  "structure — plus aucun slice positionnel dans le nœud de dédup",
  !/\.slice\(\s*0\s*,\s*40\s*\)/.test(codeDedup),
  "un slice(0, 40) a été réintroduit",
)
check(
  "structure — le plafond reste à 40 (le coût LLM ne bouge pas)",
  /MAX_CANDIDATS\s*=\s*40/.test(codeDedup),
)
check(
  "structure — nb_sources_actives ne lit plus la longueur du tableau de config",
  !nodes["Créer Digest"].parameters.jsonBody.includes("Config Sources KREDO').first().json.sources.length"),
)
check(
  "structure — nb_sources_actives lit les sources réellement contributrices",
  nodes["Créer Digest"].parameters.jsonBody.includes("sourcesContributrices"),
)
check(
  "structure — le socle compte toujours 14 sources",
  CONFIG_SOURCES.length === 14,
  `trouvé ${CONFIG_SOURCES.length}`,
)

// --- 2. Le test central : la 14e source contribue ----------------------------

const nominal = dedup(collecteNominale())

check(
  "tourniquet — le plafond de 40 est bien respecté",
  nominal.length === 40,
  `${nominal.length} candidats`,
)

const sourcesRepresentees = new Set(nominal.map((a) => a.source))
check(
  "tourniquet — les 14 sources contribuent toutes",
  sourcesRepresentees.size === 14,
  `${sourcesRepresentees.size} sources sur 14 : ${[...sourcesRepresentees].join(", ")}`,
)

const derniereSource = CONFIG_SOURCES[CONFIG_SOURCES.length - 1]
check(
  `tourniquet — la dernière source du tableau (${derniereSource.name}) produit des candidats`,
  nominal.some((a) => a.source === derniereSource.name),
  "c'est exactement ce que l'ancien slice(0, 40) rendait impossible",
)

const parSource = {}
for (const a of nominal) parSource[a.source] = (parSource[a.source] || 0) + 1
const min = Math.min(...Object.values(parSource))
const max = Math.max(...Object.values(parSource))
check(
  "tourniquet — la répartition est équitable (écart max 1)",
  max - min <= 1,
  `min ${min}, max ${max} — ${JSON.stringify(parSource)}`,
)

// --- 3. Régression : le comportement d'origine est préservé ------------------

check(
  "récence — un article de plus de 7 jours est écarté",
  dedup(fluxRss(CONFIG_SOURCES[0], 3, { decalageJours: 9 })).length === 0,
)

check(
  "récence — un article sans date est conservé (l'IA tranche)",
  dedup([{ ...fluxRss(CONFIG_SOURCES[0], 1)[0], pubDate: null }]).length === 1,
)

check(
  "qualité — un titre de 10 caractères ou moins est écarté",
  dedup([{ ...fluxRss(CONFIG_SOURCES[0], 1)[0], title: "Court" }]).length === 0,
)

const unArticle = fluxRss(CONFIG_SOURCES[0], 1)
const hashConnu = dedup(unArticle)[0].urlHash
check(
  "dédup — un article déjà vu (url_hash connu) est écarté",
  dedup(unArticle, [{ url_hash: hashConnu }]).length === 0,
)

check(
  "dédup — deux fois la même URL ne produit qu'un candidat",
  dedup([...unArticle, ...unArticle]).length === 1,
)

// --- 4. Dédup douce sur titre (ajout Lot 0) ---------------------------------

const memeTitre = [
  { ...fluxRss(CONFIG_SOURCES[0], 1)[0], title: "Acquisition majeure dans le cloud français" },
  { ...fluxRss(CONFIG_SOURCES[1], 1)[0], title: "Acquisition majeure dans le cloud français" },
  { ...fluxRss(CONFIG_SOURCES[2], 1)[0], title: "Acquisition majeure dans le Cloud Français !" },
]
check(
  "dédup douce — la même dépêche reprise par 3 éditeurs ne consomme qu'une place",
  dedup(memeTitre).length === 1,
  `${dedup(memeTitre).length} candidats`,
)

const anglesDifferents = [
  { ...fluxRss(CONFIG_SOURCES[0], 1)[0], title: "Acquisition majeure dans le cloud français" },
  { ...fluxRss(CONFIG_SOURCES[1], 1)[0], title: "Ce que l'acquisition change pour les DSI" },
]
check(
  "dédup douce — deux angles distincts restent deux candidats",
  dedup(anglesDifferents).length === 2,
)

// --- 5. Sources en erreur ----------------------------------------------------

const avecErreur = [
  ...fluxRss(CONFIG_SOURCES[0], 2),
  { skipped: true, sourceName: CONFIG_SOURCES[1].name, sourceUrl: CONFIG_SOURCES[1].rssUrl },
  ...fluxRss(CONFIG_SOURCES[2], 2),
]
const resErreur = dedup(avecErreur)
check(
  "erreur — un flux en erreur n'interrompt pas la collecte des autres",
  resErreur.length === 4,
  `${resErreur.length} candidats`,
)
check(
  "erreur — l'item { skipped: true } ne devient jamais un candidat",
  resErreur.every((a) => a.url && a.title),
)
check(
  "erreur — la source en erreur est comptée",
  resErreur[0].sourcesEnErreur === 1,
  `sourcesEnErreur = ${resErreur[0]?.sourcesEnErreur}`,
)

// --- 6. Métriques de run ------------------------------------------------------

check(
  "métriques — sourcesContributrices reflète la collecte réelle, pas la config",
  nominal[0].sourcesContributrices === 14,
  `${nominal[0].sourcesContributrices}`,
)

const troisSources = dedup(CONFIG_SOURCES.slice(0, 3).flatMap((s) => fluxRss(s, 5)))
check(
  "métriques — 3 sources qui publient ⇒ sourcesContributrices = 3 (et non 14)",
  troisSources[0].sourcesContributrices === 3,
  `${troisSources[0].sourcesContributrices}`,
)
check(
  "métriques — candidatsAvantPlafond expose ce que le plafond a écarté",
  nominal[0].candidatsAvantPlafond === 14 * 20,
  `${nominal[0].candidatsAvantPlafond}`,
)

// --- 7. Contrat de sortie inchangé pour l'aval --------------------------------

const CHAMPS_ATTENDUS = [
  "id", "title", "source", "url", "urlHash", "publishedAt", "summary",
  "secteurDefaut", "categorieDefaut",
]
check(
  "contrat — tous les champs consommés par « Construire Prompt Classement » sont présents",
  CHAMPS_ATTENDUS.every((c) => c in nominal[0]),
  CHAMPS_ATTENDUS.filter((c) => !(c in nominal[0])).join(", "),
)
check(
  "contrat — les identifiants restent art_0..art_n, contigus",
  nominal.every((a, i) => a.id === `art_${i}`),
)

// Le nœud aval doit réellement accepter cette sortie.
const promptNode = runCodeNode("Construire Prompt Classement", {
  input: nominal,
  registry: {
    "Build Contexte KREDO": [{ blocContexteKredo: "# CONTEXTE", secteursActifs: "Banque, Industrie" }],
  },
})
check(
  "contrat — « Construire Prompt Classement » consomme la sortie sans erreur",
  typeof promptNode[0].json.promptClassement === "string" && promptNode[0].json.promptClassement.length > 100,
)
check(
  "contrat — les 40 candidats sont tous dans candidatesById",
  Object.keys(promptNode[0].json.candidatesById).length === 40,
)

// --- 8. Cas limites -----------------------------------------------------------

check("limite — collecte vide ⇒ aucun candidat, aucune exception", dedup([]).length === 0)
check(
  "limite — une seule source disponible prend toutes les places",
  dedup(fluxRss(CONFIG_SOURCES[0], 60)).length === 40,
)
check(
  "limite — moins de 40 candidats disponibles ⇒ pas de boucle infinie",
  dedup(collecteNominale(1)).length === 14,
)

console.log(`\n${passed} ok · ${failed} échec(s)`)
process.exit(failed === 0 ? 0 : 1)

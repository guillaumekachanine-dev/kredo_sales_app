"use strict"

/* eslint-disable @typescript-eslint/no-require-imports */

// Lot 0 « Gestion des sources » a débloqué le collecteur (tourniquet par source).
// Lot 2 branche ce collecteur sur `v_effective_watch_sources` : ce harnais teste
// désormais aussi la lecture de la vue, les deux modes de collecte (rss /
// site_search), le déballage de la provenance Google News, la propagation de
// `source_catalog_id` et l'idempotence du digest.

const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")

const workflowPath = path.join(__dirname, "..", "veille-hebdomadaire-kredo.json")
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"))
const nodes = Object.fromEntries(workflow.nodes.map((node) => [node.name, node]))

const DEDUP = "Dédup + Filtre Récence + Préfiltre Qualité"
const VERIFIER = "Vérifier et Normaliser Sources"
const CONSTRUIRE_REQUETE = "Construire Requête Collecte"
const PARSER_GOOGLE_NEWS = "Parser Flux Google News"
const ENRICHIR = "Enrichir avec Métadonnées Source"
const IGNORER_ERREUR = "Ignorer Source En Erreur"
const PREPARER_LIGNES = "Préparer Lignes Articles"

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

function checkThrows(label, fn, detail = "") {
  try {
    fn()
    failed += 1
    console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""} — aucune exception levée`)
  } catch {
    passed += 1
    console.log(`ok   ${label}`)
  }
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

/** Exécute un nœud Code en `runOnceForEachItem` : une invocation par item d'entrée. */
function runCodeNodeForEachItem(name, { input = [], registry = {} } = {}) {
  const node = nodes[name]
  if (!node) throw new Error(`Nœud introuvable : ${name}`)
  const out = []
  for (const json of input) {
    const sandbox = {
      $json: json,
      $input: { first: () => ({ json }), all: () => [{ json }] },
      $: (nodeName) => {
        if (!(nodeName in registry)) throw new Error(`Nœud non exécuté : ${nodeName}`)
        const rows = registry[nodeName]
        return {
          all: () => rows.map((j) => ({ json: j })),
          first: () => ({ json: rows[0] }),
          item: { json: rows[0] },
        }
      },
      console: { log() {}, error() {} },
      Date, JSON, Math, URL, Array, Object, Set, Map, Number, String, RegExp, Error, encodeURIComponent,
    }
    const script = new vm.Script(`(() => {\n${node.parameters.jsCode}\n})()`, { filename: `${name}.js` })
    const result = script.runInContext(vm.createContext(sandbox))
    out.push(Array.isArray(result) ? result[0].json : result.json)
  }
  return out
}

// --- Fixtures ---------------------------------------------------------------

// Miroir des 14 lignes réelles de `v_effective_watch_sources` (usage_scope=news),
// snake_case tel que Supabase le renvoie. 10 rss + 4 site_search, mêmes noms et
// domaines que le socle système en base (migration 077).
const VIEW_ROWS = [
  { source_id: "src-lemagit", source_key: "LeMagIT", source_name: "LeMagIT", publisher: null, domain: null, search_domain: "lemagit.fr", collection_url: "https://www.lemagit.fr/rss/ContentSyndication.xml", collection_mode: "rss", family: null, kredo_category: "marche-esn", origin: "system", corpus_id: null, utility_score: 0, priority: 0 },
  { source_id: "src-channelnews", source_key: "ChannelNews", source_name: "ChannelNews", publisher: null, domain: null, search_domain: "channelnews.fr", collection_url: "https://www.channelnews.fr/feed/", collection_mode: "rss", family: null, kredo_category: "marche-esn", origin: "system", corpus_id: null, utility_score: 0, priority: 0 },
  { source_id: "src-usine-digitale", source_key: "L'Usine Digitale", source_name: "L'Usine Digitale", publisher: null, domain: null, search_domain: "usine-digitale.fr", collection_url: "https://www.usine-digitale.fr/arc/outboundfeeds/rss/", collection_mode: "rss", family: null, kredo_category: "vertical", origin: "system", corpus_id: null, utility_score: 0, priority: 0 },
  { source_id: "src-the-batch", source_key: "The Batch (DeepLearning.AI)", source_name: "The Batch (DeepLearning.AI)", publisher: null, domain: null, search_domain: "deeplearning.ai", collection_url: null, collection_mode: "site_search", family: null, kredo_category: "ia-appliquee", origin: "system", corpus_id: null, utility_score: 0, priority: 0 },
  { source_id: "src-one-useful-thing", source_key: "One Useful Thing", source_name: "One Useful Thing", publisher: null, domain: null, search_domain: "oneusefulthing.org", collection_url: "https://www.oneusefulthing.org/feed", collection_mode: "rss", family: null, kredo_category: "ia-appliquee", origin: "system", corpus_id: null, utility_score: 0, priority: 0 },
  { source_id: "src-venturebeat", source_key: "VentureBeat AI", source_name: "VentureBeat AI", publisher: null, domain: null, search_domain: "venturebeat.com", collection_url: "https://venturebeat.com/category/ai/feed/", collection_mode: "rss", family: null, kredo_category: "ia-appliquee", origin: "system", corpus_id: null, utility_score: 0, priority: 0 },
  { source_id: "src-anthropic-news", source_key: "Anthropic News", source_name: "Anthropic News", publisher: null, domain: null, search_domain: "anthropic.com", collection_url: null, collection_mode: "site_search", family: null, kredo_category: "frontier", origin: "system", corpus_id: null, utility_score: 0, priority: 0 },
  { source_id: "src-openai-news", source_key: "OpenAI News", source_name: "OpenAI News", publisher: null, domain: null, search_domain: "openai.com", collection_url: "https://openai.com/news/rss.xml", collection_mode: "rss", family: null, kredo_category: "frontier", origin: "system", corpus_id: null, utility_score: 0, priority: 0 },
  { source_id: "src-the-neuron", source_key: "The Neuron", source_name: "The Neuron", publisher: null, domain: null, search_domain: "theneuron.ai", collection_url: null, collection_mode: "site_search", family: null, kredo_category: "frontier", origin: "system", corpus_id: null, utility_score: 0, priority: 0 },
  { source_id: "src-a16z", source_key: "a16z", source_name: "a16z", publisher: null, domain: null, search_domain: "a16z.com", collection_url: null, collection_mode: "site_search", family: null, kredo_category: "strategie", origin: "system", corpus_id: null, utility_score: 0, priority: 0 },
  { source_id: "src-journal-du-net", source_key: "Journal du Net — IA", source_name: "Journal du Net — IA", publisher: null, domain: null, search_domain: "journaldunet.com", collection_url: "https://www.journaldunet.com/intelligence-artificielle/rss/", collection_mode: "rss", family: null, kredo_category: "strategie", origin: "system", corpus_id: null, utility_score: 0, priority: 0 },
  { source_id: "src-actuia", source_key: "ActuIA", source_name: "ActuIA", publisher: null, domain: null, search_domain: "actuia.com", collection_url: "https://www.actuia.com/feed/", collection_mode: "rss", family: null, kredo_category: "reglementaire", origin: "system", corpus_id: null, utility_score: 0, priority: 0 },
  { source_id: "src-finextra", source_key: "Finextra", source_name: "Finextra", publisher: null, domain: null, search_domain: "finextra.com", collection_url: "https://www.finextra.com/rss/headlines.aspx", collection_mode: "rss", family: null, kredo_category: "vertical", origin: "system", corpus_id: null, utility_score: 0, priority: 0 },
  { source_id: "src-premium-beauty", source_key: "Premium Beauty News", source_name: "Premium Beauty News", publisher: null, domain: null, search_domain: "premiumbeautynews.com", collection_url: "https://www.premiumbeautynews.com/spip.php?page=backend", collection_mode: "rss", family: null, kredo_category: "vertical", origin: "system", corpus_id: null, utility_score: 0, priority: 0 },
]

const CONFIG_SOURCES = runCodeNode(VERIFIER, { input: VIEW_ROWS })[0].json.sources

const JOUR = 24 * 60 * 60 * 1000

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

/** Une collecte enrichie réaliste : `n` articles frais, titres uniques, forme de sortie d'« Enrichir avec Métadonnées Source ». */
function fluxRss(source, n, { decalageJours = 0 } = {}) {
  return Array.from({ length: n }, (_, i) => ({
    title: `${source.sourceName} — actualité numéro ${i + 1} du secteur`,
    link: `https://${slug(source.sourceName)}.example/a-${i}`,
    pubDate: new Date(Date.now() - decalageJours * JOUR - i * 3600 * 1000).toISOString(),
    contentSnippet: `Chapô de l'article ${i + 1}.`,
    sourceName: source.sourceName,
    sourceId: source.sourceId,
    sourceKey: source.sourceKey,
    secteurDefaut: "transverse",
    categorieDefaut: source.kredoCategory,
    collectedVia: source.collectionMode === "rss" ? "rss_direct" : "google_news_site_search",
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

// --- 1. Structure : plus de tableau éditorial en dur -------------------------

check(
  "structure — le nœud « Config Sources KREDO » a disparu",
  !("Config Sources KREDO" in nodes),
)
check(
  "structure — plus aucun slice positionnel dans le nœud de dédup",
  !/\.slice\(\s*0\s*,\s*40\s*\)/.test(nodes[DEDUP].parameters.jsCode),
  "un slice(0, 40) a été réintroduit",
)
check(
  "structure — le plafond reste à 40 (le coût LLM ne bouge pas)",
  /MAX_CANDIDATS\s*=\s*40/.test(nodes[DEDUP].parameters.jsCode),
)

// --- 2. Lecture de v_effective_watch_sources ----------------------------------

const chargerSources = nodes["Charger Sources Effectives (Supabase)"]
check(
  "lecture — un nœud interroge v_effective_watch_sources",
  !!chargerSources && chargerSources.parameters.url.includes("v_effective_watch_sources"),
)
const queryParams = chargerSources.parameters.queryParameters.parameters
check(
  "lecture — le filtre usage_scope=eq.news est appliqué",
  queryParams.some((p) => p.name === "usage_scope" && p.value === "eq.news"),
)
check(
  "lecture — le tri priority asc, utility_score desc est demandé",
  queryParams.some((p) => p.name === "order" && p.value === "priority.asc,utility_score.desc"),
)
check(
  "lecture — le socle compte toujours 14 sources normalisées",
  CONFIG_SOURCES.length === 14,
  `trouvé ${CONFIG_SOURCES.length}`,
)
check(
  "lecture — le contrat de sortie porte les champs attendus",
  ["sourceId", "sourceKey", "sourceName", "searchDomain", "collectionUrl", "collectionMode", "kredoCategory", "origin", "corpusId"].every(
    (c) => c in CONFIG_SOURCES[0],
  ),
)

// --- 3. Zéro source → échec explicite -----------------------------------------

checkThrows(
  "lecture — la vue renvoie 0 ligne ⇒ le run échoue explicitement (pas de digest vide silencieux)",
  () => runCodeNode(VERIFIER, { input: [] }),
)

// --- 4. Deux modes de collecte -------------------------------------------------

const sourceRss = CONFIG_SOURCES.find((s) => s.collectionMode === "rss")
const [requeteRss] = runCodeNodeForEachItem(CONSTRUIRE_REQUETE, { input: [sourceRss] })
check(
  "mode rss — l'URL de collecte est directement collection_url",
  requeteRss.feedUrl === sourceRss.collectionUrl && requeteRss.collectionMode === "rss",
)

const sourceSiteSearch = CONFIG_SOURCES.find((s) => s.collectionMode === "site_search")
const [requeteSiteSearch] = runCodeNodeForEachItem(CONSTRUIRE_REQUETE, { input: [sourceSiteSearch] })
check(
  "mode site_search — l'URL de collecte est une recherche Google News restreinte au domaine",
  requeteSiteSearch.collectionMode === "site_search" &&
    requeteSiteSearch.feedUrl.startsWith("https://news.google.com/rss/search?q=site:") &&
    requeteSiteSearch.feedUrl.includes(encodeURIComponent(sourceSiteSearch.searchDomain)),
)

const sourcesSiteSearch = CONFIG_SOURCES.filter((s) => s.collectionMode === "site_search")
check(
  "les 4 sources historiquement sans RSS direct sont de nouveau collectables (site_search)",
  sourcesSiteSearch.length === 4 &&
    sourcesSiteSearch.every((s) => !!s.searchDomain && !s.collectionUrl),
  `trouvé ${sourcesSiteSearch.length} : ${sourcesSiteSearch.map((s) => s.sourceName).join(", ")}`,
)

// --- 5. Provenance réelle (Google News) ---------------------------------------

const XML_GOOGLE_NEWS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<item>
  <title><![CDATA[L'IA générative séduit les DSI - The Batch]]></title>
  <link>https://news.google.com/rss/articles/CBMi0AFBVV95cUxN?oc=5</link>
  <pubDate>Mon, 11 Aug 2026 06:00:00 GMT</pubDate>
  <description><![CDATA[Un résumé de l'article.]]></description>
  <source url="https://www.deeplearning.ai/the-batch/">The Batch</source>
</item>
<item>
  <title>Article sans balise source</title>
  <link>https://example.com/orphan</link>
  <pubDate>Tue, 12 Aug 2026 06:00:00 GMT</pubDate>
  <description>Chapô.</description>
</item>
</channel></rss>`

const parsedGoogleNews = runCodeNode(PARSER_GOOGLE_NEWS, { input: [{ data: XML_GOOGLE_NEWS }] }).map((i) => i.json)
check(
  "provenance — 2 items extraits du flux Google News",
  parsedGoogleNews.length === 2,
  `${parsedGoogleNews.length} items`,
)
check(
  "provenance — l'éditeur réel est déballé depuis <source url>",
  parsedGoogleNews[0].realPublisher === "The Batch" && parsedGoogleNews[0].realPublisherUrl.includes("deeplearning.ai"),
)
check(
  "provenance — l'item sans balise <source> ne casse pas le parseur (realPublisher null)",
  parsedGoogleNews[1].realPublisher === null,
)

// Régression observée en run réel VPS (2026-08-15) : site:theneuron.ai n'a remonté
// AUCUN résultat (0 <item> dans un flux Google News par ailleurs valide). Un nœud
// Code qui renvoie un tableau vide dans la boucle stoppe la boucle n8n tout entière
// — exactement le piège déjà documenté pour « Ignorer Source En Erreur ». Le nœud
// doit donc toujours renvoyer au moins un item, même en cas de zéro résultat.
const XML_GOOGLE_NEWS_ZERO_RESULTATS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>"site:theneuron.ai" - Google Actualités</title>
</channel></rss>`
const parsedZeroResultats = runCodeNode(PARSER_GOOGLE_NEWS, {
  input: [{ data: XML_GOOGLE_NEWS_ZERO_RESULTATS }],
})
check(
  "provenance — un flux Google News à 0 résultat ne renvoie jamais un tableau vide (la boucle n8n ne doit pas s'arrêter)",
  Array.isArray(parsedZeroResultats) && parsedZeroResultats.length >= 1,
  `${Array.isArray(parsedZeroResultats) ? parsedZeroResultats.length : typeof parsedZeroResultats} item(s)`,
)
check(
  "provenance — le placeholder zéro-résultat n'a ni title ni link, donc jamais retenu comme candidat",
  !parsedZeroResultats[0].json.title && !parsedZeroResultats[0].json.link,
)
const [enrichiZeroResultats] = runCodeNodeForEachItem(ENRICHIR, {
  input: [parsedZeroResultats[0].json],
  registry: { "Loop Over Items — 1 Source": [sourceSiteSearch] },
})
const [filtreApresZeroResultats] = dedup([enrichiZeroResultats])
check(
  "provenance — le placeholder zéro-résultat est filtré par le préfiltre de qualité, la boucle continue",
  filtreApresZeroResultats === undefined,
)

const [enrichiSiteSearch] = runCodeNodeForEachItem(ENRICHIR, {
  input: [parsedGoogleNews[0]],
  registry: { "Loop Over Items — 1 Source": [sourceSiteSearch] },
})
check(
  "provenance — l'article collecté via Google News écrit l'éditeur réel, jamais news.google.com",
  enrichiSiteSearch.sourceName === "The Batch" && enrichiSiteSearch.sourceName !== "news.google.com",
)
check(
  "provenance — collectedVia trace le mécanisme technique, pas l'éditeur",
  enrichiSiteSearch.collectedVia === "google_news_site_search",
)

const [enrichiOrphanSansSource] = runCodeNodeForEachItem(ENRICHIR, {
  input: [parsedGoogleNews[1]],
  registry: { "Loop Over Items — 1 Source": [sourceSiteSearch] },
})
check(
  "provenance — sans <source>, repli propre sur la source du catalogue (jamais news.google.com)",
  enrichiOrphanSansSource.sourceName === sourceSiteSearch.sourceName,
)

const [enrichiRss] = runCodeNodeForEachItem(ENRICHIR, {
  input: [{ title: "T", link: "https://lemagit.fr/a", pubDate: null, contentSnippet: "c" }],
  registry: { "Loop Over Items — 1 Source": [sourceRss] },
})
check(
  "mode rss — l'éditeur reste celui du catalogue (flux direct, pas de déballage nécessaire)",
  enrichiRss.sourceName === sourceRss.sourceName && enrichiRss.collectedVia === "rss_direct",
)

// --- 6. Le test central : le tourniquet re-clé sur source_id -----------------

const nominal = dedup(collecteNominale())

check(
  "tourniquet — le plafond de 40 est bien respecté",
  nominal.length === 40,
  `${nominal.length} candidats`,
)

const idsRepresentes = new Set(nominal.map((a) => a.sourceCatalogId))
check(
  "tourniquet — les 14 sources contribuent toutes (clé source_id)",
  idsRepresentes.size === 14,
  `${idsRepresentes.size} sources sur 14`,
)
check(
  "tourniquet — sourceCatalogId propagé sur chaque candidat retenu",
  nominal.every((a) => !!a.sourceCatalogId),
)

const derniereSource = CONFIG_SOURCES[CONFIG_SOURCES.length - 1]
check(
  `tourniquet — la dernière source du tableau (${derniereSource.sourceName}) produit des candidats`,
  nominal.some((a) => a.sourceCatalogId === derniereSource.sourceId),
  "c'est exactement ce que l'ancien slice(0, 40) rendait impossible",
)

const parSource = {}
for (const a of nominal) parSource[a.sourceCatalogId] = (parSource[a.sourceCatalogId] || 0) + 1
const min = Math.min(...Object.values(parSource))
const max = Math.max(...Object.values(parSource))
check(
  "tourniquet — la répartition est équitable (écart max 1)",
  max - min <= 1,
  `min ${min}, max ${max}`,
)

check(
  "round-robin — la clé retombe sur sourceKey si sourceId est absent (robustesse, pas un cap positionnel)",
  (() => {
    const sansId = fluxRss(sourceRss, 3).map((a) => ({ ...a, sourceId: undefined }))
    const res = dedup(sansId)
    return res.every((a) => a.roundRobinKey === sourceRss.sourceKey)
  })(),
)

// --- 7. Régression : le comportement d'origine est préservé ------------------

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

// --- 8. Dédup douce sur titre --------------------------------------------------

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

// --- 9. Sources en erreur, isolées --------------------------------------------

const [itemErreurRss] = runCodeNodeForEachItem(IGNORER_ERREUR, {
  input: [{ error: "ECONNREFUSED" }],
  registry: { "Loop Over Items — 1 Source": [sourceRss] },
})
check(
  "erreur — le nœud « Ignorer Source En Erreur » identifie la source en échec sans planter",
  itemErreurRss.skipped === true && itemErreurRss.sourceName === sourceRss.sourceName,
)

const avecErreur = [
  ...fluxRss(CONFIG_SOURCES[0], 2),
  { skipped: true, sourceName: CONFIG_SOURCES[1].sourceName, sourceUrl: CONFIG_SOURCES[1].searchDomain },
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

// --- 10. Métriques de run ------------------------------------------------------

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

// --- 11. Contrat de sortie inchangé pour l'aval --------------------------------

const CHAMPS_ATTENDUS = [
  "id", "title", "source", "url", "urlHash", "publishedAt", "summary",
  "secteurDefaut", "categorieDefaut", "sourceCatalogId",
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

// --- 12. source_catalog_id jusqu'à veille_articles -----------------------------

const digestArticlesFixture = {
  titreDigest: "Digest test",
  resumeHebdo: "Résumé.",
  superShortSummary: "Résumé court",
  articles: [
    {
      selectionRank: 1,
      titreFr: "Titre",
      resume: "Résumé",
      analyseKredo: "Analyse",
      actionCommerciale: "Action",
      secteurPrincipal: "transverse",
      secteurSecondaire: "",
      categorie: "ia-appliquee",
      tags: ["ia"],
      url: "https://example.com/a",
      urlHash: "hash1",
      sourceName: "The Batch",
      sourceCatalogId: "src-the-batch",
      collectedVia: "google_news_site_search",
      publishedAt: null,
    },
    {
      selectionRank: 2,
      titreFr: "Titre 2",
      resume: "Résumé 2",
      analyseKredo: "Analyse 2",
      actionCommerciale: "Action 2",
      secteurPrincipal: "transverse",
      secteurSecondaire: "",
      categorie: "marche-esn",
      tags: [],
      url: "https://example.com/b",
      urlHash: "hash2",
      sourceName: "LeMagIT",
      sourceCatalogId: "src-lemagit",
      collectedVia: "rss_direct",
      publishedAt: null,
    },
  ],
}
const payloadArticles = runCodeNode(PREPARER_LIGNES, {
  input: [digestArticlesFixture],
  registry: {
    "Valider Convergences": [digestArticlesFixture],
    "Créer Digest": [{ id: "digest-uuid-1" }],
    "Build Contexte KREDO": [{ workspaceId: "workspace-uuid-1" }],
  },
}).map((i) => i.json)
const lignesArticles = payloadArticles[0].p_articles
check(
  "propagation — source_catalog_id atteint les lignes veille_articles",
  lignesArticles.every((r, idx) => r.source_catalog_id === digestArticlesFixture.articles[idx].sourceCatalogId),
)
check(
  "propagation — workspace_id n'est plus dupliqué en dur, il vient de Build Contexte KREDO",
  lignesArticles.every((r) => r.workspace_id === "workspace-uuid-1"),
)
check(
  "structure — plus d'UUID de workspace en dur dans « Préparer Lignes Articles »",
  !/98dcd39d-f87b-4f9d-add9-ce76d635953a/.test(nodes[PREPARER_LIGNES].parameters.jsCode),
)
check(
  "structure — plus d'UUID de workspace en dur dans « Créer Digest »",
  !/98dcd39d-f87b-4f9d-add9-ce76d635953a/.test(nodes["Créer Digest"].parameters.jsonBody),
)

// --- 13. Idempotence du digest --------------------------------------------------

const creerDigest = nodes["Créer Digest"]
check(
  "idempotence — l'URL du digest cible on_conflict=workspace_id,digest_date",
  creerDigest.parameters.url.includes("on_conflict=workspace_id,digest_date"),
)
check(
  "idempotence — le header Prefer demande resolution=merge-duplicates",
  creerDigest.parameters.headerParameters.parameters.some(
    (p) => p.name === "Prefer" && p.value.includes("resolution=merge-duplicates") && p.value.includes("return=representation"),
  ),
)
check(
  "idempotence — la méthode reste POST (jamais de DELETE pour permettre un rerun)",
  (creerDigest.parameters.method || "POST").toUpperCase() === "POST",
)

// --- 14. Contrat stable Sonnet (id, pas seulement l'index) ---------------------

check(
  "contrat LLM — le prompt d'analyse demande à Sonnet d'échoir l'id de chaque article",
  nodes["Construire Prompt Analyse"].parameters.jsCode.includes('"id":"art_0"') &&
    /reprends EXACTEMENT le champ "id"/.test(nodes["Construire Prompt Analyse"].parameters.jsCode),
)

const parserDigestRegistryFixture = [
  { id: "art_0", url: "https://a.example", urlHash: "ha", source: "LeMagIT", sourceCatalogId: "src-lemagit", collectedVia: "rss_direct", secteurPrincipal: "transverse", categorie: "marche-esn", publishedAt: null },
  { id: "art_1", url: "https://b.example", urlHash: "hb", source: "The Batch", sourceCatalogId: "src-the-batch", collectedVia: "google_news_site_search", secteurPrincipal: "transverse", categorie: "ia-appliquee", publishedAt: null },
]
const sonnetResponseReordonnee = {
  content: [
    {
      type: "text",
      text: JSON.stringify({
        titre_digest: "Digest",
        resume_hebdo: "Résumé",
        super_short_summary: "Résumé court",
        // Le LLM renvoie l'ordre inverse : le mapping par id doit rester correct.
        articles: [
          { id: "art_1", selection_rank: 1, titre_fr: "T1", resume: "r", analyse_kredo: "a", action_commerciale: "ac", secteur_principal: "transverse", secteur_secondaire: "", categorie: "ia-appliquee", tags: [] },
          { id: "art_0", selection_rank: 2, titre_fr: "T2", resume: "r", analyse_kredo: "a", action_commerciale: "ac", secteur_principal: "transverse", secteur_secondaire: "", categorie: "marche-esn", tags: [] },
        ],
      }),
    },
  ],
}
const digestFinal = runCodeNode("Parser Digest Final", {
  input: [sonnetResponseReordonnee],
  registry: { "Construire Prompt Analyse": [{ sourceArticles: parserDigestRegistryFixture }] },
})[0].json
check(
  "contrat LLM — le mapping se fait par id, pas par position (ordre inversé par le LLM)",
  digestFinal.articles[0].sourceCatalogId === "src-the-batch" && digestFinal.articles[1].sourceCatalogId === "src-lemagit",
  JSON.stringify(digestFinal.articles.map((a) => a.sourceCatalogId)),
)

// --- 15. Cas limites -----------------------------------------------------------

check("limite — collecte vide ⇒ aucun candidat, aucune exception", dedup([]).length === 0)
check(
  "limite — une seule source disponible prend toutes les places",
  dedup(fluxRss(CONFIG_SOURCES[0], 60)).length === 40,
)
check(
  "limite — moins de 40 candidats disponibles ⇒ pas de boucle infinie",
  dedup(collecteNominale(1)).length === 14,
)

// --- 16. Aucun secret exposé dans le workflow -----------------------------------

const workflowRaw = JSON.stringify(workflow)
check(
  "secrets — aucune clé API en clair dans le workflow (sk-…, Bearer …)",
  !/sk-[a-zA-Z0-9ـ-]{16,}/.test(workflowRaw) && !/Bearer\s+[A-Za-z0-9._-]{20,}/.test(workflowRaw),
)
check(
  "secrets — les credentials ne portent qu'un id/name de référence n8n, jamais de valeur",
  workflow.nodes
    .filter((n) => n.credentials)
    .every((n) =>
      Object.values(n.credentials).every((c) => typeof c.id === "string" && typeof c.name === "string" && !("value" in c) && !("apiKey" in c)),
    ),
)

// --- 17. LOT 2 : Hydratation et Validation des Convergences ---------------------

const PRE_FILTRAGE = "Pré-filtrage Déterministe"
const VALIDER_CONVERGENCES = "Valider Convergences"

check(
  "lot2 — nœud Pré-filtrage Déterministe existe",
  PRE_FILTRAGE in nodes,
)
check(
  "lot2 — nœud Valider Convergences existe",
  VALIDER_CONVERGENCES in nodes,
)
check(
  "lot2 — 'Charger Comptes', 'Charger Enjeux' et 'Charger Playbooks' ont executeOnce: true pour éviter le fan-out par item",
  nodes["Charger Comptes"]?.executeOnce === true &&
  nodes["Charger Enjeux"]?.executeOnce === true &&
  nodes["Charger Playbooks"]?.executeOnce === true,
)

check(
  "lot3 — 'Charger Signaux Comptes', 'Charger Faits Comptes' et 'Charger Opportunités' existent avec executeOnce: true",
  nodes["Charger Signaux Comptes"]?.executeOnce === true &&
  nodes["Charger Faits Comptes"]?.executeOnce === true &&
  nodes["Charger Opportunités"]?.executeOnce === true,
)

check(
  "lot3 — Charger Signaux Comptes lit v_active_account_signals (respecte le filtre défensif archived/2 mois déjà en place)",
  nodes["Charger Signaux Comptes"]?.parameters.url.includes("v_active_account_signals"),
)

check(
  "lot3 — Charger Faits Comptes filtre target_type=eq.company et is_current=eq.true",
  (() => {
    const params = nodes["Charger Faits Comptes"]?.parameters.queryParameters.parameters || []
    return params.some((p) => p.name === "target_type" && p.value === "eq.company") &&
      params.some((p) => p.name === "is_current" && p.value === "eq.true")
  })(),
)

check(
  "lot3 — Charger Opportunités exclut perdu/abandonne (contexte commercial actif uniquement)",
  (() => {
    const params = nodes["Charger Opportunités"]?.parameters.queryParameters.parameters || []
    return params.some((p) => p.name === "stage" && p.value === "not.in.(perdu,abandonne)")
  })(),
)

// --- LOT 2.1 : Test de Régression Taxonomie Relationnelle (BFA / CEGEMA) ---
const realTaxonomyPlaybooks = [
  {
    macro_id: "macro-bfa-uuid",
    macro_name: "Banque, Finance & Assurance",
    segment_id: "seg-assurance-uuid",
    segment_name: "Assurance, mutuelles & courtage",
    playbook: { target: "DORA" }
  },
  {
    macro_id: "macro-bfa-uuid",
    macro_name: "Banque, Finance & Assurance",
    segment_id: "seg-banque-uuid",
    segment_name: "Banque & financement",
    playbook: { target: "AI Act" }
  },
  {
    macro_id: "macro-services-uuid",
    macro_name: "Services aux entreprises & aux personnes",
    segment_id: "seg-medias-uuid",
    segment_name: "Médias & édition",
    playbook: { target: "GenAI" }
  }
];

const realTaxonomyComptes = [
  {
    id: "comp-cegema-uuid",
    name: "CEGEMA",
    sector_id: "macro-bfa-uuid",
    segment_id: "seg-assurance-uuid",
    lifecycle_status: "client"
  },
  {
    id: "comp-other-uuid",
    name: "Other SaaS",
    sector_id: "macro-saas-uuid",
    segment_id: "seg-saas-uuid",
    lifecycle_status: "prospect"
  }
];

const realTaxonomyIssues = [
  {
    id: "issue-cegema-1",
    company_id: "comp-cegema-uuid",
    title: "Mise en conformité DORA",
    problem_statement: "Échéance janvier 2025"
  },
  {
    id: "issue-other-1",
    company_id: "comp-other-uuid",
    title: "Refonte CRM",
    problem_statement: "Migration en cours"
  }
];

const preFiltrageRealBfaOut = runCodeNode(PRE_FILTRAGE, {
  registry: {
    "Parser Top 5": [{ id: "art_rank3", secteurPrincipal: "Banque, Finance & Assurance", secteurSecondaire: "" }],
    "Charger Comptes": realTaxonomyComptes,
    "Charger Enjeux": realTaxonomyIssues,
    "Charger Playbooks": realTaxonomyPlaybooks,
    "Charger Signaux Comptes": [],
    "Charger Faits Comptes": [],
    "Charger Opportunités": []
  }
}).map(i => i.json);

check(
  "lot2.1 — article BFA : candidateAccounts >= 1 (CEGEMA rattaché)",
  preFiltrageRealBfaOut[0].convergenceContext.candidateAccounts.some(c => c.id === "comp-cegema-uuid"),
);

check(
  "lot2.1 — article BFA : candidateIssues >= 1 (enjeux CEGEMA)",
  preFiltrageRealBfaOut[0].convergenceContext.candidateIssues.some(i => i.id === "issue-cegema-1" && i.company_name === "CEGEMA"),
);

check(
  "lot2.1 — article BFA : candidatePlaybooks >= 1 (playbooks BFA/Assurance)",
  preFiltrageRealBfaOut[0].convergenceContext.candidatePlaybooks.some(p => p.segment_id === "seg-assurance-uuid"),
);

check(
  "lot2.1 — diagnostic convergenceDebug présent dans l'output de pré-filtrage",
  preFiltrageRealBfaOut[0].convergenceDebug &&
  preFiltrageRealBfaOut[0].convergenceDebug.candidateAccountsCount >= 1 &&
  preFiltrageRealBfaOut[0].convergenceDebug.candidateIssuesCount >= 1 &&
  preFiltrageRealBfaOut[0].convergenceDebug.candidatePlaybooksCount >= 1 &&
  preFiltrageRealBfaOut[0].convergenceDebug.resolvedSectorIds.includes("macro-bfa-uuid"),
);

const companiesFixture = [
  { id: "comp_1", name: "Comp 1", sector_id: "sect_1", segment_id: "seg_1" },
  { id: "comp_2", name: "Comp 2", sector_id: "sect_2", segment_id: "seg_2" }
]
const issuesFixture = [
  { id: "issue_1", company_id: "comp_1", title: "Enjeu 1", problem_statement: "Prob 1" },
  { id: "issue_2", company_id: "comp_2", title: "Enjeu 2", problem_statement: "Prob 2" }
]
const playbooksFixture = [
  // Playbook réellement utile (au moins une entrée non vide) : un squelette de seed
  // ({} ou tableaux tous vides) est désormais exclu par `playbookIsUseful` (LOT 3).
  { macro_id: "sect_1", segment_id: "seg_1", macro_name: "Sect 1", segment_name: "Seg 1", playbook: { personas: ["DSI"], objections: [], entry_points: [], roi_arguments: [] } }
]

const preFiltrageOut = runCodeNode(PRE_FILTRAGE, {
  registry: {
    "Parser Top 5": [{ id: "art_1", secteurPrincipal: "Sect 1", secteurSecondaire: "Seg 1" }],
    "Charger Comptes": companiesFixture,
    "Charger Enjeux": issuesFixture,
    "Charger Playbooks": playbooksFixture,
    "Charger Signaux Comptes": [],
    "Charger Faits Comptes": [],
    "Charger Opportunités": []
  }
}).map(i => i.json)

check(
  "lot2 — pré-filtrage filtre correctement les comptes, enjeux et playbooks candidats",
  preFiltrageOut[0].convergenceContext.candidateAccounts.length === 1 &&
  preFiltrageOut[0].convergenceContext.candidateAccounts[0].id === "comp_1" &&
  preFiltrageOut[0].convergenceContext.candidateIssues.length === 1 &&
  preFiltrageOut[0].convergenceContext.candidateIssues[0].id === "issue_1" &&
  preFiltrageOut[0].convergenceContext.candidatePlaybooks.length === 1,
)

// Validation avec hallucination et dépassement de limite
const llmDigestFixture = {
  articles: [{
    id: "art_1",
    convergences: {
      schemaVersion: 1,
      synthesis: "Synth",
      confidence: "high",
      matchedIssues: [
        { issueId: "issue_1", companyId: "comp_1" }, // Valid
        { issueId: "issue_fake", companyId: "comp_fake" }, // Halluciné
        { issueId: "issue_1", companyId: "comp_1" }, // Valid (duplicate for testing limit)
        { issueId: "issue_1", companyId: "comp_1" }, // Valid
        { issueId: "issue_1", companyId: "comp_1" }, // Valid (over limit of 3)
      ],
      relatedAccounts: [
        { companyId: "comp_1" }, // Valid
        { companyId: "comp_fake" }, // Halluciné
      ],
      playbookSuggestion: { sectorId: "sect_fake" }, // Halluciné
      recommendedActions: [{}, {}, {}, {}] // Over limit of 3
    }
  }]
}

const validationOut = runCodeNode(VALIDER_CONVERGENCES, {
  input: [llmDigestFixture],
  registry: {
    "Pré-filtrage Déterministe": preFiltrageOut
  }
}).map(i => i.json)

const validConv = validationOut[0].articles[0].convergences

check(
  "lot2 — validation supprime les UUIDs non fournis dans le contexte",
  validConv.matchedIssues.every(i => i.issueId !== "issue_fake") &&
  validConv.relatedAccounts.every(a => a.companyId !== "comp_fake") &&
  validConv.playbookSuggestion === null,
)

check(
  "lot2 — validation respecte les bornes maximales",
  validConv.matchedIssues.length <= 3 &&
  validConv.relatedAccounts.length <= 5 &&
  validConv.recommendedActions.length <= 3,
)

check(
  "lot2 — persistance: prépararer lignes inclut la colonne convergences",
  (() => {
    const payload = runCodeNode(PREPARER_LIGNES, {
      input: [{ articles: [{ id: "art_1", convergences: { schemaVersion: 1 } }] }],
      registry: {
        "Valider Convergences": [{ articles: [{ id: "art_1", convergences: { schemaVersion: 1 } }] }],
        "Créer Digest": [{ id: "digest_1" }],
        "Build Contexte KREDO": [{ workspaceId: "ws_1" }]
      }
    }).map(i => i.json);
    const lignes = payload[0].p_articles;
    return lignes[0].convergences && lignes[0].convergences.schemaVersion === 1;
  })(),
)

// --- LOT 2.3 : Idempotence Sûre & RPC Transactionnelle ---

const rpcNode = nodes["Remplacer Articles Digest (RPC)"]
check(
  "lot2.3 — nœud 'Remplacer Articles Digest (RPC)' configuré pour appeler replace_veille_digest_articles",
  !!rpcNode &&
  (rpcNode.parameters.method || "").toUpperCase() === "POST" &&
  rpcNode.parameters.url.includes("/rpc/replace_veille_digest_articles"),
)

check(
  "lot2.3 — chaînage transactionnel : 'Créer Digest' -> 'Préparer Lignes Articles' -> 'Remplacer Articles Digest (RPC)'",
  workflow.connections["Créer Digest"]?.main?.[0]?.[0]?.node === "Préparer Lignes Articles" &&
  workflow.connections["Préparer Lignes Articles"]?.main?.[0]?.[0]?.node === "Remplacer Articles Digest (RPC)",
)

check(
  "lot2.3 — suppression complète de 'Purger Anciens Articles Digest' destructif",
  !("Purger Anciens Articles Digest" in nodes),
)

// Test de cohérence : confidence high sans éléments structurés doit être rabattue à low
const digestHighWithoutStructured = {
  articles: [{
    id: "art_1",
    convergences: {
      schemaVersion: 1,
      synthesis: "Synthèse générale sans rapprochement structuré retenu.",
      confidence: "high",
      matchedIssues: [],
      relatedAccounts: [],
      playbookSuggestion: null,
      recommendedActions: [],
      evidenceRefs: []
    }
  }]
}
const outHighWithoutStructured = runCodeNode(VALIDER_CONVERGENCES, {
  input: [digestHighWithoutStructured],
  registry: { "Pré-filtrage Déterministe": preFiltrageOut }
}).map(i => i.json)

check(
  "lot2.2 — confidence high sans éléments structurés est rabattue à low",
  outHighWithoutStructured[0].articles[0].convergences.confidence === "low",
)

// Test de cohérence : confidence high avec matchedIssues reste high
const digestHighWithStructured = {
  articles: [{
    id: "art_1",
    convergences: {
      schemaVersion: 1,
      synthesis: "Convergence Schneider DORA avérée.",
      confidence: "high",
      matchedIssues: [
        {
          issueId: "issue_1",
          companyId: "comp_1",
          companyName: "Comp 1",
          issueTitle: "Enjeu 1",
          rationale: "Alignement direct"
        }
      ],
      relatedAccounts: [],
      playbookSuggestion: null,
      recommendedActions: [{ label: "Action 1", rationale: "Raison" }],
      evidenceRefs: [{ type: "account_issue", id: "issue_1", label: "Enjeu 1" }]
    }
  }]
}
const outHighWithStructured = runCodeNode(VALIDER_CONVERGENCES, {
  input: [digestHighWithStructured],
  registry: { "Pré-filtrage Déterministe": preFiltrageOut }
}).map(i => i.json)

check(
  "lot2.2 — confidence high avec matchedIssues reste high et conserve ses structures",
  outHighWithStructured[0].articles[0].convergences.confidence === "high" &&
  outHighWithStructured[0].articles[0].convergences.matchedIssues.length === 1,
)

// Test cas OpenAI / Éducation : confidence low avec evidenceRefs périphériques préservées sans forcing
const digestLowContextOnly = {
  articles: [{
    id: "art_1",
    convergences: {
      schemaVersion: 1,
      synthesis: "Partenariat éducatif transverse sans opportunité commerciale forte.",
      confidence: "low",
      matchedIssues: [],
      relatedAccounts: [],
      playbookSuggestion: null,
      recommendedActions: [],
      evidenceRefs: [{ type: "company", id: "comp_1", label: "Comp 1" }]
    }
  }]
}
const outLowContextOnly = runCodeNode(VALIDER_CONVERGENCES, {
  input: [digestLowContextOnly],
  registry: { "Pré-filtrage Déterministe": preFiltrageOut }
}).map(i => i.json)

check(
  "lot2.2 — cas context-only (OpenAI/Éducation) : evidenceRefs préservées, pas de forcing dans relatedAccounts",
  outLowContextOnly[0].articles[0].convergences.confidence === "low" &&
  outLowContextOnly[0].articles[0].convergences.relatedAccounts.length === 0 &&
  outLowContextOnly[0].articles[0].convergences.evidenceRefs.length === 1 &&
  outLowContextOnly[0].articles[0].convergences.evidenceRefs[0].id === "comp_1",
)

// --- LOT 2.4 : Gestion propre d'une sélection vide & No-Op ---

const PARSER_TOP_5 = "Parser Top 5"
const NO_OP_SELECTION = "No-Op Aucune Sélection"

const candidatesFixture = {
  art_1: { id: "art_1", title: "Titre 1", source: "S1", url: "https://1.com", summary: "Sum 1" },
  art_2: { id: "art_2", title: "Titre 2", source: "S2", url: "https://2.com", summary: "Sum 2" },
  art_3: { id: "art_3", title: "Titre 3", source: "S3", url: "https://3.com", summary: "Sum 3" },
  art_4: { id: "art_4", title: "Titre 4", source: "S4", url: "https://4.com", summary: "Sum 4" },
  art_5: { id: "art_5", title: "Titre 5", source: "S5", url: "https://5.com", summary: "Sum 5" },
  art_6: { id: "art_6", title: "Titre 6", source: "S6", url: "https://6.com", summary: "Sum 6" },
}

// Cas A : 2 candidats faibles -> Haiku {"top5":[]}
const responseHaikuEmpty = {
  content: [{ type: "text", text: '{"top5":[]} Justification libre après JSON.' }]
}
const outParserEmpty = runCodeNode(PARSER_TOP_5, {
  input: [responseHaikuEmpty],
  registry: {
    "Construire Prompt Classement": [{ candidatesById: { art_1: candidatesFixture.art_1, art_2: candidatesFixture.art_2 } }]
  }
}).map(i => i.json)

check(
  "lot2.4 — Cas A: Haiku top5: [] renvoie l'item no-op sans lever d'exception",
  outParserEmpty.length === 1 &&
  outParserEmpty[0].emptySelection === true &&
  outParserEmpty[0].status === "no_qualifying_articles" &&
  outParserEmpty[0].candidateCount === 2 &&
  outParserEmpty[0].selectedCount === 0 &&
  outParserEmpty[0].digestUpdated === false,
)

const outNoOpNode = runCodeNode(NO_OP_SELECTION, {
  input: outParserEmpty,
}).map(i => i.json)

check(
  "lot2.4 — Cas A: le noeud No-Op produit la sortie finale conforme",
  outNoOpNode.length === 1 &&
  outNoOpNode[0].status === "no_qualifying_articles" &&
  outNoOpNode[0].candidateCount === 2 &&
  outNoOpNode[0].selectedCount === 0 &&
  outNoOpNode[0].digestUpdated === false,
)

// Cas B : 2 candidats dont 1 valide
const responseHaiku1Valide = {
  content: [{ type: "text", text: '{"top5":[{"id":"art_1","score":78,"categorie":"ia-appliquee","secteur_principal":"transverse"}]}' }]
}
const outParser1Valide = runCodeNode(PARSER_TOP_5, {
  input: [responseHaiku1Valide],
  registry: {
    "Construire Prompt Classement": [{ candidatesById: { art_1: candidatesFixture.art_1, art_2: candidatesFixture.art_2 } }]
  }
}).map(i => i.json)

check(
  "lot2.4 — Cas B: 1 seul article sélectionné sur 2 candidats est valide",
  outParser1Valide.length === 1 &&
  outParser1Valide[0].id === "art_1" &&
  outParser1Valide[0].emptySelection !== true,
)

// Cas C : 3 candidats valides
const responseHaiku3Valides = {
  content: [{ type: "text", text: '{"top5":[{"id":"art_1"},{"id":"art_2"},{"id":"art_3"}]}' }]
}
const outParser3Valides = runCodeNode(PARSER_TOP_5, {
  input: [responseHaiku3Valides],
  registry: {
    "Construire Prompt Classement": [{ candidatesById: candidatesFixture }]
  }
}).map(i => i.json)

check(
  "lot2.4 — Cas C: 3 candidats valides sont correctement retenus",
  outParser3Valides.length === 3 &&
  outParser3Valides.map(a => a.id).join(",") === "art_1,art_2,art_3",
)

// Cas D : 6 candidats -> plafonné à 5
const responseHaiku6Valides = {
  content: [{ type: "text", text: '{"top5":[{"id":"art_1"},{"id":"art_2"},{"id":"art_3"},{"id":"art_4"},{"id":"art_5"},{"id":"art_6"}]}' }]
}
const outParser6Valides = runCodeNode(PARSER_TOP_5, {
  input: [responseHaiku6Valides],
  registry: {
    "Construire Prompt Classement": [{ candidatesById: candidatesFixture }]
  }
}).map(i => i.json)

check(
  "lot2.4 — Cas D: 5+ candidats retenus par Haiku sont tronqués à 5 maximum",
  outParser6Valides.length === 5 &&
  outParser6Valides.map(a => a.id).join(",") === "art_1,art_2,art_3,art_4,art_5",
)

// Cas E : JSON Haiku réellement invalide
let throwsTechnicalError = false
try {
  runCodeNode(PARSER_TOP_5, {
    input: [{ content: [{ type: "text", text: "ceci n est pas du json du tout" }] }],
    registry: {
      "Construire Prompt Classement": [{ candidatesById: candidatesFixture }]
    }
  })
} catch (e) {
  throwsTechnicalError = e.message.includes("n a pas renvoye un JSON exploitable")
}

check(
  "lot2.4 — Cas E: un JSON Haiku réellement invalide déclenche une erreur technique",
  throwsTechnicalError,
)

// Vérification du chaînage des nouveaux noeuds dans n8n
check(
  "lot2.4 — chaînage: 'Parser Top 5' pointe vers 'Router Articles Sélectionnés'",
  workflow.connections["Parser Top 5"]?.main?.[0]?.[0]?.node === "Router Articles Sélectionnés",
)

check(
  "lot2.4 — chaînage: branch 0 (vide) pointe vers 'No-Op Aucune Sélection' et branch 1 (non-vide) traverse 'Charger Comptes'",
  workflow.connections["Router Articles Sélectionnés"]?.main?.[0]?.[0]?.node === "No-Op Aucune Sélection" &&
  workflow.connections["Router Articles Sélectionnés"]?.main?.[1]?.[0]?.node === "Charger Comptes",
)

check(
  "lot2.4/lot3 — chaînage séquentiel obligatoire: Charger Comptes -> Enjeux -> Playbooks -> Signaux -> Faits -> Opportunités -> Pré-filtrage Déterministe",
  workflow.connections["Charger Comptes"]?.main?.[0]?.[0]?.node === "Charger Enjeux" &&
  workflow.connections["Charger Enjeux"]?.main?.[0]?.[0]?.node === "Charger Playbooks" &&
  workflow.connections["Charger Playbooks"]?.main?.[0]?.[0]?.node === "Charger Signaux Comptes" &&
  workflow.connections["Charger Signaux Comptes"]?.main?.[0]?.[0]?.node === "Charger Faits Comptes" &&
  workflow.connections["Charger Faits Comptes"]?.main?.[0]?.[0]?.node === "Charger Opportunités" &&
  workflow.connections["Charger Opportunités"]?.main?.[0]?.[0]?.node === "Pré-filtrage Déterministe",
)

check(
  "lot2.4 — sécurité de câblage: aucune connexion directe entre Router et Pré-filtrage Déterministe",
  !workflow.connections["Router Articles Sélectionnés"]?.main?.[1]?.some(c => c.node === "Pré-filtrage Déterministe"),
)

// --- LOT 3 : Convergences transverses (signaux, faits, opportunités) -------------
//
// Cas d'acceptation inspiré du run réel du 2026-08-18 : le secteur "Secteur public,
// Enseignement supérieur & Recherche" contenait 10 comptes, 0 enjeu ouvert et des
// playbooks squelettes (tableaux tous vides) — le moteur LOT 2 n'avait donc RIEN à
// donner à Sonnet sur un article OpenAI / gouvernance IA, alors qu'EURECOM porte de
// vrais faits et signaux sur exactement ce sujet (EURECOM AI Center, cybersécurité,
// IA). Ce bloc reproduit ce cas à l'identique (10 comptes, 0 enjeu, playbooks vides)
// pour prouver que le nouveau pré-filtrage trouve la matière AVANT tout appel LLM.

const MACRO_PUBLIC_ID = "macro-public-esr-uuid"
const SEG_ESR_ID = "seg-public-esr-uuid"
const SEG_COLLECTIVITES_ID = "seg-public-collectivites-uuid"

const secteurPublicPlaybooks = [
  { macro_id: MACRO_PUBLIC_ID, macro_name: "Secteur public, Enseignement supérieur & Recherche", segment_id: SEG_ESR_ID, segment_name: "Enseignement supérieur & recherche", playbook: { personas: [], objections: [], entry_points: [], roi_arguments: [] } },
  { macro_id: MACRO_PUBLIC_ID, macro_name: "Secteur public, Enseignement supérieur & Recherche", segment_id: SEG_COLLECTIVITES_ID, segment_name: "Collectivités & administrations d'État", playbook: { personas: [], objections: [], entry_points: [], roi_arguments: [] } },
]

// 10 comptes réels du secteur, EURECOM inclus — aucun enjeu ouvert sur aucun d'eux.
const secteurPublicComptes = [
  { id: "comp-eurecom", name: "EURECOM", sector_id: MACRO_PUBLIC_ID, segment_id: SEG_ESR_ID, lifecycle_status: "client_actif" },
  { id: "comp-casa", name: "CASA", sector_id: MACRO_PUBLIC_ID, segment_id: SEG_COLLECTIVITES_ID, lifecycle_status: "client_actif" },
  { id: "comp-cnrs-geoazur", name: "CNRS Geoazur", sector_id: MACRO_PUBLIC_ID, segment_id: SEG_ESR_ID, lifecycle_status: "prospect" },
  { id: "comp-cnrs-mer", name: "CNRS Institut de la mer", sector_id: MACRO_PUBLIC_ID, segment_id: SEG_ESR_ID, lifecycle_status: "prospect" },
  { id: "comp-cnrs-obs", name: "CNRS Observatoire Côte d'Azur", sector_id: MACRO_PUBLIC_ID, segment_id: SEG_ESR_ID, lifecycle_status: "prospect" },
  { id: "comp-polytech", name: "Polytech Nice Sophia", sector_id: MACRO_PUBLIC_ID, segment_id: SEG_ESR_ID, lifecycle_status: "prospect" },
  { id: "comp-prefecture", name: "Préfecture 06", sector_id: MACRO_PUBLIC_ID, segment_id: SEG_COLLECTIVITES_ID, lifecycle_status: "prospect" },
  { id: "comp-rectorat", name: "Rectorat de Nice", sector_id: MACRO_PUBLIC_ID, segment_id: SEG_COLLECTIVITES_ID, lifecycle_status: "prospect" },
  { id: "comp-skema", name: "Skema Business School", sector_id: MACRO_PUBLIC_ID, segment_id: SEG_ESR_ID, lifecycle_status: "prospect" },
  { id: "comp-unice", name: "Université Nice Côte d'Azur", sector_id: MACRO_PUBLIC_ID, segment_id: SEG_ESR_ID, lifecycle_status: "prospect" },
]

const ilYA10Jours = new Date(Date.now() - 10 * JOUR).toISOString()

const secteurPublicSignaux = [
  {
    id: "signal-eurecom-centre-ia",
    company_id: "comp-eurecom",
    signal_category: "company_context",
    signal_type: "product_launch",
    title: "Lancement du Centre IA d'EURECOM en 2026 dans un nouveau campus partagé",
    summary: "EURECOM ouvre un centre dédié à l'intelligence artificielle avec un calcul dédié.",
    detected_at: ilYA10Jours,
    global_score: 0.65,
    relevance_score: 0.6,
    recommended_action: "Proposer un audit de gouvernance IA",
  },
]

const secteurPublicFaits = [
  {
    id: "fact-eurecom-strategic-priority",
    target_id: "comp-eurecom",
    fact_type: "strategic_priority",
    value_text: "Ouverture d'un EURECOM AI Center avec un centre de calcul dédié à l'intelligence artificielle.",
    confidence_score: 0.8,
    effective_at: ilYA10Jours,
  },
  {
    id: "fact-eurecom-transformation",
    target_id: "comp-eurecom",
    fact_type: "transformation_program",
    value_text: "Mise en place d'un centre de calcul dédié à l'intelligence artificielle (EURECOM AI Center).",
    confidence_score: 0.8,
    effective_at: ilYA10Jours,
  },
  {
    id: "fact-eurecom-technology",
    target_id: "comp-eurecom",
    fact_type: "technology",
    value_text: "Recherche sur la sécurité de l'intelligence artificielle, détection de deepfakes, cybersécurité.",
    confidence_score: 0.8,
    effective_at: ilYA10Jours,
  },
  // Bruit : un fait réel mais sans aucun recoupement avec le sujet de l'article.
  {
    id: "fact-casa-market",
    target_id: "comp-casa",
    fact_type: "market_position",
    value_text: "Collectivité locale gérant les services urbains de proximité.",
    confidence_score: 0.7,
    effective_at: ilYA10Jours,
  },
]

const articleOpenAiGouvernanceIa = {
  id: "art_openai_gouvernance_ia",
  secteurPrincipal: "Secteur public, Enseignement supérieur & Recherche",
  secteurSecondaire: "",
  title: "OpenAI lance une initiative pour renforcer le contrôle démocratique de l'IA dans la sécurité nationale",
  summary: "OpenAI annonce un programme de gouvernance de l'intelligence artificielle destiné aux administrations et aux centres de recherche, avec un focus sur la sécurité et le contrôle des usages sensibles.",
}

const preFiltrageEurecomOut = runCodeNode(PRE_FILTRAGE, {
  registry: {
    "Parser Top 5": [articleOpenAiGouvernanceIa],
    "Charger Comptes": secteurPublicComptes,
    "Charger Enjeux": [],
    "Charger Playbooks": secteurPublicPlaybooks,
    "Charger Signaux Comptes": secteurPublicSignaux,
    "Charger Faits Comptes": secteurPublicFaits,
    "Charger Opportunités": []
  }
}).map(i => i.json)

const ctxEurecom = preFiltrageEurecomOut[0].convergenceContext
const debugEurecom = preFiltrageEurecomOut[0].convergenceDebug

check(
  "lot3 — EURECOM (cas réel) : le compte est bien candidat malgré 10 comptes en lice pour 8 places",
  ctxEurecom.candidateAccounts.some(c => c.id === "comp-eurecom") &&
  ctxEurecom.candidateAccounts.length <= 8,
  `${ctxEurecom.candidateAccounts.length} comptes retenus`,
)

check(
  "lot3 — EURECOM (cas réel) : candidateSignalsCount >= 1 AVANT tout appel LLM",
  debugEurecom.candidateSignalsCount >= 1,
  `candidateSignalsCount=${debugEurecom.candidateSignalsCount}`,
)

check(
  "lot3 — EURECOM (cas réel) : candidateFactsCount >= 2 AVANT tout appel LLM",
  debugEurecom.candidateFactsCount >= 2,
  `candidateFactsCount=${debugEurecom.candidateFactsCount}`,
)

check(
  "lot3 — EURECOM (cas réel) : ressort en tête du ranking (topAccounts[0])",
  debugEurecom.topAccounts[0]?.id === "comp-eurecom",
  JSON.stringify(debugEurecom.topAccounts),
)

check(
  "lot3 — EURECOM (cas réel) : playbooks squelettes (tableaux vides) exclus malgré secteur résolu",
  debugEurecom.candidatePlaybooksCount === 0,
  `candidatePlaybooksCount=${debugEurecom.candidatePlaybooksCount}`,
)

check(
  "lot3 — EURECOM (cas réel) : candidateFacts porte bien les faits EURECOM, pas juste le bruit CASA",
  ctxEurecom.candidateFacts.some(f => f.id === "fact-eurecom-technology") &&
  ctxEurecom.candidateFacts.some(f => f.id === "fact-eurecom-strategic-priority"),
)

// --- Simulation d'une réponse Sonnet AVEC convergence réelle citée -------------

const digestEurecomPositif = {
  articles: [{
    id: "art_openai_gouvernance_ia",
    convergences: {
      schemaVersion: 2,
      synthesis: "L'ouverture de l'EURECOM AI Center et ses travaux de sécurité IA recoupent directement l'initiative de gouvernance IA d'OpenAI.",
      confidence: "high",
      matchedIssues: [],
      relatedAccounts: [
        { companyId: "comp-eurecom", companyName: "EURECOM", rationale: "Le centre IA en construction est directement concerné par la gouvernance de l'IA." },
        { companyId: "comp-invente", companyName: "Compte Halluciné", rationale: "Hors du candidate set." },
      ],
      relatedOpportunities: [],
      playbookSuggestion: null,
      recommendedActions: [{ label: "Contacter EURECOM sur la gouvernance de son centre IA", rationale: "Angle direct." }],
      evidenceRefs: [
        { type: "account_fact", id: "fact-eurecom-strategic-priority", label: "EURECOM AI Center" },
        { type: "account_fact", id: "fact-eurecom-technology", label: "Recherche sécurité IA" },
        { type: "account_signal", id: "signal-eurecom-centre-ia", label: "Lancement Centre IA" },
        { type: "account_fact", id: "fact-invente-halluciné", label: "Fait halluciné" },
      ],
    },
  }],
}

const outEurecomPositif = runCodeNode(VALIDER_CONVERGENCES, {
  input: [digestEurecomPositif],
  registry: { "Pré-filtrage Déterministe": preFiltrageEurecomOut }
}).map(i => i.json)
const convEurecomPositif = outEurecomPositif[0].articles[0].convergences

check(
  "lot3 — EURECOM (cas réel) : relatedAccounts conserve EURECOM et supprime le compte halluciné",
  convEurecomPositif.relatedAccounts.some(a => a.companyId === "comp-eurecom") &&
  convEurecomPositif.relatedAccounts.every(a => a.companyId !== "comp-invente"),
)

check(
  "lot3 — EURECOM (cas réel) : evidenceRefs conserve les faits/signaux réels, supprime le fait halluciné",
  convEurecomPositif.evidenceRefs.some(r => r.type === "account_fact" && r.id === "fact-eurecom-strategic-priority") &&
  convEurecomPositif.evidenceRefs.some(r => r.type === "account_signal" && r.id === "signal-eurecom-centre-ia") &&
  convEurecomPositif.evidenceRefs.every(r => r.id !== "fact-invente-halluciné"),
)

check(
  "lot3 — EURECOM (cas réel) : confidence high conservée (convergence réellement structurée)",
  convEurecomPositif.confidence === "high",
)

// --- Cas négatif : même secteur, mais AUCUNE connaissance ne recoupe l'article --

const articleCyberOffensive = {
  id: "art_cyber_offensive",
  secteurPrincipal: "Secteur public, Enseignement supérieur & Recherche",
  secteurSecondaire: "",
  title: "Cybersécurité : les approches offensives reviennent en force",
  summary: "Un rapport pointe le retour des stratégies offensives en cybersécurité chez les grands groupes industriels.",
}

// Même secteur, mais 0 enjeu, 0 signal, 0 fait, 0 opportunité : rien ne recoupe l'article.
const preFiltrageSansConnaissanceOut = runCodeNode(PRE_FILTRAGE, {
  registry: {
    "Parser Top 5": [articleCyberOffensive],
    "Charger Comptes": secteurPublicComptes,
    "Charger Enjeux": [],
    "Charger Playbooks": secteurPublicPlaybooks,
    "Charger Signaux Comptes": [],
    "Charger Faits Comptes": [],
    "Charger Opportunités": []
  }
}).map(i => i.json)

check(
  "lot3 — cas négatif : même secteur mais 0 signal/fait/enjeu/opportunité disponible",
  preFiltrageSansConnaissanceOut[0].convergenceDebug.candidateSignalsCount === 0 &&
  preFiltrageSansConnaissanceOut[0].convergenceDebug.candidateFactsCount === 0 &&
  preFiltrageSansConnaissanceOut[0].convergenceDebug.candidateIssuesCount === 0,
)

// Sonnet, bien instruit par le prompt, ne force rien : confidence low, tout vide.
const digestSansConnaissance = {
  articles: [{
    id: "art_cyber_offensive",
    convergences: {
      schemaVersion: 2,
      synthesis: "Aucune convergence réelle : le secteur est identique mais aucun signal, fait ou enjeu KREDO ne recoupe le sujet de l'article.",
      confidence: "low",
      matchedIssues: [],
      relatedAccounts: [],
      relatedOpportunities: [],
      playbookSuggestion: null,
      recommendedActions: [],
      evidenceRefs: [],
    },
  }],
}
const outSansConnaissance = runCodeNode(VALIDER_CONVERGENCES, {
  input: [digestSansConnaissance],
  registry: { "Pré-filtrage Déterministe": preFiltrageSansConnaissanceOut }
}).map(i => i.json)

check(
  "lot3 — cas négatif : aucune convergence forcée quand le secteur seul ne suffit pas",
  outSansConnaissance[0].articles[0].convergences.confidence === "low" &&
  outSansConnaissance[0].articles[0].convergences.relatedAccounts.length === 0 &&
  outSansConnaissance[0].articles[0].convergences.relatedOpportunities.length === 0,
)

// Si, malgré tout, un modèle tentait de forcer confidence=high avec un compte hors
// contexte (même secteur, mais pas dans candidateAccounts car hors des 8 retenus, ou
// carrément halluciné), la validation doit le rabattre à low : le même secteur seul
// ne peut jamais produire de convergence structurée valide.
const digestForcageSansConnaissance = {
  articles: [{
    id: "art_cyber_offensive",
    convergences: {
      schemaVersion: 2,
      synthesis: "Tentative de forcer une convergence sur le seul critère sectoriel.",
      confidence: "high",
      matchedIssues: [],
      relatedAccounts: [{ companyId: "comp-invente", companyName: "Compte Halluciné", rationale: "Même secteur." }],
      relatedOpportunities: [],
      playbookSuggestion: null,
      recommendedActions: [],
      evidenceRefs: [],
    },
  }],
}
const outForcageSansConnaissance = runCodeNode(VALIDER_CONVERGENCES, {
  input: [digestForcageSansConnaissance],
  registry: { "Pré-filtrage Déterministe": preFiltrageSansConnaissanceOut }
}).map(i => i.json)

check(
  "lot3 — cas négatif : un compte hors candidate set sous confidence=high est supprimé ET la confidence rabattue à low",
  outForcageSansConnaissance[0].articles[0].convergences.relatedAccounts.length === 0 &&
  outForcageSansConnaissance[0].articles[0].convergences.confidence === "low",
)

// --- Opportunités : bornage, validation, et isOpen ne travestit jamais un deal gagné --

const oppFixtureComptes = [{ id: "comp-opp-1", name: "Comp Opp", sector_id: "sect_opp", segment_id: "seg_opp" }]
const oppFixturePlaybooks = [{ macro_id: "sect_opp", segment_id: "seg_opp", macro_name: "Sect Opp", segment_name: "Seg Opp", playbook: { personas: ["DSI"], objections: [], entry_points: [], roi_arguments: [] } }]
const oppFixtureOpportunites = [
  { id: "opp-ouverte", company_id: "comp-opp-1", title: "Audit gouvernance IA", stage: "qualification", opportunity_type: "audit", need_summary: "Cadrage gouvernance intelligence artificielle." },
  { id: "opp-gagnee", company_id: "comp-opp-1", title: "Ancien projet IA", stage: "gagne", opportunity_type: "conseil", need_summary: "Projet intelligence artificielle déjà livré." },
]
const articleOpp = { id: "art_opp", secteurPrincipal: "Sect Opp", secteurSecondaire: "", title: "Gouvernance de l'intelligence artificielle", summary: "Cadrage et gouvernance de l'intelligence artificielle en entreprise." }

const preFiltrageOppOut = runCodeNode(PRE_FILTRAGE, {
  registry: {
    "Parser Top 5": [articleOpp],
    "Charger Comptes": oppFixtureComptes,
    "Charger Enjeux": [],
    "Charger Playbooks": oppFixturePlaybooks,
    "Charger Signaux Comptes": [],
    "Charger Faits Comptes": [],
    "Charger Opportunités": oppFixtureOpportunites
  }
}).map(i => i.json)
const ctxOpp = preFiltrageOppOut[0].convergenceContext

check(
  "lot3 — opportunités : la qualification en cours et le deal gagné sont tous deux candidats, isOpen distingue les deux",
  ctxOpp.candidateOpportunities.find(o => o.id === "opp-ouverte")?.isOpen === true &&
  ctxOpp.candidateOpportunities.find(o => o.id === "opp-gagnee")?.isOpen === false,
)

const digestOppFixture = {
  articles: [{
    id: "art_opp",
    convergences: {
      schemaVersion: 2,
      synthesis: "L'article recoupe directement une opportunité déjà en pipe chez Comp Opp.",
      confidence: "high",
      matchedIssues: [],
      relatedAccounts: [{ companyId: "comp-opp-1", companyName: "Comp Opp", rationale: "Dossier en pipe." }],
      relatedOpportunities: [
        { opportunityId: "opp-ouverte", companyId: "comp-opp-1", companyName: "Comp Opp", opportunityTitle: "Audit gouvernance IA", stage: "qualification", rationale: "Correspond exactement au sujet de l'article." },
        { opportunityId: "opp-inventee", companyId: "comp-opp-1", companyName: "Comp Opp", opportunityTitle: "Opportunité halluciné", stage: "qualification", rationale: "N'existe pas dans le contexte." },
      ],
      playbookSuggestion: null,
      recommendedActions: [],
      evidenceRefs: [{ type: "opportunity", id: "opp-ouverte", label: "Audit gouvernance IA" }],
    },
  }],
}
const outOppFixture = runCodeNode(VALIDER_CONVERGENCES, {
  input: [digestOppFixture],
  registry: { "Pré-filtrage Déterministe": preFiltrageOppOut }
}).map(i => i.json)
const convOppFixture = outOppFixture[0].articles[0].convergences

check(
  "lot3 — opportunités : relatedOpportunities conserve l'opportunité réelle et supprime l'opportunité hallucinée",
  convOppFixture.relatedOpportunities.length === 1 &&
  convOppFixture.relatedOpportunities[0].opportunityId === "opp-ouverte",
)

check(
  "lot3 — opportunités : borne MAX_RELATED_OPPORTUNITIES respectée même si le LLM en renvoie davantage",
  (() => {
    const tropOpportunites = {
      articles: [{
        id: "art_opp",
        convergences: {
          schemaVersion: 2,
          synthesis: "Test de borne.",
          confidence: "high",
          matchedIssues: [],
          relatedAccounts: [],
          relatedOpportunities: [
            { opportunityId: "opp-ouverte", companyId: "comp-opp-1", companyName: "Comp Opp", opportunityTitle: "A", stage: "qualification", rationale: "R" },
            { opportunityId: "opp-ouverte", companyId: "comp-opp-1", companyName: "Comp Opp", opportunityTitle: "A", stage: "qualification", rationale: "R" },
            { opportunityId: "opp-ouverte", companyId: "comp-opp-1", companyName: "Comp Opp", opportunityTitle: "A", stage: "qualification", rationale: "R" },
            { opportunityId: "opp-ouverte", companyId: "comp-opp-1", companyName: "Comp Opp", opportunityTitle: "A", stage: "qualification", rationale: "R" },
          ],
          playbookSuggestion: null,
          recommendedActions: [],
          evidenceRefs: [],
        },
      }],
    }
    const out = runCodeNode(VALIDER_CONVERGENCES, {
      input: [tropOpportunites],
      registry: { "Pré-filtrage Déterministe": preFiltrageOppOut }
    }).map(i => i.json)
    return out[0].articles[0].convergences.relatedOpportunities.length === 3
  })(),
)

// --- Lot 6 — Instrumentation métriques d'efficacité ---
const PREPARER_METRIQUES = "Préparer Métriques Sources"
check("lot6 — nœud 'Préparer Métriques Sources' existe dans le workflow", Boolean(nodes[PREPARER_METRIQUES]))

const metricsResult = runCodeNode(PREPARER_METRIQUES, {
  input: [{}],
  registry: {
    "Charger Sources Effectives (Supabase)": [
      { source_id: "src-prod-1", corpus_id: "corp-1" },
      { source_id: "src-improd-2", corpus_id: "corp-1" },
      { source_id: "src-err-3", corpus_id: null },
    ],
    "Enrichir avec Métadonnées Source": [
      { sourceId: "src-prod-1", title: "Article 1" },
      { sourceId: "src-prod-1", title: "Article 2" },
      { sourceId: "src-improd-2", title: "Article 3" },
    ],
    "Ignorer Source En Erreur": [
      { sourceId: "src-err-3", error: true },
    ],
    "Dédup + Filtre Récence + Préfiltre Qualité": [
      { sourceId: "src-prod-1", title: "Article 1" },
      { sourceId: "src-improd-2", title: "Article 3" },
    ],
    "Préparer Lignes Articles": [
      { source_catalog_id: "src-prod-1", title: "Article 1" },
    ],
  },
}).map((i) => i.json)

check("lot6 — métriques : produit 3 lignes de métriques (1 par source)", metricsResult.length === 3)

const metricsBySrc = new Map(metricsResult.map((m) => [m.source_catalog_id, m]))

const mProd = metricsBySrc.get("src-prod-1")
check(
  "lot6 — Cas A (source productive) : query_succeeded=true, items_collected=2, items_after_dedup=1, items_retained=1",
  Boolean(mProd && mProd.query_succeeded === true && mProd.items_collected === 2 && mProd.items_after_dedup === 1 && mProd.items_retained === 1),
)

const mImprod = metricsBySrc.get("src-improd-2")
check(
  "lot6 — Cas B (source improductive - CRITIQUE) : query_succeeded=true, items_collected=1, items_retained=0",
  Boolean(mImprod && mImprod.query_succeeded === true && mImprod.items_collected === 1 && mImprod.items_retained === 0),
)

const mErr = metricsBySrc.get("src-err-3")
check(
  "lot6 — Cas C (source en erreur) : query_succeeded=false, items_collected=0, items_retained=0",
  Boolean(mErr && mErr.query_succeeded === false && mErr.items_collected === 0 && mErr.items_retained === 0),
)

console.log(`\n${passed} ok · ${failed} échec(s)`)
process.exit(failed === 0 ? 0 : 1)


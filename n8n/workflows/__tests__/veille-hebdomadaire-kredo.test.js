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
const lignesArticles = runCodeNode(PREPARER_LIGNES, {
  input: [digestArticlesFixture],
  registry: {
    "Valider Convergences": [digestArticlesFixture],
    "Créer Digest": [{ id: "digest-uuid-1" }],
    "Build Contexte KREDO": [{ workspaceId: "workspace-uuid-1" }],
  },
}).map((i) => i.json)
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

const companiesFixture = [
  { id: "comp_1", name: "Comp 1", sector_id: "sect_1", segment_id: "seg_1" },
  { id: "comp_2", name: "Comp 2", sector_id: "sect_2", segment_id: "seg_2" }
]
const issuesFixture = [
  { id: "issue_1", company_id: "comp_1", title: "Enjeu 1", problem_statement: "Prob 1" },
  { id: "issue_2", company_id: "comp_2", title: "Enjeu 2", problem_statement: "Prob 2" }
]
const playbooksFixture = [
  { macro_id: "sect_1", segment_id: "seg_1", macro_name: "Sect 1", segment_name: "Seg 1", playbook: {} }
]

const preFiltrageOut = runCodeNode(PRE_FILTRAGE, {
  registry: {
    "Parser Top 5": [{ id: "art_1", secteurPrincipal: "sect_1", secteurSecondaire: "seg_1" }],
    "Charger Comptes": companiesFixture,
    "Charger Enjeux": issuesFixture,
    "Charger Playbooks": playbooksFixture
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
    const lignes = runCodeNode(PREPARER_LIGNES, {
      input: [{ articles: [{ id: "art_1", convergences: { schemaVersion: 1 } }] }],
      registry: {
        "Valider Convergences": [{ articles: [{ id: "art_1", convergences: { schemaVersion: 1 } }] }],
        "Créer Digest": [{ id: "digest_1" }],
        "Build Contexte KREDO": [{ workspaceId: "ws_1" }]
      }
    }).map(i => i.json);
    return lignes[0].convergences && lignes[0].convergences.schemaVersion === 1;
  })(),
)

console.log(`\n${passed} ok · ${failed} échec(s)`)
process.exit(failed === 0 ? 0 : 1)

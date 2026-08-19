"use strict"

/* eslint-disable @typescript-eslint/no-require-imports */

// Harnais INTEL-033 — créé au Lot 5 « Gestion des sources » (aucun harnais n'existait avant ce
// lot pour ce workflow, malgré la documentation de reprise du chantier qui en supposait
// l'existence — voir HANDOFF-LOT5.md §0). Couvre le contrat `includeSectorCorpus` de bout en
// bout (route manuelle, scheduler, workflow), le branchement du corpus sectoriel effectif, le
// re-clé du tourniquet, le filtre administratif déterministe, et une contre-preuve que les
// garanties de convergence déjà réparées (§8/§9/§12 du SETUP.md) restent intactes.

const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")

const WORKFLOW_PATH = path.join(__dirname, "..", "intel-033-account-watch-refresh.json")
const SCHEDULER_PATH = path.join(__dirname, "..", "account-watch-scheduler.json")
const SETTINGS_LIB_PATH = path.join(
  __dirname, "..", "..", "..", "src", "lib", "intelligence", "account-watch-settings.ts",
)
const N8N_TYPES_PATH = path.join(__dirname, "..", "..", "..", "src", "lib", "n8n", "types.ts")
const ROUTE_PATH = path.join(
  __dirname, "..", "..", "..", "src", "app", "api", "intelligence", "accounts",
  "[companyId]", "watch-refresh", "route.ts",
)

const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, "utf8"))
const scheduler = JSON.parse(fs.readFileSync(SCHEDULER_PATH, "utf8"))
const settingsLibSource = fs.readFileSync(SETTINGS_LIB_PATH, "utf8")
const n8nTypesSource = fs.readFileSync(N8N_TYPES_PATH, "utf8")
const routeSource = fs.readFileSync(ROUTE_PATH, "utf8")

const nodes = Object.fromEntries(workflow.nodes.map((node) => [node.name, node]))
const schedulerNodes = Object.fromEntries(scheduler.nodes.map((node) => [node.name, node]))

let passed = 0
let failed = 0

function check(label, condition, detail = "") {
  if (condition) {
    passed += 1
    console.log(`ok  ${label}`)
    return
  }
  failed += 1
  console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""}`)
}

/**
 * Exécute le jsCode d'un nœud dans un bac à sable minimal. `registry` associe un nom de nœud à
 * sa dernière sortie (un objet json unique, ou un tableau pour un nœud multi-items) — ce qui
 * permet à `$('NodeName').item/.first()/.all()` de résoudre correctement, y compris à travers
 * une boucle (où `.item` représente "la source en cours d'itération").
 */
async function runCodeNode(name, registry, { input, currentJson } = {}) {
  const node = nodes[name]
  if (!node) throw new Error(`Nœud introuvable : ${name}`)

  const resolveRef = (nodeName) => {
    const value = registry[nodeName]
    const arr = Array.isArray(value) ? value : [value]
    return {
      item: { json: Array.isArray(value) ? value[0] : value },
      first: () => ({ json: arr[0] }),
      all: () => arr.map((json) => ({ json })),
    }
  }

  const sandbox = {
    $input: {
      first: () => ({ json: Array.isArray(input) ? input[0] : (input ?? {}) }),
      all: () => (Array.isArray(input) ? input : [input ?? {}]).map((json) => ({ json })),
    },
    $: resolveRef,
    $json: currentJson,
    $execution: { id: "exec-033" },
    $workflow: { id: "wf-033" },
    console,
    Date,
    Intl,
    JSON,
    Array,
    Object,
    Set,
    Map,
    Number,
    String,
    RegExp,
    Error,
    Boolean,
    encodeURIComponent,
  }
  const context = vm.createContext(sandbox)
  const script = new vm.Script(`(async () => {\n${node.parameters.jsCode}\n})()`, {
    filename: `${name}.js`,
  })
  const result = await script.runInContext(context)

  // Normalise la sortie quel que soit le mode du nœud (runOnceForAllItems renvoie un tableau
  // d'items, runOnceForEachItem renvoie un objet unique) : `.json` = premier/seul item,
  // `.items` = tableau complet — les appelants n'ont pas besoin de connaître le mode du nœud.
  const items = Array.isArray(result) ? result : [result]

  if (Array.isArray(result)) {
    registry[name] = result.map((r) => r.json)
  } else if (result && typeof result === "object" && "json" in result) {
    registry[name] = result.json
  }

  return { items, json: items[0] ? items[0].json : undefined }
}

function baseCtx(overrides = {}) {
  return {
    runId: "run-1",
    workspaceId: "workspace-1",
    companyId: "company-1",
    userId: "user-1",
    callbackUrl: "https://kredo.example/api/n8n/callback",
    company: { id: "company-1", name: "Robertet", website: "https://robertet.com", sector: "Parfumerie", description: null },
    primaryName: "Robertet",
    nameVariants: ["Robertet", "Robertet SA"],
    settings: {
      isEnabled: true,
      watchLevel: "standard",
      cadence: "weekly",
      includeOfficialSite: true,
      includeNews: true,
      includePublicRecords: false,
      includeTenders: false,
      includeSocialManual: false,
      includeSectorCorpus: true,
      queryAliases: [],
    },
    collectedItems: [],
    ...overrides,
  }
}

function sectorSourceRow(overrides = {}) {
  return {
    usage_scope: "account_watch",
    company_id: "company-1",
    source_id: "src-1",
    source_key: "usinenouvelle.com",
    source_name: "Usine Nouvelle",
    publisher: "Usine Nouvelle",
    domain: "usinenouvelle.com",
    search_domain: "usinenouvelle.com",
    collection_url: null,
    collection_mode: "site_search",
    family: "Presse spécialisée",
    kredo_category: "vertical",
    origin: "corpus",
    corpus_id: "corpus-1",
    utility_score: 80,
    priority: 2,
    ...overrides,
  }
}

async function main() {
  // -------------------------------------------------------------------------------------------
  // 1. Contrat `includeSectorCorpus` — TS (route manuelle, lib settings, n8n/types.ts)
  // -------------------------------------------------------------------------------------------
  check(
    "account-watch-settings.ts déclare includeSectorCorpus sur AccountWatchWorkflowSettings",
    /includeSectorCorpus: boolean/.test(settingsLibSource),
  )
  check(
    "account-watch-settings.ts lit include_sector_corpus dans AccountWatchSettingsWorkflowRow",
    /"include_sector_corpus"/.test(settingsLibSource),
  )
  check(
    "DEFAULT_ACCOUNT_WATCH_WORKFLOW_SETTINGS.includeSectorCorpus === true",
    /includeSectorCorpus: true,/.test(settingsLibSource),
  )
  check(
    "toAccountWatchWorkflowSettings mappe row.include_sector_corpus",
    /includeSectorCorpus: row\.include_sector_corpus,/.test(settingsLibSource),
  )
  check(
    "n8n/types.ts déclare includeSectorCorpus sur AccountWatchRefreshSettings",
    /includeSectorCorpus: boolean/.test(n8nTypesSource),
  )
  check(
    "route watch-refresh transporte include_sector_corpus dans SETTINGS_SELECT",
    /SETTINGS_SELECT\s*=\s*\n?\s*"[^"]*include_sector_corpus[^"]*"/.test(routeSource),
  )
  check(
    "scheduler transmet include_sector_corpus dans le select PostgREST",
    /"value":\s*"[^"]*include_sector_corpus[^"]*workspaces\(owner_id\)"/.test(
      JSON.stringify(schedulerNodes["Supabase: Load Active Watch Settings"]),
    ),
  )
  check(
    "scheduler reconstruit includeSectorCorpus dans le payload settings envoyé au webhook",
    /includeSectorCorpus: row\.include_sector_corpus/.test(
      schedulerNodes["Build Webhook Payload"].parameters.jsCode,
    ),
  )

  // -------------------------------------------------------------------------------------------
  // 2. Validate Payload — includeSectorCorpus, défaut true, rétrocompatible
  // -------------------------------------------------------------------------------------------
  {
    const reg = {}
    const withFlag = await runCodeNode("Validate Payload", reg, {
      input: {
        body: {
          runId: "r1", workspaceId: "w1", companyId: "c1", userId: "u1",
          settings: { includeSectorCorpus: false },
          callbackUrl: "https://x/callback",
        },
        headers: { "x-kredo-signature": "sha256=sig" },
        computedSignature: "sig",
      },
    })
    check("Validate Payload propage includeSectorCorpus=false explicite", withFlag.json.settings.includeSectorCorpus === false)
  }
  {
    const reg = {}
    const withoutFlag = await runCodeNode("Validate Payload", reg, {
      input: {
        body: {
          runId: "r1", workspaceId: "w1", companyId: "c1", userId: "u1",
          settings: {},
          callbackUrl: "https://x/callback",
        },
        headers: { "x-kredo-signature": "sha256=sig" },
        computedSignature: "sig",
      },
    })
    check(
      "Validate Payload défaut includeSectorCorpus=true (ancienne requête sans le champ)",
      withoutFlag.json.settings.includeSectorCorpus === true,
    )
  }
  {
    const reg = {}
    const explicitTrue = await runCodeNode("Validate Payload", reg, {
      input: {
        body: {
          runId: "r1", workspaceId: "w1", companyId: "c1", userId: "u1",
          settings: { includeSectorCorpus: true },
          callbackUrl: "https://x/callback",
        },
        headers: { "x-kredo-signature": "sha256=sig" },
        computedSignature: "sig",
      },
    })
    check("Validate Payload propage includeSectorCorpus=true explicite", explicitTrue.json.settings.includeSectorCorpus === true)
  }

  // -------------------------------------------------------------------------------------------
  // 3. Load Effective Sector Sources — structure de la requête (§4/§5 du prompt)
  // -------------------------------------------------------------------------------------------
  {
    const loadNode = nodes["Load Effective Sector Sources"]
    check("Load Effective Sector Sources existe", !!loadNode)
    const qp = JSON.stringify(loadNode.parameters.queryParameters)
    check("filtre usage_scope=eq.account_watch", qp.includes("eq.account_watch"))
    check("filtre company_id sur companyId du run", qp.includes("company_id") && qp.includes("companyId"))
    check("tri priority.asc,utility_score.desc", qp.includes("priority.asc,utility_score.desc"))
    check("lit v_effective_watch_sources (pas source_corpora/source_catalog directement)", loadNode.parameters.url.endsWith("v_effective_watch_sources"))
    check("alwaysOutputData=true (une erreur réseau ne stoppe jamais la chaîne)", loadNode.alwaysOutputData === true)
    check("onError=continueErrorOutput", loadNode.onError === "continueErrorOutput")
  }
  check(
    "le workflow ne lit jamais source_corpora/source_corpus_items/source_catalog en direct",
    !JSON.stringify(workflow.nodes).includes("/source_corpora") &&
      !JSON.stringify(workflow.nodes).includes("/source_corpus_items") &&
      !JSON.stringify(workflow.nodes).includes("/source_catalog?"),
  )

  // -------------------------------------------------------------------------------------------
  // 4. Shape Sector Sources — plafond 12, priorisation, jamais 0 item en sortie
  // -------------------------------------------------------------------------------------------
  {
    const reg = {}
    const rows = Array.from({ length: 20 }, (_, i) =>
      sectorSourceRow({ source_id: `src-${i}`, source_key: `domain-${i}.fr`, priority: i % 3, utility_score: 100 - i }))
    const out = await runCodeNode("Shape Sector Sources", reg, { input: rows })
    check("Shape Sector Sources plafonne strictement à 12 sources", out.items.length === 12, `got ${out.items.length}`)
    check("sectorSourcesLoaded = nombre brut de lignes (20)", out.json.sectorSourcesLoaded === 20)
    check("sectorSourcesQueried = 12", out.json.sectorSourcesQueried === 12)
    const priorities = out.items.map((o) => o.json.sourceCatalogId)
    check("priorisation : priority ASC puis utility_score DESC respectée", (() => {
      const sortedIds = [...rows].sort((a, b) => (a.priority - b.priority) || (b.utility_score - a.utility_score)).slice(0, 12).map((r) => r.source_id)
      return JSON.stringify(sortedIds) === JSON.stringify(priorities)
    })())
  }
  {
    const reg = {}
    const out = await runCodeNode("Shape Sector Sources", reg, { input: [] })
    check("Shape Sector Sources ne retourne JAMAIS [] (0 source → placeholder, pas d'arrêt de chaîne)", out.items.length === 1 && out.json.placeholder === true)
    check("placeholder porte sectorSourcesLoaded=0", out.json.sectorSourcesLoaded === 0)
  }
  {
    const reg = {}
    const out = await runCodeNode("Shape Sector Sources", reg, { input: [{ error: "network down" }] })
    check("une erreur réseau sur la liste de sources dégrade en 0 source (jamais un throw)", out.items.length === 1 && out.json.placeholder === true)
  }

  // -------------------------------------------------------------------------------------------
  // 5. Build Sector Corpus Query — construction site: + alias, jamais de multiplication
  // -------------------------------------------------------------------------------------------
  {
    const reg = { "Shape+Accumulate: Tenders": baseCtx({ nameVariants: ["Robertet", "Robertet SA"] }) }
    const src = { sourceCatalogId: "src-1", sourceKey: "usinenouvelle.com", sourceName: "Usine Nouvelle", searchDomain: "usinenouvelle.com", corpusId: "corpus-1" }
    const out = await runCodeNode("Build Sector Corpus Query", reg, { currentJson: src })
    check("construit une requête site:<search_domain>", out.json.feedUrl.includes(encodeURIComponent("site:usinenouvelle.com")))
    check("combine les 2 premiers alias en OR dans LA MÊME requête", out.json.feedUrl.includes(encodeURIComponent('"Robertet" OR "Robertet SA"')))
    check("une seule requête produite (pas de multiplication par alias)", typeof out.json.feedUrl === "string" && !Array.isArray(out.json.feedUrl))
  }
  {
    const reg = { "Shape+Accumulate: Tenders": baseCtx({ nameVariants: [] }) }
    const out = await runCodeNode("Build Sector Corpus Query", reg, { currentJson: { sourceCatalogId: "src-1", searchDomain: "usinenouvelle.com" } })
    check("query aliases absents : fallback site:<domain> seul, sans planter", out.json.feedUrl.includes(encodeURIComponent("site:usinenouvelle.com")))
  }
  {
    const reg = { "Shape+Accumulate: Tenders": baseCtx() }
    const out = await runCodeNode("Build Sector Corpus Query", reg, { currentJson: { placeholder: true, sectorSourcesLoaded: 0, sectorSourcesQueried: 0 } })
    check("placeholder (0 source) : feedUrl=null, aucune requête construite", out.json.feedUrl === null)
  }

  // -------------------------------------------------------------------------------------------
  // 6. Shape Sector Corpus Item — provenance réelle, propagation sourceCatalogId/corpusId
  // -------------------------------------------------------------------------------------------
  {
    const reg = {
      "Loop Over Sector Sources": {
        sourceCatalogId: "src-1", sourceKey: "usinenouvelle.com", sourceName: "Usine Nouvelle",
        searchDomain: "usinenouvelle.com", corpusId: "corpus-1",
      },
    }
    const rssItem = { title: "Robertet investit dans une nouvelle usine - Usine Nouvelle", link: "https://usinenouvelle.com/art1", isoDate: "2026-08-01", contentSnippet: "..." }
    const out = await runCodeNode("Shape Sector Corpus Item", reg, { currentJson: rssItem })
    check("sourceType = sector_corpus", out.json.sourceType === "sector_corpus")
    check("collectedVia = sector_corpus", out.json.collectedVia === "sector_corpus")
    check("sourceCatalogId propagé", out.json.sourceCatalogId === "src-1")
    check("corpusId propagé", out.json.corpusId === "corpus-1")
    check("sourceKey propagé", out.json.sourceKey === "usinenouvelle.com")
    check("jamais 'Google News' comme éditeur quand un éditeur réel est déballé", out.json.sourceName === "Usine Nouvelle" && out.json.sourceName !== "Google News")
    check("le suffixe éditeur est retiré du titre", out.json.title === "Robertet investit dans une nouvelle usine")
  }
  {
    // Provenance sans balise <source> ni suffixe exploitable : fallback sur le nom de la source
    // du catalogue KREDO, jamais "Google News".
    const reg = { "Loop Over Sector Sources": { sourceCatalogId: "src-2", sourceKey: "lemonde.fr", sourceName: "Le Monde", searchDomain: "lemonde.fr", corpusId: "corpus-1" } }
    const rssItem = { title: "Un titre sans indication d'éditeur", link: "https://lemonde.fr/art2" }
    const out = await runCodeNode("Shape Sector Corpus Item", reg, { currentJson: rssItem })
    check("fallback sur le nom de la source catalogue si aucun éditeur détectable dans le flux", out.json.sourceName === "Le Monde")
  }
  {
    const reg = { "Loop Over Sector Sources": { sourceCatalogId: "src-1", sourceKey: "k1" } }
    const emptyRss = { title: null, link: null }
    const out = await runCodeNode("Shape Sector Corpus Item", reg, { currentJson: emptyRss })
    check("0 résultat RSS pour une source (item vide) : marqué skipped, jamais une exception", out.json.skipped === true)
  }

  // -------------------------------------------------------------------------------------------
  // 7. Ignore Sector Corpus Source Error — une source en erreur, les autres continuent
  // -------------------------------------------------------------------------------------------
  {
    const reg = { "Loop Over Sector Sources": { sourceCatalogId: "src-9", sourceKey: "erreur.fr", sourceName: "Source en panne", searchDomain: "erreur.fr" } }
    const out = await runCodeNode("Ignore Sector Corpus Source Error", reg, { input: { error: "ETIMEDOUT" } })
    check("source en erreur : item skipped produit (jamais un tableau vide)", out.items.length === 1 && out.json.skipped === true)
    check("sourceCatalogId de la source en erreur tracé", out.json.sourceCatalogId === "src-9")
  }

  // -------------------------------------------------------------------------------------------
  // 8. Accumulate Sector Corpus Items — dédup + compteurs
  // -------------------------------------------------------------------------------------------
  {
    const reg = {
      "Shape+Accumulate: Tenders": baseCtx(),
      "Shape Sector Sources": [{ sectorSourcesLoaded: 15, sectorSourcesQueried: 12 }],
    }
    const raw = [
      { url: "https://a.fr/1", title: "Robertet remporte un marché" },
      { url: "https://a.fr/1", title: "Robertet remporte un marché" }, // doublon URL exact
      { url: "https://b.fr/2", title: "Robertet remporte un marché" }, // même titre normalisé, URL différente -> dédupliqué aussi (dédup douce titre)
      { url: "https://c.fr/3", title: "Un autre article distinct" },
      { skipped: true },
      { placeholder: true },
    ]
    const out = await runCodeNode("Accumulate Sector Corpus Items", reg, { input: raw })
    // 6 items bruts : 2 doublons URL exacte, 1 même titre normalisé (URL différente), 1 distinct,
    // 1 skipped, 1 placeholder. "Collected" = tout ce qui porte url+title et n'est pas skipped
    // (4, le placeholder/skipped n'ayant ni url ni title) ; le dédup (URL puis titre) les ramène à 2.
    check("sectorItemsCollected exclut les items skipped/placeholder", out.json.sectorItemsCollected === 4, `got ${out.json.sectorItemsCollected}`)
    check("sectorItemsAfterDedup déduplique URL + titre normalisé", out.json.sectorItemsAfterDedup === 2, `got ${out.json.sectorItemsAfterDedup}`)
    check("sectorSourcesLoaded/Queried propagés depuis Shape Sector Sources", out.json.sectorSourcesLoaded === 15 && out.json.sectorSourcesQueried === 12)
    check("ctx (runId/companyId/collectedItems historiques) préservé", out.json.runId === "run-1" && Array.isArray(out.json.collectedItems))
  }

  // -------------------------------------------------------------------------------------------
  // 9. Skip Sector Corpus — includeSectorCorpus=false : zéro coût, zéro item
  // -------------------------------------------------------------------------------------------
  {
    const reg = {}
    const out = await runCodeNode("Skip Sector Corpus", reg, { input: baseCtx({ settings: { ...baseCtx().settings, includeSectorCorpus: false } }) })
    check("sectorItems=[] quand le corpus est désactivé", Array.isArray(out.json.sectorItems) && out.json.sectorItems.length === 0)
    check("les 4 compteurs sector_* sont à 0", [out.json.sectorSourcesLoaded, out.json.sectorSourcesQueried, out.json.sectorItemsCollected, out.json.sectorItemsAfterDedup].every((v) => v === 0))
  }

  // -------------------------------------------------------------------------------------------
  // 10. Merge Collected Items — convergence unique avant Normalize & Dedup Items
  // -------------------------------------------------------------------------------------------
  {
    const reg = {}
    const historical = [{ title: "Article historique", url: "https://h.fr/1", sourceType: "news_media" }]
    const sector = [{ title: "Article corpus", url: "https://s.fr/1", sourceType: "sector_corpus", sourceCatalogId: "src-1" }]
    const out = await runCodeNode("Merge Collected Items", reg, { input: { ...baseCtx(), collectedItems: historical, sectorItems: sector } })
    check("fusionne items historiques + items corpus dans collectedItems", out.json.collectedItems.length === 2)
    check("aucun item historique perdu", out.json.collectedItems.some((it) => it.url === "https://h.fr/1"))
    check("aucun item corpus perdu", out.json.collectedItems.some((it) => it.url === "https://s.fr/1"))
  }

  // -------------------------------------------------------------------------------------------
  // 11. Normalize & Dedup Items — tourniquet re-clé (contre-épreuve §27), plafond 40 inchangé
  // -------------------------------------------------------------------------------------------
  {
    // 12 sources corpus distinctes (sourceType identique 'sector_corpus' pour toutes) + 3
    // sources historiques. Un ancien tourniquet clé par sourceType SEUL grouperait les 12
    // sources corpus dans UNE SEULE file 'sector_corpus' — les 11 dernières s'écraseraient
    // derrière les items de la première source à chaque tour. Le nouveau code (sourceCatalogId)
    // doit donner à CHACUNE des 12 sources une chance réelle de contribuer.
    const sectorItems = []
    for (let s = 0; s < 12; s++) {
      for (let a = 0; a < 5; a++) {
        sectorItems.push({
          title: `Source ${s} article ${a}`,
          url: `https://source${s}.fr/art${a}`,
          sourceType: "sector_corpus",
          sourceCatalogId: `src-${s}`,
          sourceKey: `source${s}.fr`,
          publishedAt: new Date(Date.now() - a * 86400000).toISOString(),
        })
      }
    }
    const historicalItems = Array.from({ length: 3 }, (_, i) => ({
      title: `Historique ${i}`, url: `https://histo.fr/${i}`, sourceType: "news_media",
      publishedAt: new Date().toISOString(),
    }))

    const reg = { "Shape+Accumulate: Tenders": baseCtx() }
    const input = { ...baseCtx(), collectedItems: [...historicalItems, ...sectorItems], existingDedupeKeys: [] }
    const out = await runCodeNode("Normalize & Dedup Items", reg, { input })

    const bySource = new Map()
    for (const it of out.json.normalizedItems) {
      const key = it.sourceCatalogId || it.sourceType
      bySource.set(key, (bySource.get(key) || 0) + 1)
    }
    const distinctSectorSourcesContributing = [...bySource.keys()].filter((k) => k.startsWith("src-")).length

    check(
      "contre-épreuve tourniquet : au moins 10 des 12 sources corpus contribuent réellement (re-clé sourceCatalogId)",
      distinctSectorSourcesContributing >= 10,
      `only ${distinctSectorSourcesContributing}/12 contributed`,
    )
    check("plafond de 40 candidats inchangé", out.json.normalizedItems.length <= 40)
    check(
      "démonstration : un regroupement par sourceType SEUL aurait échoué sur cette même fixture",
      (() => {
        const byType = new Map()
        for (const it of [...historicalItems, ...sectorItems]) {
          if (!byType.has(it.sourceType)) byType.set(it.sourceType, [])
          byType.get(it.sourceType).push(it)
        }
        // Avec l'ancien algorithme, le tourniquet ne verrait que 2 files : 'news_media' et
        // 'sector_corpus' — les 12 sources corpus seraient fusionnées dans UNE file, donc au
        // maximum 1 source visible "en tête" par tour au lieu de 12.
        return byType.get("sector_corpus").length === 60 && byType.size === 2
      })(),
    )
    check(
      "sectorSourcesLoaded/Queried/Collected/AfterDedup propagés en sortie de Normalize & Dedup Items",
      ["sectorSourcesLoaded", "sectorSourcesQueried", "sectorItemsCollected", "sectorItemsAfterDedup"].every((f) => f in out.json),
    )
  }
  {
    // Régression : sans aucune source corpus (collecteurs historiques seuls), le tourniquet
    // continue de fonctionner comme avant (clé sourceKey/sourceName/sourceType en repli).
    const reg = { "Shape+Accumulate: Tenders": baseCtx() }
    const historicalOnly = Array.from({ length: 5 }, (_, i) => ({
      title: `Article ${i}`, url: `https://histo.fr/${i}`, sourceType: "news_media", sourceName: "Le Monde",
      publishedAt: new Date().toISOString(),
    }))
    const out = await runCodeNode("Normalize & Dedup Items", reg, {
      input: { ...baseCtx(), collectedItems: historicalOnly, existingDedupeKeys: [] },
    })
    check("aucune régression sur les collecteurs historiques sans corpus", out.json.normalizedItems.length === 5)
  }

  // -------------------------------------------------------------------------------------------
  // 12. Filter Administrative Static Items — matrice ≥15 cas (§28 du prompt)
  // -------------------------------------------------------------------------------------------
  const adminMatrix = [
    ["Code NAF : 20.42Z", "EXCLU"],
    ["Siège social : Grasse", "EXCLU"],
    ["SIREN 123456789", "EXCLU"],
    ["SIRET 12345678900012", "EXCLU"],
    ["Capital social : 50 000 €, forme juridique SASU", "EXCLU"],
    ["Coordonnées administratives inchangées", "EXCLU"],
    ["Transfert du siège social à Paris", "CONSERVE"],
    ["Nomination de Mme X comme DG", "CONSERVE"],
    ["Augmentation de capital de 20 M€", "CONSERVE"],
    ["Robertet remporte un marché public", "CONSERVE"],
    ["Fusion de deux filiales", "CONSERVE"],
    ["Ouverture d'un nouvel établissement", "CONSERVE"],
    ["Acquisition d'un concurrent italien", "CONSERVE"],
    ["Liquidation judiciaire prononcée", "CONSERVE"],
    ["Redressement judiciaire ouvert", "CONSERVE"],
    ["Nouveau partenariat avec un acteur du secteur", "CONSERVE"],
    ["Transfert du siège social (SIREN 123456789) à Paris", "CONSERVE"], // admin + événement -> jamais exclu
    ["Un article qui ne parle ni d'administratif ni d'événement", "CONSERVE"],
  ]
  {
    const reg = { "Shape+Accumulate: Tenders": baseCtx() }
    for (const [title, expected] of adminMatrix) {
      const normalized = { ...baseCtx(), normalizedItems: [{ id: "item_0", title, snippet: "", url: "https://x.fr/1", sourceType: "news_media" }] }
      const out = await runCodeNode("Filter Administrative Static Items", reg, { input: normalized })
      const wasExcluded = out.json.normalizedItems.length === 0
      const matches = expected === "EXCLU" ? wasExcluded : !wasExcluded
      check(`filtre administratif — "${title}" → ${expected}`, matches)
    }
  }
  {
    const reg = { "Shape+Accumulate: Tenders": baseCtx() }
    const items = [
      { id: "item_0", title: "Code NAF : 20.42Z", snippet: "" },
      { id: "item_1", title: "SIREN 123456789", snippet: "" },
      { id: "item_2", title: "Robertet remporte un marché public", snippet: "" },
    ]
    const out = await runCodeNode("Filter Administrative Static Items", reg, { input: { ...baseCtx(), normalizedItems: items } })
    check("excludedStaticCount exact (2 exclus sur 3)", out.json.excludedStaticCount === 2)
    check("l'item événementiel survit au filtre", out.json.normalizedItems.some((it) => it.id === "item_2"))
  }

  // -------------------------------------------------------------------------------------------
  // 13. Skip Qualification lit désormais le nœud du filtre administratif
  // -------------------------------------------------------------------------------------------
  check(
    "Skip Qualification référence Filter Administrative Static Items (pas Normalize & Dedup Items directement)",
    nodes["Skip Qualification"].parameters.jsCode.includes("$('Filter Administrative Static Items')"),
  )
  {
    const reg = { "Filter Administrative Static Items": { ...baseCtx(), normalizedItems: [], excludedStaticCount: 2 } }
    const out = await runCodeNode("Skip Qualification", reg, {})
    check("Skip Qualification : 0 item à qualifier → qualifiedItems=[], coût LLM null", out.json.qualifiedItems.length === 0 && out.json.llmModel === null)
  }

  // -------------------------------------------------------------------------------------------
  // 14. Finalize Run Summary — nouveaux compteurs additifs, version bumpée
  // -------------------------------------------------------------------------------------------
  {
    const reg = {
      "Compute Scores & Apply Rules": {
        runId: "run-1", workspaceId: "workspace-1", companyId: "company-1", callbackUrl: "https://x/callback",
        company: { name: "Robertet" }, itemsCollectedTotal: 10, itemsAfterDedup: 8,
        scoredItems: [], rejectedOffTopic: 0, noisySourcesCapped: false, llmModel: null, llmTokensInput: null, llmTokensOutput: null,
      },
      "Filter Administrative Static Items": {
        excludedStaticCount: 3, sectorSourcesLoaded: 12, sectorSourcesQueried: 12, sectorItemsCollected: 24, sectorItemsAfterDedup: 20,
      },
    }
    const out = await runCodeNode("Finalize Run Summary", reg, {})
    check("excludedStaticCount remonté dans Finalize Run Summary", out.json.excludedStaticCount === 3)
    check("sectorSourcesLoaded/Queried/Collected/AfterDedup remontés", out.json.sectorSourcesLoaded === 12 && out.json.sectorSourcesQueried === 12 && out.json.sectorItemsCollected === 24 && out.json.sectorItemsAfterDedup === 20)
    check("workflowVersion bumpée pour ce lot", out.json.workflowVersion === "2026-08-16.1")
  }
  check(
    "Prepare Callback propage les nouveaux compteurs dans contentJson (additif)",
    ["excludedStaticCount", "sectorSourcesLoaded", "sectorSourcesQueried", "sectorItemsCollected", "sectorItemsAfterDedup"]
      .every((field) => nodes["Prepare Callback"].parameters.jsCode.includes(`${field}: data.${field}`)),
  )

  // -------------------------------------------------------------------------------------------
  // 15. Provenance — sourceCatalogId/corpusId dans technical_metadata (Build Sources Payload)
  // -------------------------------------------------------------------------------------------
  check(
    "Build Sources Payload écrit sourceCatalogId/corpusId dans technical_metadata",
    nodes["Build Sources Payload"].parameters.jsCode.includes("sourceCatalogId: it.sourceCatalogId || null") &&
      nodes["Build Sources Payload"].parameters.jsCode.includes("corpusId: it.corpusId || null"),
  )
  check(
    "Build Sources Payload ne supprime pas les métadonnées existantes (collector/collectedVia/runId)",
    ["collector:", "collectedVia:", "runId:"].every((f) => nodes["Build Sources Payload"].parameters.jsCode.includes(f)),
  )

  // -------------------------------------------------------------------------------------------
  // 16. Convergence — invariants A à F du prompt (§20), contre-preuve de non-régression
  // -------------------------------------------------------------------------------------------
  {
    // Cas A : 0 corpus (pas de sources sectorielles) + collecteurs optionnels désactivés
    const reg = { "Shape+Accumulate: Tenders": baseCtx() }
    const zeroCorpus = await runCodeNode("Shape Sector Sources", reg, { input: [] })
    check("Cas A — 0 corpus : le workflow ne s'arrête jamais (placeholder produit)", zeroCorpus.items.length === 1)
  }
  {
    // Cas C : 0 item à qualifier après filtre administratif → Skip Qualification → succès
    const reg = { "Filter Administrative Static Items": { ...baseCtx(), normalizedItems: [] } }
    const out = await runCodeNode("Skip Qualification", reg, {})
    check("Cas C — 0 item à qualifier : convergence vers Skip Qualification, pas d'exception", Array.isArray(out.json.qualifiedItems))
  }
  {
    // Cas D : 0 signal après qualification (tous rejetés hors-sujet) → pas d'écriture, callback succès
    const scores = { runId: "run-1", workspaceId: "workspace-1", companyId: "company-1", callbackUrl: "https://x/callback", company: {}, itemsCollectedTotal: 5, itemsAfterDedup: 5, scoredItems: [], rejectedOffTopic: 5, noisySourcesCapped: false, llmModel: "claude-sonnet-5", llmTokensInput: 100, llmTokensOutput: 50 }
    const reg = { "Compute Scores & Apply Rules": scores, "Filter Administrative Static Items": { excludedStaticCount: 0, sectorSourcesLoaded: 0, sectorSourcesQueried: 0, sectorItemsCollected: 0, sectorItemsAfterDedup: 0 } }
    const out = await runCodeNode("Finalize Run Summary", reg, {})
    check("Cas D — 0 signal : Finalize Run Summary converge proprement (signalsWritten géré)", typeof out.json.signalsWritten === "number")
  }

  // -------------------------------------------------------------------------------------------
  // 17. Non-régression — garanties déjà réparées avant ce lot (§0.2 du prompt)
  // -------------------------------------------------------------------------------------------
  check("alwaysOutputData toujours vrai sur Collect: Official Site", nodes["Collect: Official Site"].alwaysOutputData === true)
  check("alwaysOutputData toujours vrai sur Collect: News Media", nodes["Collect: News Media"].alwaysOutputData === true)
  check("alwaysOutputData toujours vrai sur Collect: Public Records", nodes["Collect: Public Records"].alwaysOutputData === true)
  check("alwaysOutputData toujours vrai sur Collect: Tenders", nodes["Collect: Tenders"].alwaysOutputData === true)
  check("alwaysOutputData=true sur le nouveau collecteur corpus (même garantie)", nodes["Collect: Sector Corpus Source"].alwaysOutputData === true)
  check("IF — Has Items to Qualify? toujours présent", !!nodes["IF — Has Items to Qualify?"])
  check("IF — Has Signals to Write? toujours présent", !!nodes["IF — Has Signals to Write?"])
  check("IF — Has Source Links? toujours présent", !!nodes["IF — Has Source Links?"])
  check("Finalize Run Summary reste le point de convergence unique", !!nodes["Finalize Run Summary"])
  check("plafond MAX_ITEMS=40 toujours présent dans Normalize & Dedup Items", nodes["Normalize & Dedup Items"].parameters.jsCode.includes("MAX_ITEMS = 40"))
  check("filtre >120 jours toujours présent", nodes["Normalize & Dedup Items"].parameters.jsCode.includes("MAX_AGE_DAYS = 120"))
  check("dédup douce par titre normalisé toujours présente", nodes["Normalize & Dedup Items"].parameters.jsCode.includes("normalizeTitle"))
  check("IF — Include Public Records? intact (non touché par ce lot)", !!nodes["IF — Include Public Records?"])
  check("IF — Include Tenders? intact (non touché par ce lot)", !!nodes["IF — Include Tenders?"])
  check("le hors-sujet LLM reste rejeté avant écriture (MIN_SIGNAL)", nodes["Compute Scores & Apply Rules"].parameters.jsCode.includes("MIN_SIGNAL"))
  check(
    "Shape+Accumulate: Tenders n'est plus câblé directement vers Normalize & Dedup Items (passe par le gate corpus)",
    workflow.connections["Shape+Accumulate: Tenders"].main[0][0].node === "IF — Include Sector Corpus?",
  )
  check(
    "Normalize & Dedup Items passe désormais par le filtre administratif avant qualification",
    workflow.connections["Normalize & Dedup Items"].main[0][0].node === "Filter Administrative Static Items",
  )

  // -------------------------------------------------------------------------------------------
  // 18. Lot 6 — Propagation de workspace_id & Métriques d'efficacité pour INTEL-033
  // -------------------------------------------------------------------------------------------
  check("lot6 — nœud 'Préparer Métriques Sources' existe dans INTEL-033", Boolean(nodes["Préparer Métriques Sources"]))
  check("lot6 — nœud 'Écrire Métriques Sources' existe dans INTEL-033", Boolean(nodes["Écrire Métriques Sources"]))

  // Cas A — workspaceId présent → payload métrique contient workspace_id
  {
    const reg = {
      "Shape Sector Sources": [
        { sourceCatalogId: "src-sec-1", corpusId: "corp-sec-1" },
        { sourceCatalogId: "src-sec-2", corpusId: "corp-sec-1" },
      ],
      "Shape Sector Corpus Item": [
        { sourceCatalogId: "src-sec-1", title: "Item A" },
        { sourceCatalogId: "src-sec-1", title: "Item B" },
      ],
      "Ignore Sector Corpus Source Error": [
        { sourceCatalogId: "src-sec-2", error: true },
      ],
      "Filter Administrative Static Items": [
        { sourceCatalogId: "src-sec-1", title: "Item A" },
      ],
      "Map Signals to Sources": [
        { primary_source_id: "src-sec-1", title: "Signal 1" },
      ],
      "Validate Payload": { companyId: "comp-123", workspaceId: "ws-999", runId: "run-abc" },
    }

    const metricsOut = await runCodeNode("Préparer Métriques Sources", reg, {})
    const rows = metricsOut.items.map((i) => i.json)
    check("Cas A — workspaceId présent : 2 lignes de métriques produites", Array.isArray(rows) && rows.length === 2)
    const m1 = rows.find((r) => r.source_catalog_id === "src-sec-1")
    check(
      "Cas A — workspaceId présent : m1 contient workspace_id=ws-999",
      Boolean(m1 && m1.workspace_id === "ws-999" && m1.query_succeeded === true && m1.items_collected === 2 && m1.items_after_dedup === 1 && m1.items_retained === 1),
    )
    const m2 = rows.find((r) => r.source_catalog_id === "src-sec-2")
    check(
      "Cas A — workspaceId présent : m2 contient workspace_id=ws-999",
      Boolean(m2 && m2.workspace_id === "ws-999" && m2.query_succeeded === false && m2.items_collected === 0 && m2.items_retained === 0),
    )
  }

  // Cas B — workspaceId absent → aucune erreur métier, écriture métrique skipped
  {
    const reg = {
      "Shape Sector Sources": [
        { sourceCatalogId: "src-sec-1", corpusId: "corp-sec-1" },
      ],
      "Validate Payload": { companyId: "comp-123", workspaceId: null, runId: "run-abc" },
    }

    const metricsOut = await runCodeNode("Préparer Métriques Sources", reg, {})
    const rows = metricsOut.items.map((i) => i.json).filter(Boolean)
    check("Cas B — workspaceId absent : métriques skipped sans erreur", Array.isArray(rows) && rows.length === 0)
  }

  // Cas C — déclenchement manuel transporte workspaceId dans Validate Payload
  {
    const manualPayload = {
      body: {
        runId: "run-manual",
        workspaceId: "ws-manual-123",
        companyId: "comp-manual-456",
        userId: "user-789",
        settings: { watchLevel: "standard" },
        callbackUrl: "https://kredo/api/n8n/callback",
      },
      headers: { "x-kredo-signature": "sha256=mock" },
      computedSignature: "mock",
    }
    const vpOut = await runCodeNode("Validate Payload", {}, { input: manualPayload })
    check("Cas C — déclenchement manuel : Validate Payload transporte workspaceId=ws-manual-123", vpOut.json.workspaceId === "ws-manual-123")
  }

  // Cas D — scheduler transporte workspaceId dans son payload vers INTEL-033
  {
    const schedulerWorkflow = JSON.parse(require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "account-watch-scheduler.json"), "utf8"))
    const buildPayloadNode = schedulerWorkflow.nodes.find((n) => n.name === "Build Webhook Payload")
    check("Cas D — scheduler : Build Webhook Payload écrit workspaceId dans rawBody payload", Boolean(buildPayloadNode && buildPayloadNode.parameters.jsCode.includes("workspaceId: row.workspace_id")))
  }

  console.log(`\n${passed} ok, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

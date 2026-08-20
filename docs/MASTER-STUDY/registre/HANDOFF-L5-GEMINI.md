# Handoff L5 — `AccountSectorPerspective` (pour Gemini)

**Tâche** : construire le read model compte-centric `AccountSectorPerspective(companyId)` —
« qu'est-ce que ce segment signifie pour CE compte ? » (ADR §4.2) — en réutilisant tel quel tout
ce qui existe déjà (GATE A, `SectorKnowledgeReadModel` de L4, `value_chain_nodes`), sans rien
recalculer qui soit déjà résolu ailleurs.

**Ce lot livre** : une fonction de lecture pure côté serveur, testée, **sans aucun consommateur
UI**. C'est du data layer, comme L4 — pas de composant React, pas de page, pas de wiring dans
`ClientIntelligenceSectorTab.tsx`.

**Ce lot NE fait PAS** :
- **Le redesign de Cockpit > Secteur.** L'ADR (§11, ligne L5 : « `AccountSectorPerspective` → GATE
  B design → Cockpit > Secteur ») séquence explicitement un passage design entre le contrat de
  données et l'écran. `ClientIntelligenceSectorTab.tsx` / `client-intelligence-sector.ts` /
  `sector-snapshot-data.ts` restent **inchangés**, continuent de servir l'écran actuel tel quel.
  La QA visuelle et la maquette du nouvel écran sont un chantier séparé, fait par Guillaume ou
  cadré par lui — CLAUDE.md §8 (« La QA visuelle est faite par Guillaume ») s'applique dans toute
  sa force ici : ne pas anticiper de décision de layout, de palette ou de composant.
- Extension `intelligence_source_links` (hors V1, MS-15).
- Références croisées E4↔E5 structurées (MS-16, différé après validation du premier
  `AccountSectorPerspective` — c'est-à-dire après ce lot, pas pendant).
- Toute écriture en base autre que le correctif de provenance ponctuel du §3.

**Avant de commencer, lire dans l'ordre** :
1. Ce fichier, en entier.
2. `docs/adr/ADR-0021-master-study-ingestion-projections-distribution.md` §4.2 (le contrat, à
   traiter comme un **schéma illustratif**, pas un type littéral à copier — voir §2 ci-dessous
   pourquoi), §5.4 (cohérence de snapshot), §6 (verrous), §8.1 (frontières Secteur/Enjeux/Stratégie
   — ce lot ne construit pas l'écran mais le contrat doit rester compatible avec ce partage),
   MS-6, MS-11, MS-16, MS-17, MS-18, MS-19.
3. `docs/FEATURES/master-study/HANDOFF-L0-L1-ADR-0021.md` §4.8 — L4 livré, `SectorKnowledgeReadModel`
   existe et fonctionne, **c'est la seule source de connaissance segment à consommer ici**.
4. `src/features/master-study/data/get-sector-knowledge-read-model.ts` — lu en entier. Réutilisé
   tel quel (`getSectorKnowledgeReadModel(segmentId)`, la fonction détail, pas la fonction liste).
5. `src/features/competitive-map/data/get-competitive-map-citation.ts` — lu en entier. C'est
   **GATE A** au sens de l'ADR §4.2 (« Le travail de GATE A (`competitiveContext`) est conservé
   intégralement »). `getCompetitiveMapCitation(companyId)` est réutilisée **sans modification**,
   pas réécrite.
6. `src/lib/intelligence/client-intelligence-sector.ts` — pas réutilisé comme source de données
   (c'est le pipeline FOLIO-era de l'écran actuel, hors périmètre), mais ses fonctions pures de
   classification réglementaire/événementielle (`regulatoryState`, `sortSectorRegulatoryItems`,
   le tri par `timing` des événements) sont **le patron à suivre** pour §2.4 — ne pas réinventer
   une deuxième logique de « imminent/expired/undated ».
7. `src/features/sector-mapping/data/get-sector-map-catalog.ts` — patron de requête sur
   `value_chain_nodes` (liste de colonnes). **Ne pas réutiliser la fonction telle quelle** : elle
   charge tous les secteurs, ce lot n'en a besoin que d'un.

---

## 1. État vérifié en base avant ce lot — pour calibrer, pas à re-découvrir

Vérifié par requête directe le 2026-08-20, sur le compte et le segment pilotes.

**ROBERTET** (`67b346ff-68c8-4f36-a510-13024955856f`) :
```
companies.segment_id = 'db34f8a0-9d9e-4585-acd6-2fbbdd1baad6'  (le segment pilote)
companies.sector_id  = 'e3950aea-5e32-40df-8565-3366ec8a5cc6'  (projection macro, ne pas utiliser ici)
```

**`competitive_map_entries`** — 8 lignes, toutes segment `db34f8a0…`, toutes
`study_snapshot_date = '2026-08-14'`, **toutes `source_run_id IS NULL`** — c'est le point laissé
ouvert par L3 (§4.6 point 3 du handoff : « rattachement rétroactif... à trancher, pas fait par
défaut ») et par L4 (§14 point de l'ADR ne le mentionne pas explicitement mais le grep confirme
qu'aucun lot n'a encore touché cette colonne). ROBERTET a sa propre ligne
(`id: ae2c5df2-291e-415a-b0f6-344b20a03a37`, `category: 'leader'`), avec un `profile_json` de 6,3 Ko
réellement riche (`traduction_commerciale.angle`, `.accroches[]`, `.a_ne_pas_dire`,
`metier_chaine_valeur`, `maillon` en prose libre, `couche_esn`, `trigger_events[]`).

**`value_chain_nodes`** (colonne `sector_id`, **pas** `segment_id` — vérifié en base, piège de
nommage) — 6 lignes pour `db34f8a0…`, `maillon` 1 à 6, **`capture_valeur` NULL sur les 6** (amorce
E4 sans captation, E6 pas encore joué sur ce segment). `value_chain_actors` : **0 ligne** rattachée
à ces nœuds. C'est un état dégradé **valide** (MS-11 : « E4 présent · E5 présent · E6 absent »),
pas une erreur à corriger dans ce lot.

**`sector_intelligence.playbook`** du segment pilote — vérifié non vide : `market_thesis` (5
thèses, champs `id`/`these`/`src_ids`/`donc_commercialement`), `tech_fronts` (5 fronts, champs
`nom`/`etat`/`zone_de_transition`/`src_ids`/`donc_commercialement`), `dependances_critiques` (6,
champs `nom`/`criticite`/`risque`/`situation`/`practice_kredo`/`prestation_ouverte`/`src_ids`/
`donc_commercialement`). `resolution_locks = {"market_growth_pct":"not_published",
"market_size_eur_bn":"not_published"}` — `playbook` lui-même n'est **pas** verrouillé, `playbookLevel`
vaut `"segment"`.

**`intelligence_documents`** — une ligne `document_type='master_study'`,
`primary_entity_type='sector'`, `primary_entity_id = 'db34f8a0…'`, `id: c8e7aa8b-8ecd-4af4-9e9e-5b04884d1b35`.
Aucune colonne `source_run_id` sur cette table — le lien au run se fait par
`(primary_entity_type, primary_entity_id, document_type)`, pas par FK directe.

---

## 2. Le contrat — `AccountSectorPerspective`

**Emplacement** : `src/features/master-study/data/get-account-sector-perspective.ts`.
`import "server-only"`.

```ts
export async function getAccountSectorPerspective(
  companyId: string,
  options?: { supabase?: SupabaseClient<Database> },
): Promise<AccountSectorPerspective | null>
```

Retourne `null` si le compte n'existe pas ou si `companies.segment_id IS NULL` (compte non
classifié — même sémantique que l'état vide déjà géré par `SectorEmptyState` dans l'écran actuel,
que ce lot ne touche pas mais dont il ne doit pas contredire l'invariant).

### 2.1 Pourquoi le type de l'ADR §4.2 est un schéma, pas un contrat littéral

```ts
type AccountSectorPerspective = {
  segment: { id, name, snapshotDate }
  essentialContext: { definition, keyTheses }
  whyNow: { relevantDynamics, relevantRegulatoryItems, relevantTechFronts }
  competitivePosition: AccountCompetitiveContext | null
  valueChainPosition: { node, dependencies }
  accountInterpretation: { positioning, angleEntree, commercialTranslation }
  provenance: { runId, snapshotDate, documentId }
}
```

Deux écarts **volontaires**, tranchés ici, à appliquer tels quels :

**(a) Provenance manquante sur les champs résolus.** MS-18 : « L'affichage d'une valeur héritée du
macro porte toujours sa provenance. Un chiffre sans badge est un chiffre présenté comme spécifique
au segment. » Le schéma ci-dessus ne porte aucun champ `*Level` — c'est une omission du schéma
illustratif, pas une exemption. **Chaque champ dérivé de `SectorKnowledgeReadModel` doit porter son
niveau** (`SectorResolvedLevel`, déjà exporté par `get-sector-knowledge-read-model.ts`), exactement
comme cette fonction l'a déjà fait pour BI en L4. Concrètement : `essentialContext.definitionLevel`,
`essentialContext.keyThesesLevel` (= `playbookLevel`, la substitution du playbook est un bloc
entier, pas par thèse individuelle — cf. ADR §6.2/§9.1).

**(b) `valueChainPosition.node` (singulier) n'a pas de source structurée.** Il n'existe **aucune**
colonne qui associe un compte à un nœud précis de `value_chain_nodes` — `profile_json.maillon`
(vu au §1) est de la **prose libre** (« Presence sur les six maillons... avec un centre de gravite
sur les maillons 1, 3 et 4 »), pas un tableau d'entiers. **Ne pas parser cette prose par regex pour
en extraire des numéros** — c'est exactement le genre d'inférence fragile que MS-8 interdit
(« Aucun LLM n'est requis à la lecture. Les projections sélectionnent, ordonnent et présentent —
elles n'interprètent pas. ») : une chaîne qui ressemble à une liste d'entiers n'est pas un contrat
de données. **Décision** : `valueChainPosition` expose la liste **complète** des nœuds du segment
(`segmentNodes: AccountSectorValueChainNode[]`, triés par `maillon` puis `rang`), pas un nœud
singulier. Le futur écran affichera le narratif `accountInterpretation.maillonNarrative` (prose du
compte) à côté de la liste structurée du segment — c'est un choix d'affichage pour GATE B design,
pas pour ce lot.

### 2.2 Type complet à produire

```ts
export type SectorResolvedLevel = "segment" | "macro" | "locked"  // réexporté depuis get-sector-knowledge-read-model.ts, ne pas redéfinir

export type SectorMarketThesis = {
  id: number
  these: string
  doncCommercialement: string
  srcIds: number[]
}

export type SectorTechFront = {
  nom: string
  etat: string
  zoneDeTransition: boolean
  doncCommercialement: string
  srcIds: number[]
}

export type SectorCriticalDependency = {
  nom: string
  criticite: string
  risque: string
  situation: string
  practiceKredo: string | null
  prestationOuverte: string | null
  doncCommercialement: string
  srcIds: number[]
}

export type AccountSectorValueChainNode = {
  id: string
  couche: string
  maillon: number | null
  rang: number
  label: string
  description: string | null
  captureValeur: number | null
  captureJustification: string | null
  confiance: string
}

// Alias direct sur le type déjà exporté par get-competitive-map-citation.ts — ne pas dupliquer sa définition.
export type AccountCompetitiveContext = CompetitiveMapEntrySnapshot

export type AccountSectorInterpretation = {
  positioning: string | null           // entry.positioning
  angleEntree: string | null           // entry.angleEntree
  metierChaineValeur: string | null    // entry.profileJson.metier_chaine_valeur
  maillonNarrative: string | null      // entry.profileJson.maillon (prose, jamais parsée)
  commercialAngle: string | null       // entry.profileJson.traduction_commerciale.angle
  commercialHooks: string[]            // entry.profileJson.traduction_commerciale.accroches
  doNotSay: string | null              // entry.profileJson.traduction_commerciale.a_ne_pas_dire
}

export type AccountSectorPerspective = {
  segment: {
    id: string
    name: string
    macroId: string | null
    macroName: string | null
    snapshotDate: string | null
    status: string  // effectiveStatus du read model
  }
  essentialContext: {
    definition: string | null
    definitionLevel: SectorResolvedLevel
    keyTheses: SectorMarketThesis[]
    keyThesesLevel: SectorResolvedLevel
  }
  whyNow: {
    relevantDynamics: SectorKnowledgeEventItem[]        // type déjà exporté par get-sector-knowledge-read-model.ts
    relevantRegulatoryItems: SectorKnowledgeRegulatoryItem[]
    relevantTechFronts: SectorTechFront[]
    relevantTechFrontsLevel: SectorResolvedLevel        // = playbookLevel
  }
  competitivePosition: AccountCompetitiveContext | null
  valueChainPosition: {
    segmentNodes: AccountSectorValueChainNode[]
    dependencies: SectorCriticalDependency[]
    dependenciesLevel: SectorResolvedLevel              // = playbookLevel
  }
  accountInterpretation: AccountSectorInterpretation
  provenance: {
    runId: string | null
    snapshotDate: string | null
    documentId: string | null
  }
}
```

### 2.3 Construction, étape par étape

1. `companies.select("id,segment_id").eq("id", companyId).maybeSingle()`. `segment_id` null ou
   compte introuvable → `return null`.
2. `getSectorKnowledgeReadModel(segmentId)` (la fonction **détail**, pas la fonction liste — un
   seul segment ici). Si elle renvoie `null` (segment inexistant — ne devrait pas arriver si la FK
   est saine, mais rester défensif), `return null`.
3. `getCompetitiveMapCitation(companyId)` — appel direct, sans modification. Résultat →
   `competitivePosition` (nullable si `entry` est `null`, ce qui est le cas pour la grande majorité
   des 96 comptes : seuls les 8 comptes du segment pilote ont une ligne `competitive_map_entries`
   aujourd'hui).
4. `value_chain_nodes.select("id,couche,maillon,rang,label,description,capture_valeur,capture_justification,confiance").eq("sector_id", segmentId).order("maillon").order("rang")`
   — requête directe et scopée, pas via `getSectorMapCatalog()` (qui charge tous les secteurs).
5. `intelligence_documents.select("id").eq("document_type","master_study").eq("primary_entity_type","sector").eq("primary_entity_id", segmentId).order("created_at",{ascending:false}).limit(1).maybeSingle()`
   pour `provenance.documentId`. Ne pas construire le résolveur généralisé
   `getAcceptedMasterStudyRun()` évoqué par l'ADR §5.4 — il n'existe pas encore dans le repo (vérifié,
   `grep` ne renvoie rien) et ce lot n'a besoin que d'un lookup ponctuel, pas de la généralisation
   `hasE4/hasE5/hasE6/verdict`. Ne pas l'écrire ici, ce serait hors périmètre.
6. Assembler `essentialContext`/`whyNow`/`valueChainPosition.dependencies` depuis les champs déjà
   résolus par `SectorKnowledgeReadModel` (`.description`/`.descriptionLevel`,
   `.playbook.market_thesis`/`.playbookLevel`, `.playbook.tech_fronts`/`.playbookLevel`,
   `.playbook.dependances_critiques`/`.playbookLevel`, `.regulatory`, `.events`). **Aucune requête
   directe sur `sector_intelligence`/`sector_events`/`sector_regulatory_items` dans ce fichier** —
   même règle que L4 (§6 du prompt L4), vérifiée par le même test de garde.
7. `whyNow.relevantRegulatoryItems` : filtrer `regulatory` pour exclure l'état `expired` — réutiliser
   le calcul d'état déjà écrit dans `client-intelligence-sector.ts` (`regulatoryState`), adapté aux
   noms de champs du read model (`deadlineDate`), pas réinventé. `relevantDynamics` : tous les
   `events` du read model, triés upcoming-puis-recent-puis-undated — même logique de tri que
   `client-intelligence-sector.ts`, adaptée aux noms de champs (`eventDate`).
8. `playbook.market_thesis`/`tech_fronts`/`dependances_critiques` sont des blobs JSON non typés côté
   read model (`Record<string, unknown> | null`) — parser défensivement (vérifier que c'est un
   tableau, que chaque élément a les clés attendues, `snake_case → camelCase`), ne pas caster en
   aveugle. En cas de forme inattendue sur un élément, l'ignorer plutôt que jeter — cohérent avec
   la doctrine « ne jamais planter l'écran sur un JSON imparfait » déjà appliquée dans
   `client-intelligence-sector.ts` (`asRecord`, `asArray`, `cleanText`).

---

## 3. Correctif de provenance — `competitive_map_entries.source_run_id`

**Décision prise avant ce prompt, pas laissée à l'appréciation de l'exécutant** : les 8 lignes
`competitive_map_entries` du segment pilote (§1) portent `study_snapshot_date = '2026-08-14'`,
**identique** au `study_snapshot_date` du segment `sector_intelligence` ingéré en L3
(`source_run_id = '522cfe06-f241-4620-a820-a0806a902571'`). C'est le **seul** run Master Study
jamais exécuté sur ce segment — aucune ambiguïté sur quel run rattacher. Sans ce correctif,
`competitivePosition` afficherait une donnée réelle et exacte, mais structurellement invérifiable
(`source_run_id NULL`), ce qui contredirait MS-10 dès le premier écran qui consommera ce contrat.

**Exécuter, en une seule instruction, pas une migration de schéma (MS-13 : les migrations servent
au schéma, pas au contenu)** :

```sql
UPDATE competitive_map_entries
SET source_run_id = '522cfe06-f241-4620-a820-a0806a902571'
WHERE segment_id = 'db34f8a0-9d9e-4585-acd6-2fbbdd1baad6'
  AND source_run_id IS NULL;
```

Vérifier avant/après (`SELECT count(*) ... WHERE segment_id = '...' AND source_run_id IS NULL` doit
passer de 8 à 0, et de 0 à 8 si vous testez le rollback). Ne toucher **aucune** autre ligne — la
clause `WHERE segment_id = ...` protège les 15 entrées d'autres segments (aérospatial, tourisme,
déjà vues au §1 de la requête `competitive_map_entries` globale) qui n'ont **aucun** run Master
Study associé et doivent rester `NULL`.

---

## 4. Tests obligatoires

`src/features/master-study/data/get-account-sector-perspective.test.ts`, patron
`get-sector-knowledge-read-model.test.ts` (mock Supabase) :

1. **Garde anti-lecture-directe** (même patron que L4, §6 du prompt L4) : le fichier source ne
   contient jamais `.from("sector_intelligence")`, `.from("sector_pain_points")`,
   `.from("sector_events")`, `.from("sector_news")`, `.from("sector_regulatory_items")`.
2. `companies.segment_id IS NULL` → `null`.
3. Compte introuvable → `null`.
4. Compte avec segment mais **sans** ligne `competitive_map_entries` (le cas de 88 des 96 comptes
   aujourd'hui) → `competitivePosition: null`, le reste de la perspective (segment, essentialContext,
   whyNow, valueChainPosition) reste peuplé normalement.
5. **Test contre le fixture réel du run pilote** (patron `map-e4-to-canon.test.ts`, qui lit déjà
   `04-secteur.json` depuis le disque) : avec des données mockées reprenant fidèlement la forme
   vérifiée au §1 (5 thèses, 5 fronts, 6 dépendances, 6 nœuds `capture_valeur: null`, l'entry
   ROBERTET avec son `profile_json`), vérifier que `keyTheses.length === 5`,
   `valueChainPosition.segmentNodes.length === 6`, tous les `captureValeur` à `null`,
   `valueChainPosition.dependencies.length === 6`, `accountInterpretation.commercialHooks.length === 2`
   (les deux `accroches` vues au §1).
6. **Provenance** : un champ dont `SectorKnowledgeReadModel` renvoie `descriptionLevel: "macro"`
   doit ressortir avec `essentialContext.definitionLevel: "macro"` — non-régression directe du bug
   que L0 a corrigé pour BI/Cockpit, à ne pas réintroduire pour ce nouveau consommateur.
7. `whyNow.relevantRegulatoryItems` exclut un item dont l'état calculé est `expired` (deadline dans
   le passé) ; `relevantDynamics` place un événement `upcoming` avant un événement `recent`.

---

## 5. Vérification après implémentation

### 5.1 Boucle de validation standard

```bash
npm run typecheck
npm test
npm run check:server-boundary
npx eslint src/features/master-study/data/get-account-sector-perspective.ts
rm -rf .next && npm run build
```

### 5.2 Recette base — avant/après, avec les vrais chiffres de §1

- `getAccountSectorPerspective('67b346ff-68c8-4f36-a510-13024955856f')` (ROBERTET, en dehors des
  tests, via un script ponctuel ou une requête manuelle — **pas** un `console.log` laissé dans le
  code livré) renvoie : `segment.id === 'db34f8a0…'`, `essentialContext.keyTheses.length === 5`,
  `whyNow.relevantTechFronts.length === 5`, `valueChainPosition.segmentNodes.length === 6`,
  `valueChainPosition.dependencies.length === 6`, `competitivePosition !== null` avec
  `category === 'leader'`, `provenance.runId === '522cfe06-f241-4620-a820-a0806a902571'`,
  `provenance.documentId === 'c8e7aa8b-8ecd-4af4-9e9e-5b04884d1b35'`.
- Un compte **hors** segment pilote (n'importe lequel des 88 autres) renvoie
  `competitivePosition: null` mais un `essentialContext`/`whyNow` peuplé si son segment ou son
  macro porte de la connaissance — sinon des champs vides, sans planter.
- Après le correctif §3 : `SELECT count(*) FROM competitive_map_entries WHERE segment_id =
  'db34f8a0…' AND source_run_id IS NULL` → **0**. Les 15 lignes des deux autres segments (§1)
  restent à `source_run_id IS NULL`.

### 5.3 Ce que ce lot ne prouve pas, et ce n'est pas un défaut

Aucune capture d'écran, aucune ouverture de `/prospection/accounts/[companyId]` : rien ne consomme
`AccountSectorPerspective` à l'issue de ce lot. La preuve de ce lot est la fonction, ses tests, et
les valeurs obtenues au §5.2 — pas un écran.

---

## 6. Rendu attendu

- `src/features/master-study/data/get-account-sector-perspective.ts` — le read model complet,
  types exportés inclus.
- `src/features/master-study/data/get-account-sector-perspective.test.ts` — les 7 tests du §4.
- Le correctif SQL du §3, exécuté et vérifié (compte avant/après rapporté, pas seulement « fait »).
- Boucle de validation §5.1 entièrement verte, rapportée avec ses résultats réels.
- Recette §5.2 rapportée avec les valeurs obtenues (pas juste « ça marche »).
- Aucun fichier de `src/components/accounts-contacts/intelligence/` ni
  `src/lib/intelligence/client-intelligence-sector.ts` modifié — si le diff en touche un, c'est
  hors périmètre, à retirer avant de livrer.

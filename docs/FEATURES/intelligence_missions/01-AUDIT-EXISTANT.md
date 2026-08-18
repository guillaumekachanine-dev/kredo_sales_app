# 01 — Audit de l'existant réutilisable

> **Statut** : factuel — chiffres mesurés le 2026-08-18 contre le code du repo et la base live
> `jvzgmhvwirsbdkjpmvla`.
> **Corrigé le 2026-08-18 (revue contradictoire, ADR-0020 §5.6)** : la première version
> annonçait « aucun chiffre repris d'un document antérieur » alors que deux lignes du §9
> étaient créditées à `CLAUDE.md`. Ces deux lignes ont été **remesurées live** et corrigées
> (`companies` 96 → **112**, `account_signals` 745 → **839**). Les comptages de runs ont
> également été rafraîchis.
> **Méthode** : parsing des 19 JSON de `n8n/workflows/`, lecture de `src/lib/n8n/`,
> `src/features/content-collections/`, `information_schema` et `pg_proc`.

Ce document ne juge pas la vision. Il établit ce qui existe, mesuré, pour que le cadrage
qui suit (`02`) et l'architecture (`03`) s'appuient sur des faits et non sur une intuition
de duplication.

---

## 1. Le squelette d'exécution est déjà mutualisé de fait

Les 19 workflows du repo ont été décomposés en 12 étapes canoniques. Résultat :

| Étape canonique | Présence |
|---|---|
| Webhook | 16/19 |
| Verify Signature (HMAC) | 15/19 |
| Validate Input | 15/19 |
| Mark Run Running | 12/19 |
| Hydrate Context | 13/19 |
| Assemble Prompt | 16/19 |
| Call LLM | 15/19 |
| Validate Output | 16/19 |
| Prepare Callback | 15/19 |
| Sign Callback | 15/19 |
| Callback | 12/19 |
| Branche d'échec | 16/19 |

**12 workflows sur 19 portent le squelette canonique complet.** Les 7 restants sont des
crons nus (`intel-040-...-cron`, `report-weekly-manager-cron`, 4 nœuds chacun), un
scheduler (`account-watch-scheduler`), un doublon de fichier
(`intel-034-...verification 2.json`) et `veille-hebdomadaire-kredo` qui suit un autre
patron.

Les workflows « minces » (`intel-031`, `intel-032`, `report-*`) font **14 à 17 nœuds**,
dont **11 à 12 sont du squelette**. Le métier tient dans 3 à 4 nœuds.

### Anatomie de référence — `intel-031-issues-map` (15 nœuds)

```
Webhook → Verify Signature → Validate Entity → Update Run Status
   → Hydrate Context (HTTP → rpc/get_account_issues_context)
   → Assemble Prompt (code)
   → Call LLM (HTTP → api.anthropic.com/v1/messages)
   → Parse & Validate Output (code) → Quality Check (code)
   → Prepare Callback → Sign Callback → Callback
   └── Prepare Failure Callback → Sign → Callback (Failure)
```

`intel-020`, `intel-021`, `intel-032`, `intel-040`, `report-account-summary`,
`report-activity-*`, `report-manager-summary` sont **le même graphe**, aux 3-4 nœuds
métier près.

---

## 2. Contre-mesure décisive : le squelette n'est pas ce qui coûte

Compter les nœuds surestime massivement le gain de la mutualisation. En mesurant le
**volume de code** réellement écrit dans les nœuds `Code`, en séparant le métier
(`Validate Input`, `Hydrate Context`, `Assemble Prompt`, `Parse & Validate Output`,
`Quality Check`) de la plomberie (`Prepare/Sign Callback`, statut de run, branche d'échec) :

| Workflow | Code total | dont métier | Part métier |
|---|---:|---:|---:|
| `intel-021-monthly-watch-analysis` | 7 029 c. | 4 748 c. | **68 %** |
| `report-account-summary` | 9 119 c. | 6 444 c. | **71 %** |
| `intel-031-issues-map` | 10 649 c. | 7 684 c. | **72 %** |
| `intel-032-strategy` | 12 028 c. | 8 936 c. | **74 %** |
| `intel-040-workspace-diagnostic` | 28 412 c. | 25 245 c. | **89 %** |

> 🔴 **La duplication est de ~80 % en nombre de nœuds mais de ~28 % en volume de code.**
> Mutualiser le squelette n8n économise la partie la moins chère et la plus stable
> (HMAC, callback, statut de run — écrite une fois, jamais retouchée depuis).
> Ce qui coûte à chaque nouveau cas d'usage, ce sont l'hydratation, l'assemblage du
> prompt et la validation du contrat de sortie.

Cette mesure ne réfute pas la vision : elle en **déplace le bénéfice**. Voir `02` §2.

---

## 3. Le métier variable est déjà de la donnée déguisée en code

Trois des quatre nœuds métier sont structurellement des données inscrites en dur dans du JS.

### 3.1 `Assemble Prompt` — une chaîne + une sérialisation

Le nœud d'`intel-031` (3 571 caractères) se réduit à :

```js
const SYSTEM_PROMPT = `…règles, format de sortie JSON attendu…`;
const userPrompt = `CONTEXTE (source unique de vérité — JSON) :\n${JSON.stringify(context, null, 2)}`;
return [{ json: { ...upstream, context, systemPrompt: SYSTEM_PROMPT, userPrompt } }];
```

Aucune logique. Un gabarit et une concaténation. **Ce nœud est une ligne de table.**

### 3.2 `Parse & Validate Output` — un JSON Schema écrit à la main

Le nœud vérifie `schema_version`, la présence de tableaux, l'appartenance à des
énumérations (`CATEGORIES`, `EVIDENCE_LEVELS`, `ALLOWED_PROVENANCE`), des bornes 1-5,
et l'appartenance des `contact_ids` au contexte hydraté. Hormis la dernière règle
(référentielle, réellement spécifique), **tout est exprimable en JSON Schema**.

### 3.3 `Quality Check` — des règles déclaratives

`has_issues`, `not_all_weak_evidence`, `no_exact_title_duplicates`, `category_diversity` :
quatre prédicats produisant des `qaFlags`. Générique à 80 %, paramétrable par mission.

### 3.4 `Hydrate Context` — un appel RPC nommé

Un simple `POST /rest/v1/rpc/get_account_issues_context`. **Le nom de la RPC et ses
arguments sont la seule variable.**

> **Conséquence** : le contenu métier d'un workflow Kredo est, à 90 %, un quadruplet
> `(rpc, prompt, schéma de sortie, règles QA)`. C'est le socle du modèle déclaratif
> proposé en `03`.

---

## 4. Le registre d'exécution accueille déjà des missions

`ai_intelligence_runs` — 422 lignes, `ai_intelligence_results` — 354 lignes.

`run_type` est une **colonne `text` libre, sans FK ni CHECK**, et porte déjà
**20 valeurs distinctes** :

| `run_type` | runs | comptes distincts |
|---|---:|---:|
| `intel-010-refresh` | 176 | 62 |
| `intel-020-communication` | 92 | 28 |
| `account_watch_refresh` | 29 | 12 |
| `intel-030-account-knowledge` | 26 | 14 |
| `report-account-summary` | 19 | 10 |
| `report-weekly-manager` | 15 | 0 |
| `intel-031-issues-map` | 10 | 8 |
| `process_diagnostic` | 10 | 10 |
| … (12 autres) | | |

Colonnes déjà génériques et exploitables telles quelles :
`primary_entity_type` / `primary_entity_id` (nullable), `input_snapshot jsonb`,
`config jsonb`, `company_id` **nullable**, `total_tokens_*`, `total_cost_estimate`,
`trigger_source`.

> ✅ **D4 de la vision est validé sans aucune migration.** Un run de mission est un run
> `ai_intelligence_runs` de plus, avec un `run_type` nouveau. Rien à créer.

### 4.1 Contrainte structurante à connaître

```sql
ai_intelligence_results_unique_run_phase  UNIQUE (run_id, phase)
ai_intelligence_results_phase_check       CHECK (phase >= 1 AND phase <= 10)
```

Un run peut donc porter **jusqu'à 10 résultats**, un par `phase`. C'est nativement
un support de mission multi-étapes (une étape = une phase = une ligne de résultat).

⚠️ Mais `phase` porte aujourd'hui une **sémantique ADR-0007** (`1=analyse client`,
`2=sectorielle`, `3=diagnostic process`, `4=roadmap`, `5=pitch`) que plusieurs vues et
composants interprètent. Réutiliser `phase` comme index d'étape de mission est possible
mais **doit être décidé et documenté explicitement** — sinon les runs de mission
s'afficheront comme des analyses de compte mal typées. Voir `02` §3.4.

---

## 5. Un résolveur de corpus existe déjà, en miniature

`src/features/content-collections/data/resolve-knowledge-scope.ts` fait déjà exactement
ce que la vision décrit au §5.2 :

- part d'un **seul `collectionId`**, jamais des `refs` envoyées par le navigateur
  (durcissement explicite contre la falsification côté client) ;
- relit `content_collections` / `content_collection_items` sous RLS ;
- développe les Listes référencées par un Corpus **sur un seul niveau** ;
- **déduplique** par `${contentType}:${contentId}` ;
- retourne des **références normalisées**, jamais du contenu copié (respect de P2).

Il est appelé depuis `src/app/api/n8n/trigger/route.ts`, qui **écrase toute valeur
`refs` fournie par le client** avant transmission à n8n.

> ✅ **Le patron du résolveur est déjà écrit, testé en production sur `intel-020`, et
> correctement durci.** Le chantier consiste à l'étendre, pas à l'inventer.

### 5.1 Mais son périmètre est minuscule

`CONTENT_TYPE_REGISTRY` ne connaît que **deux types de contenu** :

```ts
export type AddableContentType = "veille_article" | "intelligence_document"
```

Et le registre n'expose que `resolveMany() → { title, date, preview }` — c'est-à-dire
**des métadonnées d'affichage, pas du contenu exploitable par un LLM**. Il n'existe
aujourd'hui **aucune fonction d'hydratation de contenu** dans cette couche : l'hydratation
réelle se fait dans n8n, par appel RPC.

---

## 6. Seize RPC d'hydratation — et elles ne sont pas des résolveurs de corpus

`pg_proc` sur le schéma `public` :

| RPC | Signature |
|---|---|
| `get_account_knowledge_context` | `(workspace, company)` |
| `get_account_issues_context` | `(workspace, company)` |
| `get_commercial_strategy_context` | `(workspace, company)` |
| `get_account_score_context` | `(workspace, company)` |
| `get_account_summary_facts` | `(workspace, company, as_of_date)` |
| `get_sector_intelligence_context` | `(workspace, sector)` |
| `get_communication_context` | `(workspace, company, contact, opportunity, mission)` |
| `get_collaborator_communication_context` | `(workspace, collaborator, mission)` |
| `get_pitch_context` | `(workspace, company, offer, opportunity, mission)` |
| `get_matching_context` | `(workspace, opportunity)` |
| `get_activity_commercial_facts` | `(workspace, period_start, period_end, as_of_date)` |
| `get_activity_recruitment_facts` | `(workspace, period_start, period_end, as_of_date)` |
| `get_weekly_business_facts` | `(workspace, period_start, period_end, owner, as_of_date)` |
| `get_manager_summary_facts` | `(workspace, owner, start_date, end_date)` |
| `get_financial_report_facts` | `(workspace, fiscal_year, as_of_date)` |
| `get_workspace_diagnostic_context` | `(workspace, as_of_date)` |

> 🔴 **Découpage critique à comprendre : ces RPC sont découpées par *cas d'usage*, pas par
> *type de corpus*.** `get_pitch_context(workspace, company, offer, opportunity, mission)`
> n'est pas « le corpus compte » : c'est un assembleur sur mesure pour la mission « pitch ».
> Elles ne sont donc **pas composables entre elles** — deux d'entre elles appelées ensemble
> renvoient des blocs qui se recouvrent partiellement, sans clé commune ni déduplication.

C'est l'écart le plus important entre la vision et le code. Traité en `02` §3.2 et
ADR-0020 §5.1.

### 6.1 Elles ne sont pas homogènes en droits d'exécution

Contrôle `pg_proc` + `has_function_privilege` du 2026-08-18 :

- **4 des 16 ne sont pas exécutables par `authenticated`** :
  `get_workspace_diagnostic_context`, `get_account_knowledge_context`,
  `get_collaborator_communication_context`, `get_sector_intelligence_context`.
- **2 sont `SECURITY DEFINER`** : `get_workspace_diagnostic_context`,
  `get_manager_summary_facts`.

> 🔴 **Conséquence directe** : toute conception supposant « les RPC d'hydratation sont
> appelables avec le client Supabase de l'utilisateur, RLS active » est **fausse pour 4
> d'entre elles**. Un provider de corpus qui en dépend doit déclarer son mode d'exécution
> et, s'il passe en service-role, revérifier explicitement le workspace (ADR-0020 M-5).
>
> ⚠️ Relevé au passage, **hors périmètre de ce chantier** : `get_manager_summary_facts`
> est `SECURITY DEFINER`, **sans `search_path` fixé**, et `EXECUTE` est accordé à `anon`.
> Voir ADR-0020, action item 9.

---

## 7. La couche livrable est mûre — et son extension a un coût connu

`intelligence_documents` : **137 lignes**, avec versioning
(`intelligence_document_versions`) et liens polymorphes (`intelligence_document_links`).

Le callback (`src/app/api/n8n/callback/route.ts`) matérialise déjà automatiquement :

```ts
if (status === "succeeded" && isEligibleDocumentResultType(resultType)) {
  await saveResultAsDocumentWithSupabaseClient(supabase, resultId)
}
```

⚠️ Rappel de `CLAUDE.md`, vérifié : **ajouter une valeur à l'enum
`intelligence_document_type` casse le `typecheck`** sur quatre `Record` exhaustifs
(`document-display.tsx` ×2 + `ReportDocumentType` + `REPORT_DOCUMENT_TYPES`,
`DocumentCard.tsx`, `DocumentMobileDetail.tsx`, `communication-result-documents.ts`).

> **Conséquence de conception** : il faut **un seul type documentaire générique pour
> toutes les missions**, ajouté une fois. Un type par mission reproduirait exactement la
> dette que le chantier prétend supprimer.

---

## 8. Le callback est devenu un aiguillage codé en dur

Le callback enchaîne aujourd'hui des `if` sur `resultType` :

1. `ACCOUNT_KNOWLEDGE_RESULT_TYPE` → `ingestAccountKnowledgeArtifact` (validation + rejet)
2. `ACCOUNT_ISSUES_MAP_RESULT_TYPE` → `materializeAccountIssues` (**écrit N lignes `account_issues`**)
3. `isEligibleDocumentResultType(resultType)` → création de document
4. `resultType === "account_watch_refresh"` → `revalidatePath("/veille")`

C'est un **point d'extension naturel** (une table d'aiguillage remplacerait la chaîne de
`if`), mais aussi **le principal risque de sécurité du chantier** : `resultType` arrive
dans le payload n8n et pilote des écritures métier en service-role. Voir `02` §4.1.

---

## 9. Le substrat de corpus est presque vide

Comptages live au 2026-08-18 :

| Table | Lignes |
|---|---:|
| `source_catalog` | 41 |
| `source_corpora` | **2** |
| `source_corpus_items` | 42 |
| `content_collections` | **5** |
| `content_collection_items` | **5** |
| `veille_articles` | 31 |
| `veille_digests` | 7 |
| `intelligence_documents` | 137 |
| `ai_intelligence_results` | 354 |
| `companies` | **112** |
| `account_signals` | **839** |

> 🔴 **Les trois origines de corpus que la vision propose comme périmètre de validation
> (§11 : veille, `source_corpus`, `content_collection`) sont les trois ensembles les moins
> peuplés de la base.** `content_collection_items` compte 5 lignes au total.
> Un moteur de missions branché dessus produirait des livrables sur un corpus vide.
> Arbitrage proposé en `02` §3.1.

---

## 10. Le point d'entrée transverse existe déjà, à moitié

`src/lib/intelligence/intelligence-registry.ts` mappe déjà des patterns de route vers des
actions IA contextuelles, avec un statut `"active" | "coming_soon"` et un
`requiresEntity`. Plusieurs actions (`search_news`, `deep_analysis`…) sont déjà déclarées
`coming_soon`.

> ✅ **Le §8.1 de la vision (« Analyser accessible partout ») n'a pas besoin d'un nouveau
> shell.** Il a besoin que ce registre existant sache déclarer une mission.
> `ADR-0018` (refonte du shell) reste un chantier distinct et ne bloque pas celui-ci.

---

## 11. Le vrai goulot d'étranglement n'est pas dans le code

Rappels vérifiés dans `CLAUDE.md` et confirmés par la structure du repo :

- **L'import et l'activation des workflows sur le VPS sont manuels**, faits par Guillaume.
  Le MCP n8n est bloqué en session agent.
- **11 workflows patchés en Session 28 ne sont toujours pas réimportés**, plus
  `intel-010-refresh` (Session 34). Ils ne tournent donc pas dans leur version du repo.
- **`npm run n8n:status` ne détecte pas cette dérive** : il compare des compteurs de
  nœuds, or seul du code interne de nœud a changé.

> 🔴 **Aujourd'hui, toute nouvelle capacité IA coûte : écrire du JSON n8n → import manuel
> VPS → activation → aucune détection de dérive.** C'est ce coût-là, et non le nombre de
> nœuds dupliqués, qui limite l'extension de Kredo. Toute architecture cible doit être
> jugée d'abord sur sa capacité à supprimer ce coût.

---

## 12. Synthèse — ce qui est acquis, ce qui manque

| Brique de la vision | État réel | Reste à faire |
|---|---|---|
| Registre d'exécution générique (D4) | ✅ **Acquis** — `run_type` libre, 20 valeurs, entités nullable | Rien |
| Traçabilité coût/tokens/durée | ✅ Acquis | Rien |
| Multi-étapes par run | ✅ Acquis (`phase` 1→10) | Trancher la sémantique de `phase` |
| Couche livrable versionnée (D5) | ✅ Acquise (137 docs) | **1** type documentaire générique |
| Squelette n8n mutualisable | ✅ 12/19 identiques | 1 workflow interpréteur, importé **une fois** |
| Résolveur de corpus (D3) | 🟡 Patron écrit et durci, **2 types**, métadonnées seulement | Étendre + **hydrater du contenu** + budget |
| Corpus composables | 🔴 16 RPC découpées par cas d'usage, non composables | Couche d'adaptation (pas réécriture) |
| Prompt / schéma de sortie déclaratifs | 🔴 En dur dans le JSON n8n | Sortir le métier du JSON |
| Point d'entrée transverse (D8) | 🟡 Registre existant avec slots `coming_soon` | Brancher les missions |
| Aiguillage post-traitement | 🟡 Chaîne de `if` dans le callback | Table d'aiguillage + **liaison serveur du `resultType`** |
| Volume de corpus | 🔴 5 items de collection, 2 corpus de sources | Choisir des corpus réellement peuplés |

**Lecture d'ensemble : les fondations d'exécution et de capitalisation sont acquises
(≈ 60 % du socle). Ce qui manque est concentré sur trois points — la résolution de corpus
composable, la sortie du métier hors du JSON n8n, et la matière elle-même.**

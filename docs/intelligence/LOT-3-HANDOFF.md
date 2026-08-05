# LOT 3 — Document de reprise (HANDOFF)

> **STATUT : LOT 3 TERMINÉ — EN ATTENTE DE VALIDATION HUMAINE**
> Dernière mise à jour : 2026-08-05 CEST
> Commit de départ (worktree local) : `4cfc16da` (Lot 2 committé en `7ad126f8`).
> Aucun commit, push, déploiement, import ou activation n8n n'a été effectué.

## Périmètre effectivement livré

Extension du workflow **`n8n/workflows/intel-030-account-knowledge.json`** avec une
branche V3 complète : recherche externe réelle, conservation exhaustive des
sources consultées, génération d'un brouillon de claims, **vérification
indépendante** de chaque affirmation, assemblage déterministe et validation
finale contre le contrat gelé au Lot 2. Le chemin V2 existant est intégralement
préservé ; la branche V3 ne s'emprunte que sur un discriminateur explicite.

Le Lot 3 **ne couvre pas** l'ingestion applicative, le callback V3, les loaders
ou l'UI (Lots 4-5). Le rejet V3 d'`account-knowledge-ingest.ts` reste actif.

## Fichiers modifiés / créés

- `n8n/workflows/intel-030-account-knowledge.json` — **modifié** : +26 nœuds
  (1 routeur + 25 nœuds V3), 30 → 56 nœuds. Seuls **deux** nœuds V2 sont touchés,
  de façon additive : `Validate Entity` (nouveau champ `accountKnowledgeSchemaVersion`)
  et la connexion sortante de `Hydrate Context` (re-routée via le routeur).
- `n8n/workflows/__tests__/intel-030-account-knowledge-v3.test.js` — **créé** :
  harnais Node (41 assertions) exécutant réellement les nœuds Code V3 dans un `vm`.
- `src/lib/intelligence/account-knowledge-v3-workflow.test.ts` — **créé** :
  test Vitest (14 cas) — structure du workflow + validation d'artefacts contre
  `validateAccountKnowledgeV3` + cross-check assemblage ↔ contrat gelé.
- `n8n/workflows/intel-030-account-knowledge.SETUP.md` — **mis à jour** (§9 V3).
- `docs/intelligence/LOT-3-HANDOFF.md` — ce document.

Aucune migration SQL, aucun type généré, aucun composant UI, aucun `.env`,
aucun fichier V1/V2 touché.

## Architecture du pipeline V3

Préfixe **partagé** avec V2 (réutilisé, non dupliqué) :

```
Webhook → Verify Signature → Validate Entity → Update Run Status → Hydrate Context
```

`Validate Entity` calcule désormais
`accountKnowledgeSchemaVersion = Number(body.accountKnowledgeSchemaVersion) === 3 ? 3 : 2`.
En l'absence de la valeur `3`, le comportement historique V2 est conservé.

**Routeur** (`Route Account Knowledge Version`, IF) inséré après `Hydrate Context` :
- **FALSE** (≠ 3) → `Prepare Deterministic Context` → toute la chaîne V2 inchangée ;
- **TRUE** (= 3) → branche V3 ci-dessous.

**Branche V3** (25 nœuds) :

```
V3 Prepare Context & Research Plan        (Code — plan de recherche déterministe, garde SSRF)
→ V3 Fetch Official Site                  (HTTP — HTML réel, neverError)
→ V3 Fetch Public Registry                (HTTP — recherche-entreprises.api.gouv.fr / INSEE)
→ V3 Fetch Company News                   (HTTP — RSS Google News, presse)
→ V3 Consult & Normalize Sources          (Code — normalise SEULES les pages réellement récupérées)
→ V3 Build Source Catalogue               (Code — CRM interne + preuves externes → lot d'upsert)
→ V3 Upsert Sources                       (HTTP — intelligence_sources, on_conflict idempotent)
→ V3 Resolve Source Ids                   (HTTP — résout les UUID réels)
→ V3 Assemble Draft Prompt                (Code — catalogue citable + prompt de GÉNÉRATION)
→ V3 Call LLM (Draft)                      (HTTP — 1ʳᵉ invocation LLM)
→ V3 Parse Draft                          (Code — validation stricte du brouillon, chemins canoniques)
→ V3 Assemble Verification Prompt         (Code — prompt de VÉRIFICATION séparé)
→ V3 Call LLM (Verify)                     (HTTP — 2ᵉ invocation LLM, indépendante)
→ V3 Parse Verification                   (Code — verdicts exploitables)
→ V3 Assemble Artifact                    (Code — filtrage déterministe, artefact publiable)
→ V3 Validate Artifact                    (Code — miroir JS de validateAccountKnowledgeV3, REJETTE si non conforme)
→ V3 Load Active Proposals                (HTTP)
→ V3 Build Enrichment Proposals           (Code — propositions d'enrichissement idempotentes)
→ V3 Delete Stale Proposals → V3 Has New Proposals? → V3 Insert Fresh / V3 Skip Proposals Insert
→ V3 Prepare Callback → V3 Sign Callback → V3 Callback
```

**Chemin d'échec** : toute sortie d'erreur des nœuds V3 (`onError:
continueErrorOutput`) mène au nœud **partagé** `Prepare Failure Callback` (celui
de V2), qui lit `runId`/`callbackUrl` depuis `Validate Entity` et notifie le run
en `failed` (phase 1, `resultType: account_knowledge`). Les trois `V3 Fetch …`
sont en `continueRegularOutput` (neverError) : une source injoignable ne casse
jamais la chaîne, elle est simplement écartée des preuves.

## Discriminateur d'activation V3

La branche V3 ne se déclenche **que** si l'appelant envoie
`accountKnowledgeSchemaVersion: 3` dans le body du webhook. **Le trigger Next.js
n'envoie pas encore cette valeur** — c'est volontaire (activation Lot 4 / mise en
service). Tant que rien n'est changé côté application, `intel-030` continue de
produire exclusivement du V2.

## Stratégie de recherche

- **Plan de recherche** (`V3 Prepare Context & Research Plan`) : une entrée par
  section V3, avec objectif, angles et sources préférées. FOLIO oriente les
  angles mais reste isolé comme legacy **non sourcé** (jamais une preuve).
- **Trois canaux publics, gratuits, sans clé, réellement consultés** :
  1. **site officiel** du compte (`companies.website`) — HTML récupéré, nettoyé
     (scripts/styles retirés), tronqué ;
  2. **registre public** `recherche-entreprises.api.gouv.fr` (INSEE Sirene) —
     identité juridique, scoring de correspondance déterministe (≥ 0,6 requis) ;
  3. **presse** via flux RSS Google News — chaque `<item>` réellement présent
     devient une preuve distincte (max 5), avec sa propre URL canonique.
- **Garde SSRF** : `isSafePublicUrl` rejette tout ce qui n'est pas http/https
  public — localhost, IP privées/loopback/link-local (`10/8`, `127/8`,
  `169.254/16`, `192.168/16`, `172.16-31/12`), pseudo-TLD internes
  (`.local`/`.internal`/`.lan`), hôtes sans point. Le contenu web est traité
  comme **non fiable** ; les prompts interdisent au LLM de suivre toute
  instruction trouvée dans une page.

## Règles de conservation des sources

- Une URL n'apparaît dans le catalogue citable **que si elle a été réellement
  téléchargée**. Un snippet de moteur de recherche n'est jamais une source ; une
  URL candidate non consultée n'entre jamais dans `source_refs`.
- Métadonnées conservées par source : `source_type`, `source_name`, `source_url`,
  `canonical_url`, `published_at`, `collected_at`, `evidence_excerpt`,
  `reliability_score`, `collection_method`, empreinte (`fingerprint`).
  Les URL sont canonicalisées (query/hash retirés) et dédupliquées sur
  `source_key` avant l'upsert (`intelligence_sources`, `on_conflict=workspace_id,source_key`).
- La source interne **« base relationnelle KREDO »** (`source_type: internal_crm`)
  est une origine réelle et datée — sans elle, aucun fait CRM ne serait citable.
- Sont aussi citables, sans re-upsert : les sources déjà rattachées aux **faits
  vérifiés** du compte (Lot 0) et les **sources primaires des signaux** d'achat
  sélectionnés. Le LLM ne peut citer QUE les UUID du catalogue résolu.
- Le **diagnostic de recherche** (`researchDiagnostic`) trace toute URL candidate
  et son issue (consultée / injoignable / correspondance faible) ; il est
  conservé dans `contextSnapshot`, **jamais** promu en preuve. Aucun secret ni
  HTML massif n'est exporté dans l'artefact (le champ `content` du catalogue est
  retiré du `contextSnapshot`).

## Séparation génération / vérification

Deux invocations LLM **distinctes** :

- **Génération** (`V3 Assemble Draft Prompt` → `V3 Call LLM (Draft)` →
  `V3 Parse Draft`) : produit un **brouillon** jamais publiable tel quel. Chaque
  claim porte `text` / `nature` / `attribution` / `source_refs` (catalogue only) /
  `confidence` / `verified_at: null`. `Parse Draft` reconstruit la forme
  canonique des 7 sections, valide chaque claim, et **rejette (throw)** :
  `institutional + analysis`, source hors catalogue, marqueur d'absence, bloc
  interdit (`organisation` / `commercial_relationship` / `operational_activities`),
  rubrique réglementaire à venir (`upcoming_*`).
- **Vérification** (`V3 Assemble Verification Prompt` → `V3 Call LLM (Verify)` →
  `V3 Parse Verification`) : prompt système **distinct**, ne reçoit **pas** le
  raisonnement du générateur — uniquement les affirmations (par chemin) et les
  preuves consultées. Le vérificateur juge chaque affirmation isolément et rend,
  par claim : `verdict` (`confirmed` / `contradicted` / `insufficient_evidence`),
  `supporting_source_refs`, `contradicting_source_refs`, `rationale`, `checked_at`.
  Pour un chiffre critique, une source officielle ou deux sources indépendantes
  concordantes sont exigées.

## Stratégie d'assemblage et de filtrage

`V3 Assemble Artifact` est **déterministe** (aucun LLM) :

- retire tout claim `contradicted` ou `insufficient_evidence`, ainsi que tout
  claim `confirmed` **sans** source de confirmation ; les verdicts négatifs sont
  conservés dans le diagnostic (`droppedClaims`), pas dans l'artefact ;
- garantit **exactement un** résultat `confirmed` par claim publié ;
- fusionne les `supporting_source_refs` du vérificateur dans les `source_refs` du
  claim (donc `supporting ⊆ source_refs`), remplit `verified_at = checked_at` ;
- recalcule les chemins sur l'artefact **final** avec la même logique que
  `collectAccountKnowledgeV3Claims` (contrat TS) ;
- injecte `identity.dynamic = null` (indicateur calculé hors modèle, Lot 4) ;
- sélectionne **au plus 3** `significant_signal_ids` uniques depuis
  `account_signals` (significativité pondérée relevance/urgency/confidence, puis
  actualité, tie-break stable par id) ;
- recalcule `source_coverage` et ne fabrique aucun contenu pour remplir une
  section vide.

`V3 Validate Artifact` est le **miroir JS** de `validateAccountKnowledgeV3` : il
**rejette (throw)** tout artefact non conforme (7 sections, clés inconnues,
correspondance claim↔vérification, verdict confirmé, `supporting ⊆ source_refs`,
≤ 3 signaux, `institutional + analysis`…) plutôt que d'en émettre un. Le test
Vitest prouve que la sortie réelle de l'assemblage passe le validateur **canonique**.

## Enrichissements proposés

Aucune écriture directe dans `companies`. `V3 Build Enrichment Proposals`
matérialise, via `enrichment_proposals` uniquement (namespace partagé
`account_scan:{companyId}:{attribut}`), des propositions sur les champs objectifs
issus du registre/site (raison sociale, SIREN, code NAF, siège, effectif estimé,
activité, site), **seulement si la valeur diffère réellement** de l'actuelle,
avec champ ciblé / valeur actuelle / valeur proposée / justification / source /
confiance. Réconciliation idempotente : une proposition `validated`/`conflicting`
(décision humaine ou conflit) n'est jamais régénérée. **Aucune application
automatique** (validation humaine requise, mécanisme existant).

## Tests exécutés et résultats

- **Harnais Node V3** (`node n8n/workflows/__tests__/intel-030-account-knowledge-v3.test.js`)
  → **41/41**. Couvre : chaîne complète nominale (14 claims → 14 vérifications →
  14 publiés), exclusion contredit / preuve insuffisante / confirmé-sans-support,
  correspondance exacte claim↔chemin↔vérification, `supporting ⊆ source_refs`,
  ≤ 3 signaux, locution d'absence conservée, rejets Parse Draft (institutional+analysis,
  source hors catalogue, réglementation à venir, bloc relocalisé, placeholder,
  troncature), séparation génération/vérification, propositions d'enrichissement
  (jamais d'écriture `companies`), callbacks succès/échec avec phase/run, garde SSRF,
  discriminateur, sorties d'erreur vers le failure callback partagé.
- **Harnais Node V2** (existant) → **76/76** (aucune régression).
- **Vitest** `account-knowledge-v3-workflow.test.ts` → **14/14** (structure du
  workflow, fixtures dense/partielle contre `validateAccountKnowledgeV3`,
  assemblage réel ↔ contrat gelé).
- **Suite Vitest complète** → **884/884** (870 avant + 14).
- `npx tsc --noEmit` → **EXIT 0** · `npx eslint` (fichiers touchés) → **0 erreur**
  · `npm run build` → **EXIT 0** · `git diff --check` → propre · 0 secret réel
  dans le diff (seul le placeholder, 4 occurrences) · 0 migration · 0 UI · 0 `.env`.

## Limites réelles / risques ouverts

- **Import/activation VPS non faits** : le workflow reste `active: false` ; les 4
  nœuds Crypto portent le placeholder HMAC ; pas de test réel avec le LLM
  Anthropic (validé via mocks Node uniquement).
- **Découverte de sources bornée** à 3 canaux gratuits (site + registre + presse).
  Pas de fournisseur de recherche payant, pas de rendu JS des sites (extraction
  texte brut best-effort). Un site en SPA sans SSR ne fournira pas de preuve.
- **Pas de verrou transactionnel** contre deux scans V3 concurrents sur le même
  compte (best-effort, comme intel-010).
- **`account_facts`** reste souvent vide en prod : la couche « faits vérifiés » du
  catalogue sera fine tant qu'elle n'est pas alimentée.
- Le **coût** double (deux appels LLM) vs V2. Tiering Haiku/Sonnet non appliqué
  (Sonnet pour les deux appels, comme les workflows précédents).

## Prérequis précis du Lot 4

1. **Ingestion V3** : remplacer le rejet `schema_version=3` d'
   `account-knowledge-ingest.ts` par un vrai chemin d'ingestion — valider via
   `parseAccountKnowledgeArtifact`, **vérifier l'existence + l'appartenance
   workspace** de chaque UUID de `source_refs` ET de `verification_results.*_source_refs`
   ET des `significant_signal_ids` (contre `account_signals`), recalculer
   `source_coverage`, injecter `identity.dynamic` (`account-dynamic-v1`).
2. **Callback** : le callback V3 réutilise le contrat existant
   (`resultType: account_knowledge`, `contentJson` = artefact V3). Le routeur
   d'ingestion doit brancher V3 sur le nouveau chemin (le workflow envoie déjà
   `contextSnapshot.schemaVersion = 3`).
3. **Trigger** : décider où l'application enverra `accountKnowledgeSchemaVersion: 3`
   (bouton « Mettre à jour l'entreprise »). Tant que ce n'est pas fait, V3 reste dormant.
4. Conserver les barrières V1/V2 : aucune conversion rétroactive.

## Procédure de test manuel future (à NE PAS exécuter ici)

1. Configurer le secret HMAC (`N8N_WEBHOOK_SECRET`) dans les 4 nœuds Crypto
   (`Verify Signature`, `Sign Callback`, `Sign Failure Callback`, `V3 Sign Callback`).
2. Importer le JSON à jour sur le VPS n8n, credentials `Supabase_Service_Role_KREDO`
   + `anthropicApi` sur les nœuds concernés. Activer le workflow.
3. Déclencher `POST /api/n8n/trigger` avec `workflowId: intel-030-account-knowledge`,
   `entityType: company`, et un payload portant `accountKnowledgeSchemaVersion: 3`
   (ajout temporaire côté trigger tant que le Lot 4 ne l'a pas branché).
4. Vérifier sur un compte riche (ex. Voyage Privé) : sources réellement consultées
   citées, chaque claim publié confirmé, `verification_results` = nombre de claims,
   ≤ 3 signaux, propositions d'enrichissement créées, `companies` inchangée.
5. Vérifier le cas dégradé (compte sans site public / sans correspondance
   registre) : artefact **partiel mais valide**, sections vides plutôt que remplies
   d'hypothèses, run terminé (jamais bloqué en `running`).
6. Relancer le même compte : aucune source ni proposition dupliquée.

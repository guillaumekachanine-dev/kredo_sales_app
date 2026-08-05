# LOT 4 — Document de reprise (HANDOFF)

> **STATUT : LOT 4 TERMINÉ — EN ATTENTE DE VALIDATION HUMAINE**
> Dernière mise à jour : 2026-08-05 CEST
> Commit de départ (worktree local) : `38282b9b` — worktree propre, Lots 2 et 3 déjà committés.
> Aucun commit, push, déploiement, import ou activation n8n n'a été effectué.

## Périmètre effectivement livré

Branchement applicatif complet de `AccountKnowledgeContentV3` :

1. correction du **discriminateur** de version dans `intel-030-account-knowledge` ;
2. **ingestion V3** réelle dans le portail existant (le rejet du Lot 2 disparaît) ;
3. contrôle d'existence et de cloisonnement des **sources** et des **signaux** ;
4. injection des données **déterministes** et recalcul des **métadonnées QA** ;
5. persistance V3 **sans conversion ni altération silencieuse** ;
6. **lecture** V1 / V2 / V3 discriminée par le loader canonique ;
7. **déclenchement V3 explicite** possible, jamais activé par défaut dans l'UI.

Hors périmètre, conformément au cadrage : aucun composant visuel V3, aucune
migration SQL, aucun prompt LLM, aucune modification du chemin V2 du workflow,
aucune écriture directe dans `companies`.

## Fichiers modifiés / créés

| Fichier | Nature |
|---|---|
| `n8n/workflows/intel-030-account-knowledge.json` | **modifié** — un seul nœud touché (`Validate Entity`), résolution du discriminateur. Aucun autre nœud, aucune connexion. |
| `n8n/workflows/intel-030-account-knowledge.SETUP.md` | **modifié** — §9.1 réécrite (nouvelle résolution + payload de déclenchement V3). |
| `n8n/workflows/__tests__/intel-030-account-knowledge-v3.test.js` | **modifié** — section 0 : 8 assertions sur le discriminateur, exécutant réellement le nœud. |
| `src/lib/n8n/types.ts` | **modifié** — ajout de `AccountKnowledgeTriggerInput`. |
| `src/lib/intelligence/account-knowledge-ingest.ts` | **modifié** — union de retour étendue à V3, `collectAccountKnowledgeV3SourceIds`, `findUnknownSignalIds`, `ingestV3`. |
| `src/lib/intelligence/account-knowledge-state.ts` | **modifié** — union V1/V2/V3, `AccountKnowledgeRenderableState`, `AccountKnowledgeV3State`, `resolveAccountKnowledge` (ex-`resolveAccountKnowledgeState`). |
| `src/lib/intelligence/intelligence-data.ts` | **modifié** — séparation `accountKnowledge` (restituable) / `accountKnowledgeV3`, trace serveur des artefacts illisibles. |
| `src/components/accounts-contacts/intelligence/AccountKnowledgeUpdateControls.tsx` | **modifié — type uniquement** (`AccountKnowledgeState` → `AccountKnowledgeRenderableState`). Aucun markup, aucun style, aucun comportement. |
| `src/app/api/n8n/callback/route.test.ts` | **créé** — 6 tests de la route (persistance normalisée, refus, idempotence, V2 intact, HMAC). |
| `src/lib/intelligence/account-knowledge-ingest.test.ts` | **modifié** — +19 tests V3, faux client Supabase appliquant réellement les filtres `workspace_id` / `company_id`. |
| `src/lib/intelligence/account-knowledge-state.test.ts` | **modifié** — +5 tests (discrimination V3, arbitrage V2/V3, non-conversion, garde de compilation). |
| `src/lib/intelligence/account-knowledge-v3-workflow.test.ts` | **modifié** — +1 test de cohérence entre le nœud et l'emplacement réel du payload. |

Le fichier `src/app/api/n8n/callback/route.ts` n'a **pas** été modifié : le portail
`account_knowledge` y était déjà générique, il accepte V3 dès que l'ingestion la
renvoie. Aucune branche de sauvegarde parallèle n'a été créée.

## 1. Discriminateur de version

`triggerN8nRun` sérialise les paramètres métier sous `body.input`. Le nœud
`Validate Entity` ne lisait que la racine du body : **la branche V3 était
inatteignable depuis l'application**, quel que soit l'appel émis par le front.

Résolution désormais appliquée :

```js
const requestedVersion =
  body.input?.accountKnowledgeSchemaVersion ??
  body.accountKnowledgeSchemaVersion;

let accountKnowledgeSchemaVersion;
if (requestedVersion == null)                    accountKnowledgeSchemaVersion = 2;
else if (Number(requestedVersion) === 2
      || Number(requestedVersion) === 3)         accountKnowledgeSchemaVersion = Number(requestedVersion);
else throw new Error('Version AccountKnowledge non supportée');
```

- absence de valeur → **V2 historique** ;
- `2` → V2 · `3` → V3 ;
- toute autre valeur explicite (`4`, `"latest"`, `""`) → **rejet** — une version
  inconnue est une erreur d'appelant, pas une raison de produire silencieusement
  un artefact d'une autre version que celle demandée ;
- la racine reste acceptée en compatibilité temporaire ; `input` prime en cas de
  divergence.

Aucun autre comportement du workflow n'a été touché : le routeur, les 25 nœuds V3
et toute la chaîne V2 sont inchangés (56 nœuds avant, 56 après).

## 2. Ingestion V3

`ingestAccountKnowledgeArtifact` retourne désormais une union strictement
corrélée version ↔ contenu :

```ts
| { ok: true; version: 1; content: AccountKnowledgeContent }
| { ok: true; version: 2; content: AccountKnowledgeContentV2 }
| { ok: true; version: 3; content: AccountKnowledgeContentV3 }
| { ok: false; error: string; issues: ValidationIssue[] }
```

Le chemin V3 est **dédié** (`ingestV3`) : il ne partage avec V2 que les briques
génériques (contrôle des sources, calcul de la dynamique). Tomber dans le chemin
V2 fabriquerait des sections absentes du contrat V3.

### Ordre des opérations

1. validation structurelle par `parseAccountKnowledgeArtifact` (Lot 2) ;
2. refus si le run n'est pas scopé compte (`company_id` manquant) ;
3. calcul de `identity.dynamic` (`account-dynamic-v1`) et construction du contenu
   candidat (dynamique injectée + `source_coverage` recalculé) ;
4. contrôle des **sources** citées par ce contenu candidat ;
5. contrôle des **signaux** cités.

La dynamique est injectée **avant** la collecte des UUID, à dessein : les sources
de l'indicateur réellement persisté sont contrôlées elles aussi.

### Sources contrôlées

`collectAccountKnowledgeV3SourceIds` déduplique (via `Set`) les UUID de trois
gisements :

- `claim.source_refs` de **tous** les claims, parcourus par le helper canonique
  `collectAccountKnowledgeV3Claims` (contrat Lot 2 — pas une seconde
  implémentation qui divergerait) ;
- `verification_result.supporting_source_refs` **et**
  `contradicting_source_refs` — une vérification « indépendante » adossée à une
  source fantôme ne prouve rien ;
- `identity.dynamic.source_refs` de l'indicateur injecté.

Chaque UUID doit exister dans `intelligence_sources` **et** appartenir au
`workspace_id` du run. Le workflow tourne en `service_role`, hors RLS : sans ce
contrôle, un artefact pourrait citer la source d'un autre tenant. Le message
renvoyé à n8n ne distingue jamais « inexistante » de « autre workspace » — le
callback ne doit pas devenir un oracle d'existence cross-tenant.

### Signaux contrôlés

Chaque `trends_and_news.significant_signal_ids` doit désigner une ligne
`account_signals` existante, du **workspace** du run **et** rattachée au
**compte** du run. Le triple filtre est nécessaire : `workspace_id` seul
laisserait la section « Tendances et actualité » afficher l'actualité d'un autre
compte du même workspace. Un seul signal invalide refuse **l'artefact entier** —
jamais une version amputée du signal fautif.

### Normalisations déterministes

Seules trois choses sont réécrites, toutes déterministes :

- `identity.dynamic` — **toujours** recalculé, la valeur produite par le workflow
  n'est jamais retenue (le workflow émet `null`, mais le contrôle ne repose pas
  sur cette politesse) ;
- `source_coverage` — recalculé par `buildQualitySummary` depuis les claims
  réellement publiés. Deux listes sont **conservées** telles quelles,
  `stale_source_paths` et `contradiction_paths` : seul le moteur observe la
  fraîcheur des sources et les contradictions relevées pendant la vérification ;
- rien d'autre. Les `verification_results` sont préservés à l'identique — aucun
  texte, chemin, verdict, date ou rationale n'est retouché.

Aucune réparation silencieuse : un artefact invalide est refusé en bloc.

## 3. Callback et persistance

Le portail existant (`api/n8n/callback/route.ts`, étape « 4 bis ») est réutilisé
tel quel. Garanties, désormais couvertes par des tests :

- un artefact V3 valide est persisté dans `ai_intelligence_results.content_json`
  sous sa forme **normalisée** (pas celle reçue de n8n) ;
- un artefact V3 invalide → réponse **400**, run basculé en **`failed`** avec le
  détail des `issues` : un run n'est jamais laissé en `running` ;
- **aucune persistance partielle** : le refus intervient avant `saveResult` ;
- **idempotence** : `saveResult` est un upsert sur `(run_id, phase)` ; rejouer le
  même callback réécrit la même ligne avec le même contenu (vérifié à horloge
  figée — voir la limite ci-dessous) ;
- `sourceRefs` / `qaFlags` du payload restent ceux du callback, portés par le
  contenu V3 validé ;
- aucune ligne V1/V2 historique n'est relue, réécrite ou convertie (un nouveau
  run = une nouvelle ligne) ;
- aucun champ de `companies` n'est touché — le faux client Supabase des tests
  lève sur toute table inattendue, une écriture ferait échouer le test.

## 4. Lecture applicative

Loader canonique : `resolveAccountKnowledge` (`account-knowledge-state.ts`),
renommé depuis `resolveAccountKnowledgeState` — il ne renvoie plus seulement un
état.

```ts
type AccountKnowledgeResolution = {
  state: AccountKnowledgeState | null          // union discriminée 1 | 2 | 3
  unreadable: AccountKnowledgeUnreadableResult[]
}
```

**Sélection** : premier artefact « moderne » rencontré (V2 **ou** V3, lignes
triées par `created_at` décroissant), à défaut dernier V1, à défaut `null`.
V2 et V3 sont départagées par la seule fraîcheur, jamais par un rang de version :
une V2 régénérée après une V3 est bien la connaissance courante du compte, et
réciproquement. Seule V1 reste subordonnée — elle ne porte aucun sourcing.
Aucune conversion, dans aucun sens.

**Séparation stricte côté données** (`intelligence-data.ts`) :

- `ClientIntelligenceData.accountKnowledge` est **restreint** à
  `AccountKnowledgeRenderableState` (V1 | V2) — un V3 n'y atterrit jamais ;
- `ClientIntelligenceData.accountKnowledgeV3` porte l'état V3, chargé et typé,
  **consommé par aucun composant** au Lot 4.

**État neutre et non destructif** : quand l'artefact courant est un V3, la fiche
retombe sur le rendu relationnel/FOLIO existant, exactement comme un compte
n'ayant jamais eu d'artefact moteur. Rien ne casse, rien n'est perdu (les lignes
V2 antérieures restent en base et redeviennent courantes si une V2 est
régénérée), et surtout aucun V3 n'est rendu par un lecteur V2.

**Erreurs de parsing non masquées** : une ligne refusée par le parseur est
remontée dans `unreadable` et tracée côté serveur (`console.error`, avec l'id du
résultat et les `issues`). Retomber en silence sur un artefact plus ancien
ferait passer une panne de génération pour une absence de mise à jour.

**Garde de compilation** : `AccountKnowledgeUpdateControls.tsx` s'annote
désormais avec `AccountKnowledgeRenderableState`. Un V3 qui y serait passé
deviendrait une erreur `tsc`, pas un rendu silencieusement faux. C'est la seule
modification touchant un fichier de composant, et elle est **purement typée**.

## 5. Déclenchement V3 explicite

Aucun bouton n'envoie `3`. Le mécanisme existe et est typé :

```ts
// src/lib/n8n/types.ts
export type AccountKnowledgeTriggerInput = {
  accountKnowledgeSchemaVersion: 2 | 3
}
```

```jsonc
POST /api/n8n/trigger
{
  "workflowId": "intel-030-account-knowledge",
  "entityType": "company",
  "entityId": "<companyId>",
  "companyId": "<companyId>",
  "input": { "accountKnowledgeSchemaVersion": 3 }
}
```

`triggerN8nRun` transmet `input` verbatim ; `Validate Entity` y lit maintenant le
discriminateur. `useAccountKnowledgeRun` continue d'envoyer `input: {}` — **V3
reste dormante par défaut**, conformément au cadrage.

## 6. Tests exécutés et résultats

| Commande | Résultat |
|---|---|
| `npm run typecheck` | **EXIT 0** |
| `npx eslint` (9 fichiers touchés/créés) | **0 erreur, 0 warning** |
| `npx vitest run src/lib/intelligence/ src/app/api/n8n/callback/` (Lots 2-4) | **274/274** |
| `npm test` (suite complète) | **915/915** (884 avant le Lot 4, +31) |
| `npm run build` | **EXIT 0**, toutes routes générées |
| `node …/intel-030-account-knowledge-v3.test.js` (harnais V3) | **49/49** (41 avant, +8 discriminateur) |
| `node …/intel-030-account-knowledge.test.js` (harnais V2) | **76/76** — aucune régression |
| Validation JSON du workflow | OK — 56 nœuds, `active: false` |
| `git diff --check` | propre |

Couverture des 26 points exigés — discriminateur : version absente → V2 ·
`input` = 3 → V3 · compatibilité racine · version inconnue → rejet (+ `input`
prime sur la racine, `2` → V2, valeur non numérique → rejet) ; ingestion :
artefact V3 valide · source de claim inconnue · source de vérification inconnue ·
source hors workspace · signal inconnu · signal hors workspace · signal d'un
autre compte · déduplication des UUID contrôlés · injection de `identity.dynamic`
· écrasement de toute dynamique reçue · recalcul de `source_coverage` ·
conservation des `verification_results` ; callback : succès · refus → run
`failed` · absence de persistance partielle · idempotence ; lecture : V1
inchangé · V2 inchangé · V3 discriminé · impossibilité de traiter V3 comme V2
(`@ts-expect-error`) · aucune conversion rétroactive · aucune écriture dans
`companies`.

## 7. Limites réelles / risques ouverts

- **Import/activation VPS non faits.** Le workflow reste `active: false`, les 4
  nœuds Crypto portent le placeholder HMAC. Tant que le JSON à jour n'est pas
  réimporté, la production continue de lire l'ancien discriminateur (racine
  seule) : **V3 y reste inatteignable depuis l'application**.
- **Aucun test avec le LLM réel.** Toute la chaîne V3 reste validée par mocks
  (harnais Node + Vitest), comme au Lot 3.
- **Idempotence et horloge.** `identity.dynamic` porte la fenêtre d'observation
  calculée **à l'instant de l'ingestion**. Rejouer un callback plus tard réécrit
  la même ligne avec des bornes de fenêtre décalées — c'est le comportement
  voulu (l'indicateur mesure une activité datée, il ne se fige pas), mais
  l'égalité stricte du `content_json` n'est observable qu'à horloge figée. Le
  test d'idempotence utilise `vi.setSystemTime` pour cette raison.
- **Sources V3 non résolues pour l'affichage.** `accountKnowledgeSources` reste
  alimenté depuis les seuls artefacts V2 (`collectAccountKnowledgeV2SourceIds`).
  C'est cohérent au Lot 4 — aucun composant ne rend V3 — mais c'est un
  **prérequis du Lot 5** (voir ci-dessous).
- **`unreadable` n'est pas exposé à l'UI**, seulement tracé côté serveur. Aucun
  consommateur n'existe pour l'afficher avant le Lot 5.
- **Pas de verrou transactionnel** contre deux runs V3 concurrents sur le même
  compte (inchangé depuis le Lot 3).
- **Coût doublé** vs V2 (deux appels LLM), tiering Haiku/Sonnet non appliqué.

## 8. Prérequis exacts du Lot 5

1. **Résoudre les sources citées par V3.** Ajouter, dans
   `getClientIntelligence`, une branche symétrique de `citedSourceIds` utilisant
   `collectAccountKnowledgeV3SourceIds` (déjà exporté). Ne **pas** fusionner
   avec `accountKnowledgeSources` (qui alimente `buildSourceIndex` des
   composants V2) : prévoir un champ distinct, ou passer le même index une fois
   que les composants V2 auront cessé d'être les seuls consommateurs.
2. **Résoudre les signaux significatifs.** `trends_and_news.significant_signal_ids`
   ne porte que des UUID ; les libellés vivent dans `account_signals`
   (`data.accountSignals` est déjà chargé par le loader). La section 7 exige
   aussi la **modale exhaustive** de tous les signaux.
3. **Consommer `data.accountKnowledgeV3`**, jamais `data.accountKnowledge`, pour
   les nouveaux composants. Les sept sections doivent être rendues dans l'ordre
   de `ACCOUNT_KNOWLEDGE_V3_SECTION_ORDER`.
4. **Afficher la nature des affirmations** : `nature` (`fact` / `analysis`),
   `attribution` (`independent` / `institutional` — un propos institutionnel est
   déclaratif même sur support officiel), et l'état de preuve porté par le
   `verification_result` correspondant (résolu par `claim_path`, avec les
   chemins produits par `collectAccountKnowledgeV3Claims`).
5. **Relocaliser sans supprimer** `Organisation`, `Activités opérationnelles` et
   `Relation commerciale` (contrat §« Relocalisation future »).
6. **Décider de la bascule du déclenchement** : brancher
   `accountKnowledgeSchemaVersion: 3` dans `useAccountKnowledgeRun` (ou un
   second bouton) une fois la restitution disponible. Le hook n'a pas été touché
   au Lot 4, précisément pour laisser cette décision au Lot 5.
7. **Prévoir l'affichage de `unreadable`** si un signalement utilisateur est
   souhaité (aujourd'hui : trace serveur uniquement).

## 9. Procédure de test E2E future (à NE PAS exécuter ici)

1. Configurer le secret HMAC (`N8N_WEBHOOK_SECRET`) dans les 4 nœuds Crypto
   (`Verify Signature`, `Sign Callback`, `Sign Failure Callback`,
   `V3 Sign Callback`).
2. Importer le JSON à jour sur le VPS n8n (credentials
   `Supabase_Service_Role_KREDO` + `anthropicApi`), puis activer le workflow.
   **Sans ce réimport, le correctif du discriminateur n'est pas en production.**
3. **Non-régression V2 d'abord** : déclencher sans `input`, puis avec
   `input: { accountKnowledgeSchemaVersion: 2 }`. Attendu dans les deux cas : un
   artefact `schema_version: 2`, onglet Entreprise inchangé.
4. **Cas nominal V3** sur un compte riche (ex. Voyage Privé) avec
   `input: { accountKnowledgeSchemaVersion: 3 }`. Vérifier en base
   (`ai_intelligence_results`) : `schema_version: 3`, `identity.dynamic` avec
   `method_version: "account-dynamic-v1"` (jamais `null`, jamais une valeur du
   modèle), `source_coverage` cohérent avec le nombre réel de claims, un
   `verification_result` `confirmed` par claim, ≤ 3 `significant_signal_ids`
   tous rattachés au compte, `companies` inchangée, propositions
   d'enrichissement créées mais **non appliquées**.
5. **Rejet volontaire** : rejouer un callback forgé citant un `significant_signal_id`
   d'un autre compte. Attendu : HTTP 400, run en `failed` avec le détail, aucune
   ligne `ai_intelligence_results` écrite.
6. **Version inconnue** : `input: { accountKnowledgeSchemaVersion: 4 }`. Attendu :
   le workflow échoue proprement via `Prepare Failure Callback`, run en `failed`,
   jamais un artefact V2 produit à la place.
7. **Lecture applicative** : ouvrir la fiche compte après le run V3. Attendu au
   Lot 4 — la fiche reste consultable et retombe sur le rendu relationnel/FOLIO
   (aucun composant V3 n'existe encore), sans erreur console ni page blanche.
8. **Retour arrière** : relancer un run V2 sur le même compte. Attendu : la fiche
   réaffiche le rendu V2, l'artefact V3 restant intact en base.

## 10. Confirmations

- Aucune migration Supabase, RPC, type généré ou DDL.
- Aucun autre workflow n8n modifié ; `intel-030` reste `active: false`.
- Aucun composant visuel, style, token ou design FOLIO modifié — la seule
  modification dans `src/components/` est une annotation de type.
- Les sept sections du contrat, les prompts LLM, la recherche et la vérification
  du Lot 3 et les limites de tokens du chemin V2 sont inchangés.
- Aucune ligne V1/V2 historique réécrite ou convertie.
- Aucun secret manipulé, aucun fichier `.env*` modifié.
- V3 n'est activée par défaut nulle part dans l'application.
- Aucun commit, push, déploiement ou import n8n effectué.

## 11. Constats hors périmètre (non traités)

Deux échecs **pré-existants**, sur des fichiers que ce lot n'a pas touchés :

- harnais Node `intel-020-communication.test.js` et
  `intel-040-workspace-diagnostic.test.js` : `HARNESS CRASHED: ReferenceError:
  $execution is not defined` — leurs sandboxes `vm` n'ont pas suivi l'ajout de
  `$execution` / `$workflow` dans les nœuds `Prepare Callback` (Session 28) ;
- `npm run check:server-boundary` : `src/features/knowledge-hub/expertise/get-kredo-expertise-snapshot.ts`
  importe `@/lib/supabase/server` sans `import "server-only"` (déjà consigné en
  Session 30, commit `71c0b5dc`).

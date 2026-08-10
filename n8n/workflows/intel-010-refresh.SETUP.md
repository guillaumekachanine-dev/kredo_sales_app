# INTEL-010 (Lot 1) — intel-010-refresh / account_scan : import & configuration VPS

## 1. Ce que fait ce workflow

Déclenché par webhook (path `intel-010-refresh`), ce workflow implémente la première
étape de la feature « Scan rapide compte » : à partir d'un compte KREDO déjà connu
(`entityType: "company"`), il résout l'entité juridique correspondante dans le registre
officiel français, collecte le site officiel et quelques titres de presse, sépare les
champs objectifs (issus du registre) des faits interprétatifs (issus d'une extraction LLM
contrainte), calcule une confiance déterministe, écrit `intelligence_sources` +
`enrichment_proposals` + `intelligence_source_links`, puis notifie KREDO via callback signé
avec `resultType: "account_scan"`.

**Aucune UI ne consomme ce workflow pour l'instant** (Lot 2, à venir) — ce lot livre
uniquement le backend n8n + les écritures Supabase. **Aucune recherche de contact**
(`contactMode` est toujours `"none"` en Lot 1, `contactCandidates` est toujours vide) —
ça sera le Lot 3.

## 2. Pourquoi `intel-010-refresh` n'existait pas déjà

`intel-010-refresh` figurait dans `src/lib/n8n/types.ts` (`N8nWorkflowId`) depuis les tout
premiers commits du projet, avec le commentaire `// INTEL-010 : client_intelligence_refresh`
— mais **aucune implémentation canonique n'a jamais existé** : ni fichier
`n8n/workflows/intel-010-refresh.json`, ni appelant côté Next.js, ni mention dans `docs/`.
Recherche exhaustive faite avant d'écrire ce fichier (grep sur tout le dépôt, hors
`node_modules`) — confirmé absent. Ce workflow est donc une création, pas une extension
d'un fichier existant, mais il **réutilise l'ID déjà réservé** plutôt que d'en inventer un
nouveau, conformément à la consigne du Lot 1.

Il n'y a donc **rien à régresser** côté usages historiques de cet ID — le seul « non-régression »
testé est que le routage par `input.operation` rejette proprement toute opération non
`"account_scan"` (utile le jour où `client_intelligence_refresh` ou une autre opération
viendrait s'ajouter sur ce même ID).

## 3. Import

1. n8n → **Workflows → Import from File** → `intel-010-refresh.json`.
2. Ne pas activer tout de suite (`active: false` par défaut).
3. Credentials déjà existants sur cette instance (mêmes ids que tous les autres workflows
   `intel-0xx`) :
   - Supabase : `Supabase_Service_Role_KREDO` (id `GBrm2aWU0dDf85QS`)
   - Anthropic : `Anthropic API (KREDO)` (id `MERo2FsyLlNgDQXh`)
   Si l'import affiche un credential manquant, resélectionner le credential existant du
   même nom dans chaque nœud concerné — aucun nouveau credential à créer.

## 4. Configuration requise

### 4.1 Secret HMAC (2 nœuds Crypto)

`Verify Signature` et `Sign Callback` / `Sign Failure Callback` contiennent le placeholder
`REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET` — remplacer par la même valeur que
`N8N_WEBHOOK_SECRET` côté Vercel (déjà configurée pour les autres workflows `intel-0xx` /
`report-*`, copier le même secret).

### 4.2 Webhook

Le nœud `Webhook — Account Scan` doit être accessible à l'URL
`{N8N_WEBHOOK_BASE_URL}/webhook/intel-010-refresh`.

### 4.3 Aucune nouvelle variable d'environnement, aucun nouveau credential

Le registre officiel (`recherche-entreprises.api.gouv.fr`) est une API publique
data.gouv.fr / INSEE Sirene, gratuite, **sans clé** — appelée en HTTP simple, sans
credential n8n. Conforme à la consigne « pas de nouveau fournisseur payant ».

## 5. Limites assumées (à connaître avant d'activer)

- **Découverte automatique de site officiel non implémentée.** Le registre officiel
  français ne porte pas l'URL du site web d'une entreprise. Le champ `website` n'est
  proposé que si `websiteHint` est fourni explicitement en entrée (ou si le compte a déjà
  un site connu en base) — aucune recherche web n'est tentée pour le découvrir, faute de
  fournisseur de recherche déjà configuré dans KREDO (règle explicite du Lot 1 : pas de
  nouveau fournisseur payant). C'est un `warnings[]` explicite dans `AccountScanOutput`
  quand ce cas se présente.
- **`sector` et `revenue` volontairement exclus des champs proposés en V1.** Pas de mapping
  fiable NAF↔`sector_intelligence` (cf. [[folio-data-reality]] côté mémoire projet — le
  parc a une granularité sectorielle hétérogène, un mapping automatique aurait produit des
  rattachements de mauvaise qualité) ; pas de source fiable et gratuite pour le CA en accès
  libre. Le champ CRM `sector`/`revenue` reste donc uniquement modifiable par les autres
  canaux existants (curation manuelle, workflows sectoriels).
- **`employee_count` est une estimation, pas une donnée exacte.** Le registre expose une
  *tranche* d'effectif salarié (ex. "20 à 49 salariés"), pas un chiffre ponctuel — la
  proposition utilise le point médian de la tranche, avec `explicitness` réduite en
  conséquence dans le calcul de confiance (jamais présentée comme aussi fiable qu'un SIREN
  ou une raison sociale).
- **Presse via Google News RSS** (même mécanisme que `intel-033-account-watch-refresh`,
  déjà en prod) — pas de vraie API de presse payante. Reliability_score calibré en
  conséquence (0.55, contre 0.97 pour le registre officiel).
- **Extraction du site officiel = texte brut best-effort** (script/style retirés, balises
  retirées, tronqué à 6000 caractères) — pas de parsing HTML structuré, pas de rendu JS
  (les sites en SPA pure sans SSR ne donneront pas de texte exploitable ; le run n'échoue
  pas pour autant, `siteFetchFailed` est simplement vrai et les faits qui en dépendent ne
  sont pas produits).
- **Dédoublonnage best-effort, pas de verrou transactionnel.** Deux scans lancés en
  parallèle sur le même compte peuvent chacun supprimer/réinsérer les propositions
  `proposed`/`needs_review` de l'autre — accepté comme risque connu, à traiter au Lot 5
  (stabilisation / conflits concurrents) plutôt que résolu ici.
- **Aucun `PATCH` direct de `ai_intelligence_runs` vers succeeded/failed** — comme tous les
  autres workflows `intel-0xx`, ce workflow ne fait que le passage à `running` ; la
  transition finale est gérée par `/api/n8n/callback` (`updateRunStatus`) à réception du
  callback signé.

## 6. Contrat d'entrée exact attendu

```json
{
  "runId": "...",
  "workflowId": "intel-010-refresh",
  "entityType": "company",
  "entityId": "<companyId>",
  "workspaceId": "...",
  "userId": "...",
  "callbackUrl": "https://.../api/n8n/callback",
  "input": {
    "operation": "account_scan",
    "informationMode": "find",
    "contactMode": "none",
    "selectedSiren": null,
    "websiteHint": null,
    "locationHint": null,
    "autoApplyOfficialMissing": true,
    "knownCompany": { "name": "...", "legalName": null, "website": null, "siren": null, "nafCode": null, "sectorId": null },
    "requestedFields": [],
    "requestedFacts": []
  }
}
```

`requestedFields`/`requestedFacts` vides = le workflow choisit lui-même la liste complète
pertinente selon `informationMode` (`find` = champs vides uniquement, `verify` = tous).

## 7. Résolution d'entité juridique — écart documenté vs le contrat Lot 0 initial

Le contrat `AccountScanOutput` livré au Lot 0 (`src/lib/n8n/types.ts`) ne portait **aucun
champ `resolution`**, alors que le Lot 1 exige explicitement de ne jamais générer de
proposition tant que l'entité n'est pas résolue sans ambiguïté, et de retourner 2 à 5
candidats en cas d'ambiguïté. Plutôt que de contourner cette exigence de sécurité des
données (au risque d'écrire un SIREN erroné sur une fiche compte), le contrat a été
**étendu de façon additive** dans ce lot : `AccountScanResolution` / `AccountScanOutput.resolution`
+ `AccountScanTriggerInput.selectedSiren/websiteHint/locationHint/autoApplyOfficialMissing`.
Aucun champ existant n'a été retiré ni renommé — changement purement additif, `tsc --noEmit`
validé après coup, aucun autre fichier du dépôt ne consommait encore ce contrat (Lot 2 pas
commencé).

## 8. Test avant activation

1. Dans n8n, copier l'URL du webhook (mode "Listen for test event" ou après activation
   temporaire).
2. Déclencher un run de test avec un `entityId` correspondant à un compte réel dont le nom
   légal est identifiable (ex. une société bien connue) — vérifier dans **Executions** que
   le run va jusqu'au callback sans erreur.
3. Vérifier dans Supabase : `enrichment_proposals` contient de nouvelles lignes
   `status='proposed'` (ou `needs_review` si confiance < 0.45) avec `primary_source_id` non
   nul, `intelligence_sources` contient une ligne `source_type='regulatory_filing'`, et
   `intelligence_source_links` relie les deux.
4. Rejouer le même run (même compte, même `informationMode`) et vérifier qu'aucune ligne
   supplémentaire n'apparaît pour les mêmes attributs (les anciennes lignes `proposed` sont
   supprimées puis réinsérées à l'identique — comportement voulu, cf. §5 dédoublonnage).
5. Tester un compte dont le nom est ambigu (plusieurs sociétés du même nom) : vérifier que
   `ai_intelligence_results.content_json.resolution.status = "ambiguous"` avec 2 à 5
   candidats, et qu'**aucune** ligne `enrichment_proposals` n'a été créée pour ce run.
6. Tester avec `selectedSiren` renseigné directement : vérifier
   `resolution.matchMethod = "selected_siren"` et que des propositions sont bien générées
   sans repasser par le scoring de candidats.

## 9. Activation

Une fois le test §8 validé de bout en bout : activer ce workflow (toggle en haut à droite).

## 10. Lot 3 — Fiabilisation de la chaîne Contacts (2026-07-13)

Le Lot 3 durcit la phase Contacts (`contactMode: "identify"/"confirm"`), livrée au Lot 1
mais jamais réellement fiabilisée : le LLM proposait `confidenceScore`/`suggestedAction` de
son propre chef, sans aucune visibilité sur le CRM (`existingPersonId`/`existingContactId`
restaient toujours `null`).

**Nouveau nœud `Load Workspace Contacts`** (httpRequest, inséré entre `Parse & Validate LLM
Output` et `Build Proposals & Sources`) : charge `contacts?workspace_id=eq...&select=...,
person:persons(...)` (tout le workspace, pas seulement le compte scanné — nécessaire pour
distinguer "personne déjà connue ailleurs" de "personne totalement nouvelle", limité à 2000
lignes). **Piège évité** : ce nœud est inséré *dans* la chaîne linéaire existante juste avant
`Build Proposals & Sources`, ce qui change ce que `$input` représente pour ce dernier (sa
propre réponse HTTP, pas le contexte attendu). Corrigé en faisant lire `Build Proposals &
Sources` son `ctx` depuis `$('Parse & Validate LLM Output').item.json` explicitement (déjà le
pattern utilisé par `Reconcile & Prepare Writes` vis-à-vis de `Merge Scan Result`) plutôt que
`$input.first().json`.

**Contrat LLM simplifié** (`Assemble Extraction Prompt` / `Parse & Validate LLM Output`) : le
LLM ne fournit plus `confidence_score` ni `suggested_action` pour les contacts — un candidat
sans `full_name` OU sans `evidence` non vide est désormais rejeté silencieusement (pas
d'exception qui ferait échouer tout le scan pour un seul mauvais candidat).

**Rapprochement CRM + score déterministe** (`Build Proposals & Sources`) : même ordre de
priorité que le RPC d'import (email normalisé > LinkedIn normalisé > nom normalisé + compte).
`existingPersonId`/`existingContactId`/`suggestedAction` sont désormais calculés par recoupement
réel avec `Load Workspace Contacts`, jamais devinés par le LLM. Confiance plafonnée par type de
source retenue (site officiel/registre 0.95, presse 0.80, aucune source forte 0.55) et par un
plafond additionnel de 0.45 si `emailStatus === "inferred"` — un email deviné ne peut jamais
faire passer un candidat en « haute confiance ». Tout candidat sans source (`sourceKeys.length
=== 0`) ou sans preuve est éliminé avant callback. Déduplication interne par identité normalisée
(email/LinkedIn/nom) : deux candidats LLM visant la même personne fusionnent, le plus confiant
gagne. `candidateKey` dérive de champs **normalisés** (accents/casse/espaces/paramètres d'URL
retirés) : il reste stable entre deux scans du même compte, contrairement à la V1 qui hashait
les champs bruts.

**Validation réelle** (pas seulement `node --check`) : harnais Node (`vm` + mocks `$`/`$input`)
couvrant les 9 scénarios du §12 de la commande Lot 3 — candidat neuf, match cross-compte
(`link`, `existingContactId=null`), match à ce compte sans nouveauté (`link`), match à ce
compte avec donnée divergente (`update`), plafonds de confiance (site officiel vs email
inféré), stabilité de `candidateKey` entre deux variantes de casse/espaces, dédoublonnage
interne, rejet d'un candidat sans source, non-régression `contactMode: "none"` (Phase 1
inchangée).

**RPC `import_account_scan_contacts` durci en parallèle** (migrations
`20260713090000_harden_import_account_scan_contacts.sql` +
`20260713090100_fixup_import_account_scan_contacts_role_default.sql`) : verrou advisory
transactionnel par identité (email/LinkedIn/nom) empêchant deux imports concurrents du même
candidat de créer un doublon ; verrouillage `FOR UPDATE` des lignes `persons`/`contacts`
trouvées ; distinction réelle `already_exists` (rien de nouveau) / `updated` (champ vide
comblé, ou conflit avec `allowExistingUpdates=true`) / `conflicting` (valeur CRM non vide
différente, `allowExistingUpdates=false` — la mise à jour est refusée et signalée, jamais
silencieusement ignorée) ; normalisation LinkedIn (schéma/www/query/fragment/slash final) et
nom (accents via `unaccent`) pour un rapprochement robuste aux variantes de collecte. Testé en
direct sur des fixtures réelles (email/LinkedIn/nom+compte dupliqués, conflit bloqué par
défaut puis débloqué explicitement, réimport idempotent) via `mcp__supabase__execute_sql`
avec simulation de session authentifiée (`SET LOCAL request.jwt.claims`).

**Non fait dans ce lot** : import/activation du workflow mis à jour sur le VPS n8n (le Lot 1
n'était déjà qu'importé de mémoire — à réimporter avec le JSON à jour). Verrou anti-scan
concurrent au niveau du run entier (toujours best-effort, cf. §"Risques restants" du Lot 1).
Découverte automatique de site officiel toujours absente (fournisseur de recherche payant hors
périmètre).

## Correctif Monitoring IA Lot 1 (2026-07-13) — tokens/modèle jamais émis au callback

**Bug trouvé lors de l'audit de coûts (ADR monitoring IA, Lot 0)** : `v_workflow_cost_stats`
montrait `has_tokens_gap=true` pour ce workflow — `Prepare Callback` renvoyait un
`modelUsed` **codé en dur** (`'claude-sonnet-5'`, même quand aucun appel LLM n'avait eu lieu)
et n'émettait **jamais** `tokensInput`/`tokensOutput`, alors que `Parse & Validate LLM Output`
extrayait pourtant correctement `llmUsage: { inputTokens, outputTokens, model }` depuis la
réponse Claude. Le trou : `Reconcile & Prepare Writes` reconstruit un objet explicite (pas un
spread de `ctx`) et laissait tomber `llmUsage` en route.

**Corrigé** (2 nœuds) :
- `Reconcile & Prepare Writes` : ajout de `llmUsage: ctx.llmUsage || null` dans l'objet retourné.
- `Prepare Callback` : `modelProvider`/`modelUsed` dérivés de `recon.llmUsage` (plus jamais de
  valeur fantôme quand aucun LLM n'a été appelé — cas de l'entité juridique non résolue) ;
  `tokensInput`/`tokensOutput` ajoutés au `callbackBody`.

**Validation** : simulation Node des deux branches (entité résolue → LLM appelé, tokens/modèle
réels propagés jusqu'au callback ; entité non résolue/ambiguë → `llmUsage=null`,
`tokensInput`/`tokensOutput`/`modelUsed`/`modelProvider` tous `null` au lieu du `modelUsed`
fantôme précédent). `node --check` sur les 2 nœuds modifiés.

**À réimporter sur le VPS n8n avec les autres correctifs en attente** — sans ce réimport,
`v_workflow_cost_stats.has_tokens_gap` reste `true` pour ce workflow.

## ADR-0019 Lot 4 (2026-08-10) — 7 axes de classification dans le contrat

**Ce qui change** : le scan produit désormais, en plus des propositions de champs et de faits, un
bloc `classification` **atomique** portant les 7 axes du
`REFERENTIEL-CLASSIFICATION.md` (§5.2→5.8) : segment, régime d'achat, modèle économique,
trajectoire, tier, verticale client, statut relationnel.

**Pourquoi un bloc et non des `fieldProposals`** : le §10 du référentiel pose quatre contrôles
**bloquants inter-champs** (`sector_id` = parent du segment ; `regime_achat`+`modele_eco`+
`relation_type` renseignés ; note obligatoire si confiance ≠ haute). Une file de propositions
unitaires permettrait d'appliquer `segment_id` sans son macro et violerait le contrôle 2 par
construction. L'application passe donc par la RPC `apply_account_classification`
(migration 068), jamais par `enrichment_proposals`.

**5 nœuds modifiés** :
- `Validate & Route` : propage `requestClassification` + `classificationSegments`. La
  classification n'est demandée que si le référentiel accompagne la requête — sans la liste
  fermée des segments, le LLM devrait inventer un slug, ce que le §9 interdit.
- `Assemble Extraction Prompt` : règles de classification (§5.3→5.8 résumés en consignes
  opérationnelles) + `segments_disponibles` injectés dans les PREUVES.
- `Parse & Validate LLM Output` : valide le bloc et le **rejette avec un warning** plutôt que de
  faire échouer un scan par ailleurs valide — segment hors référentiel (§9), `moment` sans fait
  daté (§12.5), confiance « haute » avec un test en échec (§12.8), confiance non haute sans note
  (§10.4).
- `Reconcile & Prepare Writes` : ajout de `llmClassification` / `classificationWarnings` dans
  l'objet retourné. **Même piège que le correctif `llmUsage` du 2026-07-13 ci-dessus** : ce nœud
  reconstruit un objet explicite, pas un spread de `ctx` — tout champ non listé disparaît en
  silence et `Prepare Callback` publierait `classification: null` sans jamais lever d'erreur.
- `Prepare Callback` : expose `classification` dans le `contentJson` + qaFlag
  `classification_segment_in_referential`.

**Rétrocompatibilité** : un scan lancé sans `requestClassification` produit `classification: null`
et se comporte exactement comme avant. Les résultats déjà en base n'ont pas le champ — le front
teste sa présence avant lecture.

**Validation** : `node --check` sur les 17 nœuds Code ; harnais Node d'exécution réelle couvrant
la chaîne complète Validate → Assemble → Parse → Reconcile → Prepare Callback, les 4 cas de rejet
du référentiel, la propagation par Reconcile et le cross-check du `contentJson` produit contre les
16 clés du type `AccountScanClassification` (aucune clé manquante, aucune en trop).

**À réimporter sur le VPS n8n** — sans ce réimport, le bloc de classification n'apparaît jamais
dans l'UI de scan (le panneau ne s'affiche que si `classification` est présent).

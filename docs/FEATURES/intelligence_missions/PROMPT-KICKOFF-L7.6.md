Tu travailles sur Kredo. Lis d'abord `CLAUDE.md` à la racine du repo — il fait autorité sur la stack, les conventions et la méthode de travail attendue. Applique-le sans exception (lire avant d'écrire, annoncer puis exécuter, boucle de validation typecheck → test → check:server-boundary → lint → build).

## Contexte

Six missions d'intelligence tournent en production : `veille-analyse-mensuelle`, `rentabilite-portefeuille` (L6), `activation-portefeuille` (L7.1), `capacite-staffing` (L7.2), `revue-compte-client` (L7.4), `post-mortem-commercial` (L7.5, clos le 2026-08-24 — pilote validé en conditions réelles sur un trimestre réel, voir `docs/JOURNAL-SESSIONS.md` Session 52).

Tu démarres **L7.6 : mission `funnel-recrutement`** — dernier lot du catalogue initial de cinq missions (`08-CATALOGUE-CANDIDAT-5-MISSIONS.md`).

**Lis, dans cet ordre, avant d'écrire une seule ligne :**
1. `docs/FEATURES/intelligence_missions/09-ROADMAP-5-MISSIONS.md`, section 7 (L7.6) — le cadrage arrêté. **Un point y est corrigé ci-dessous, un défaut réel** — lis-le avant de suivre le §7 littéralement.
2. `src/lib/intelligence/actions/recruitment-margin-rules.ts` et `src/lib/intelligence/actions/analyze-funnel.ts` — le mécanisme déterministe **déjà existant** que le §7.5 de la roadmap propose (à tort) de remplacer. Lis sa limite documentée (`FUNNEL_STATIC_SNAPSHOT_CAVEAT`) : c'est exactement le trou que ta mission comble.
3. `src/components/intelligence/IntelligenceActionCard.tsx` (fonction `handleClick`, ligne ~185) — l'ordre de priorité entre action déterministe, mission et composeur de rédaction.

Ne relis pas `00` à `06`, `08` en entier : non nécessaires. Pas de handoff numéroté séparé — `09` §7, ce prompt et les fichiers sources suffisent, comme pour L7.1-L7.5.

## Ce que tu livres

Une mission qui répond, sur une fenêtre donnée : *où le funnel de recrutement perd des candidats, et quels délais entre étapes sont anormaux.* Elle lit `candidate_hiring_processes` et `candidate_hiring_milestones` avec leurs délais **pré-calculés côté provider** (jamais laissés au LLM), les candidats et leur profil recherché, et les présentations client associées.

Cette mission ne fait pas doublon avec l'existant : l'action `analyze_funnel` actuelle (`recruitment-margin-rules.ts`) produit un **instantané statique** — un décompte de candidats par étape (`HIRING_KANBAN_STAGES`) avec pourcentages, sans aucune notion de délai ni d'historique de transition. Son propre commentaire de tête le dit : `"Snapshot statique — le taux de conversion réel nécessite un historique des transitions (V2)."` Ta mission **est** ce V2 : elle lit `candidate_hiring_milestones` (jalons datés, pas seulement l'étape courante) pour calculer de vrais délais entre étapes et les cite avec leur source.

### Point de vigilance n°1 — le vrai défaut du cadrage, vérifié contre le code le 2026-08-24

Le `09` §7.5 propose de « rebrancher `analyze_funnel` (…), exactement le patron de L6.4 sur `analyze_margins` ». **C'est le même piège que `prioritize_pipeline` en L7.5, sous une forme différente.** Vérifié dans `IntelligenceActionCard.tsx` : l'ordre de priorité dans `handleClick` est `isMissionComposerAction` → `isDeterministicAction` → `communicationRequest`. Or `analyze_funnel` est déjà dans `DETERMINISTIC_INTELLIGENCE_ACTION_IDS` (`IntelligenceActionResultContent.tsx`, ligne ~37), rendu par `AnalyzeFunnelResult.tsx` à partir de `analyze-funnel.ts`/`recruitment-margin-rules.ts` — un vrai composant actif, pas un `coming_soon`. Le `case "analyze_funnel":` dans `resolveCommunicationConfig` (que le `09` §7.5 croit être le chemin actif) est en réalité **du code mort** : `isDeterministicAction` court-circuite avant de l'atteindre. La roadmap décrit un état antérieur au câblage déterministe actuel, pas l'état réel du code.

**Ne touche pas à `analyze_funnel`, à `analyze-funnel.ts`, à `recruitment-margin-rules.ts` ni à `AnalyzeFunnelResult.tsx`.** C'est une capacité active, distincte, complémentaire (instantané par étape vs délais historiques). Choisis un nouvel id d'action dédié (ex. `analyze_hiring_delays` ou équivalent — vérifie qu'il n'entre pas en collision avec un id existant dans `intelligence-registry.ts`, `DETERMINISTIC_INTELLIGENCE_ACTION_IDS` et `MISSION_COMPOSER_ACTION_CONFIGS`), `status: "coming_soon" → "active"` dans le registre sur la route `/recruitment` (aux côtés d'`analyze_funnel`, pas à sa place), câblé dans `MISSION_COMPOSER_ACTION_CONFIGS` — même patron que `post_mortem_pipeline`/`prioritize_accounts`/`forecast_availability` (mode Page, `RegistryPanelContent`). Puisque `isMissionComposerAction` est vérifié en premier dans `handleClick`, tu n'as besoin de retirer aucun `case` existant de `resolveCommunicationConfig` — ce n'est pertinent que pour un id qui n'a ni composeur de mission ni action déterministe.

Ajoute `IntelligenceActionCard.tsx` (ou son absence de modification, si tu confirmes qu'aucun changement n'y est nécessaire) à ta liste de fichiers vérifiés — ce n'était pas prévu par `09` §7.3.

## Travail à réaliser

### 1. Ouvrir le `CorpusKind`

Nouveau kind `"hiring_period"`, sélecteur `{ kind: "hiring_period"; periodStart: string; periodEnd: string }` — même forme que `veille_period`/`delivery_period`/`prospection_window`/`staffing_horizon`/`pipeline_period`.

Fichiers : `mission-contracts.ts` (`CorpusKind` + `CorpusSelector`), `mission-selectors.ts` (**les deux branches** : `parseCorpusSelector` et `corpusSelectorKey` — piège documenté depuis `07`/`09` §9, toujours vrai), `validate-mission-report.ts` (`CORPUS_KINDS`).

### 2. Le provider `hiring-period-provider.ts`

Poids **75**. Exécution `user_rls`.

Quatre sources :
- `candidate_hiring_processes` dont la fenêtre pertinente (`started_at` et/ou `closed_at`) recoupe `[periodStart, periodEnd]` — **filtre côté requête, pas en JS après une `LIMIT` non liée à la fenêtre**. C'est exactement le bug corrigé en L7.5 (Session 52) sur `pipeline-period-provider.ts` : si une colonne nullable nécessite un repli, utilise deux requêtes en parallèle (une par branche), chacune déjà bornée par la fenêtre avant sa propre `.limit()` — jamais une requête unique triée par une colonne sans rapport avec la fenêtre puis filtrée après coup.
- `candidate_hiring_milestones` liés (`hiring_process_id`), triés par date. **Calcule le délai entre chaque jalon et le précédent du même process côté provider** (soustraction de dates en JS/TS, pas de recalcul demandé au LLM) — même doctrine anti-recalcul que le corpus financier (`delivery_period`, `account_delivery`). Le premier jalon d'un process n'a pas de délai — l'omettre du champ plutôt que produire un delta absurde depuis `started_at` sans le documenter comme tel.
- `candidates` + `job_profiles` des process retenus (profil recherché, TJM attendu, practice) — référentiel, pas de doublon par candidat.
- `opportunity_candidates` liés aux mêmes candidats (présentation client et issue), si la donnée existe pour ce recoupement — sinon, ne force pas une jointure qui n'a pas de sens métier (un process de recrutement interne n'a pas forcément de présentation client).

Aucune colonne confidentielle connue ici (pas de rémunération individuelle dans ces tables) — vérifie quand même `candidates.expected_daily_rate` et les colonnes de `job_profiles` avant de conclure qu'il n'y a rien à exclure ; ce chiffre n'est pas une rémunération de collaborateur mais reste une donnée sensible de négociation, à ne pas exposer sans réflexion.

Enregistre dans `corpus-provider-registry.ts` (entrée + ligne de poids 75 dans le commentaire d'échelle, entre 80 `pipeline_period` et 70 `intelligence_document`).

### 3. Le preset

`mission-catalog.ts` : preset `funnel-recrutement`, `version: 1`, `corpus.requiredAtLaunch: ["hiring_period"]`.

**Seuil d'abstention explicite (`09` §7.4)**, à porter dans `constraints.rules` ET dans le `promptTemplate` : si moins de 5 process de recrutement recoupent la fenêtre analysée, le rapport doit le déclarer explicitement et limiter ses conclusions à ce que ce volume permet réellement d'affirmer — ne jamais généraliser sur un corpus trop mince en silence. Le chiffre « 34 process / 137 jalons / 6 étapes peuplées » cité par `09` §7.4 date du 2026-08-24 et n'est pas garanti stable : revérifie-le sur le dataset de test au moment du pilote plutôt que de le supposer.

### 4. Composeur et branchement cockpit

`mission-composer-model.ts` : nouvelle `MissionComposerConfig`, `inputKind: "month"` (comme `post-mortem-commercial` : le formulaire reste un sélecteur de mois ; si la fenêtre `hiring_period` doit couvrir plus qu'un mois calendaire, dérive-la dans `buildSelectors` comme `monthToPipelinePeriod`/`monthToStaffingHorizon` l'ont fait, ne réinvente pas un nouveau mécanisme).

Branchement cockpit : voir point de vigilance n°1 — nouvel id d'action, mode Page (`RegistryPanelContent`/`MISSION_COMPOSER_ACTION_CONFIGS`), route `/recruitment`, sans toucher à `analyze_funnel`.

### 5. Tests

`__tests__/hiring-period-provider.test.ts` sur `fake-supabase.ts` :
1. filtrage correct de la fenêtre **côté requête** (un process hors fenêtre n'apparaît jamais, même avec un historique total dépassant la borne de requête) ;
2. délai entre jalons consécutifs calculé et exact, premier jalon d'un process sans délai erroné ;
3. `ref.id` stables et cohérents entre les 4 sources ;
4. isolation workspace ;
5. saturation d'une borne dure → exclusion `provider_limit` tracée.

`mission-catalog.test.ts` : preset complet, seuil d'abstention (< 5 process) présent dans `constraints.rules` et dans le `promptTemplate`.

### 6. Le pilote

Revérifie d'abord en base le nombre réel de process de recrutement disponibles sur une fenêtre candidate (le chiffre de `09` §7.4 est daté). Si le dataset de test ne dépasse pas le seuil d'abstention sur aucune fenêtre raisonnable, lance quand même le pilote mais vérifie alors que le rapport applique correctement le seuil (critère de sortie n°3) plutôt que de chercher une fenêtre plus favorable.

**Critère de sortie du pilote (`09` §7.6, inchangé)** :
1. le rapport nomme l'étape où le funnel perd le plus de candidats ;
2. au moins un délai anormal est cité avec sa source (jalon → jalon) ;
3. si le seuil de §7.4 est franchi, le rapport le déclare au lieu de conclure quand même.

Une fois le pilote passé, **vérifie en base via le MCP Supabase** — pas seulement le statut `succeeded` de l'UI — que le run existe, que le document est créé et lié, et que le contenu respecte réellement les 3 critères, avant de consigner le run dans `docs/JOURNAL-SESSIONS.md` et de marquer L7.6 `(CLOS)` dans `09` §7. Deux lots récents (L7.4 puis L7.5) ont chacun eu un rapport de pilote annoncé comme validé sans l'avoir été — ne pas répéter.

## Ce que ce lot ne fait pas

- Ne touche pas à `analyze_funnel`, `analyze-funnel.ts`, `recruitment-margin-rules.ts` ni `AnalyzeFunnelResult.tsx` — capacité active et distincte.
- Aucune migration, aucun changement n8n, aucun réimport VPS.
- N'essaie pas de fusionner le nouvel id d'action avec `analyze_funnel` dans l'UI — deux entrées cockpit distinctes, l'instantané par étape et l'analyse de délais ne répondent pas à la même question.

## Boucle de validation, dans cet ordre, à chaque étape significative

```bash
npm run typecheck && npm test && npm run check:server-boundary && npm run lint && npm run build
```

`npm run test:n8n` n'est pas requis : aucun fichier de `n8n/workflows/` n'est touché.

Rapporte les résultats réels de chaque commande, échecs compris. Si `typecheck` échoue sur `parseCorpusSelector`/`corpusSelectorKey`, relis `09` §9 avant de contourner autrement qu'en ajoutant la branche manquante.

**Avant de committer** : vérifie `git status` pour des fichiers non liés à ce lot traînant dans l'arbre de travail (deux incidents distincts sur ce chantier — fichiers orphelins cassant `typecheck`, documentation modifiée avec des données fabriquées) — ne committe que ce que ce lot a réellement produit et vérifié.
